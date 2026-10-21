import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import { DbService } from '../db/db.service.js'
import {
  auditLogs,
  betLegs,
  bets,
  markets,
  matches,
  outcomes,
  riskAlerts,
  riskExposure,
  riskSettings,
  users,
} from '../db/schema.js'
import { maskAccount, maskIp } from '../common/sensitive.js'
import { WalletService, type WalletTx } from '../money/wallet.service.js'

@Injectable()
export class RiskService {
  constructor(
    private readonly dbService: DbService,
    private readonly wallet: WalletService,
  ) {}

  private get db() {
    return this.dbService.db
  }

  async summary() {
    const [settings] = await this.db.select().from(riskSettings).limit(1)
    const lossLimit = settings?.lossLimit ?? 5_000_000
    const rows = await this.db.select().from(riskExposure)
    let maxRisk = 0
    let openStake = 0
    for (const r of rows) {
      openStake += r.stakeSum
      const loss = r.payoutSum - r.stakeSum
      if (loss > maxRisk) maxRisk = loss
    }
    const [{ value: openBets }] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(bets)
      .where(eq(bets.status, '진행 중'))
    const [{ value: alertCount }] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(riskAlerts)
      .where(eq(riskAlerts.acked, false))
    const [{ value: liveMatches }] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(matches)
      .where(eq(matches.live, true))
    const [zones] = await this.db.execute(sql`
      SELECT
        count(*) FILTER (WHERE match_live AND status = '진행 중')::int AS live_count,
        coalesce(sum(stake) FILTER (WHERE match_live AND status = '진행 중'), 0)::bigint AS live_stake,
        count(*) FILTER (WHERE NOT match_live AND status = '진행 중')::int AS prematch_count,
        coalesce(sum(stake) FILTER (WHERE NOT match_live AND status = '진행 중'), 0)::bigint AS prematch_stake
      FROM nex_bets
    `)
    const [casino] = await this.db.execute(sql`
      SELECT
        count(*) FILTER (WHERE kind = 'live' AND status = '진행 중')::int AS live_count,
        coalesce(sum(stake) FILTER (WHERE kind = 'live' AND status = '진행 중'), 0)::bigint AS live_stake,
        count(*) FILTER (WHERE kind = 'slot' AND status = '진행 중')::int AS slot_count,
        coalesce(sum(stake) FILTER (WHERE kind = 'slot' AND status = '진행 중'), 0)::bigint AS slot_stake
      FROM nex_casino_bets
    `)
    const zoneRow = (zones || {}) as Record<string, unknown>
    const casinoRow = (casino || {}) as Record<string, unknown>
    return {
      maxRisk,
      openStake,
      openBets: Number(openBets),
      unackedAlerts: Number(alertCount),
      liveMatches: Number(liveMatches),
      liveBets: {
        count: Number(zoneRow.live_count || 0),
        stake: Number(zoneRow.live_stake || 0),
      },
      prematchBets: {
        count: Number(zoneRow.prematch_count || 0),
        stake: Number(zoneRow.prematch_stake || 0),
      },
      casinoLive: {
        count: Number(casinoRow.live_count || 0),
        stake: Number(casinoRow.live_stake || 0),
      },
      casinoSlot: {
        count: Number(casinoRow.slot_count || 0),
        stake: Number(casinoRow.slot_stake || 0),
      },
      lossLimit,
      limitUsagePct: lossLimit > 0 ? Math.round((maxRisk / lossLimit) * 1000) / 10 : 0,
    }
  }

  async listMatches(query: {
    cursor?: string
    limit?: number
    sport?: string
    status?: string
  }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)
    const cursorId = query.cursor ? Number(query.cursor) : null
    const filters = []
    if (query.sport) filters.push(eq(matches.sport, query.sport))
    if (query.status) filters.push(eq(matches.status, query.status))
    if (cursorId) filters.push(gt(matches.id, cursorId))
    const where = filters.length ? and(...filters) : undefined

    const items = await this.db
      .select()
      .from(matches)
      .where(where)
      .orderBy(asc(matches.id))
      .limit(limit)

    const scored = []
    for (const m of items) {
      const exp = await this.db
        .select()
        .from(riskExposure)
        .where(eq(riskExposure.matchId, m.id))
      let stake = 0
      let maxLoss = 0
      let betCount = 0
      for (const e of exp) {
        stake += e.stakeSum
        betCount += e.betCount
        const loss = e.payoutSum - e.stakeSum
        if (loss > maxLoss) maxLoss = loss
      }
      const weights = await this.weights()
      const [settings] = await this.db.select().from(riskSettings).limit(1)
      const lossLimit = settings?.lossLimit ?? 5_000_000
      const limitPct = lossLimit > 0 ? maxLoss / lossLimit : 0
      const imminent =
        m.startsAt.getTime() - Date.now() < 30 * 60_000 && !m.live ? 1 : 0
      const score =
        limitPct * weights.limit +
        (stake > 100000 ? 1 : stake / 100000) * weights.skew +
        imminent * weights.imminent
      scored.push({
        ...m,
        stake,
        maxLoss,
        betCount,
        riskScore: Math.round(score * 10) / 10,
      })
    }
    scored.sort((a, b) => b.riskScore - a.riskScore)
    const nextCursor =
      items.length === limit ? String(items[items.length - 1].id) : null
    return { items: scored, nextCursor, limit }
  }

  async getMatch(id: number) {
    const [m] = await this.db.select().from(matches).where(eq(matches.id, id))
    if (!m) throw new NotFoundException('경기를 찾을 수 없습니다.')
    const mk = await this.db.select().from(markets).where(eq(markets.matchId, id))
    const exp = await this.db
      .select({
        exposure: riskExposure,
        outcomeName: outcomes.name,
        marketName: markets.name,
      })
      .from(riskExposure)
      .innerJoin(outcomes, eq(riskExposure.outcomeId, outcomes.id))
      .innerJoin(markets, eq(riskExposure.marketId, markets.id))
      .where(eq(riskExposure.matchId, id))
    const legs = await this.db
      .select({
        bet: bets,
        login: users.login,
        leg: betLegs,
      })
      .from(betLegs)
      .innerJoin(bets, eq(betLegs.betId, bets.id))
      .innerJoin(users, eq(bets.userId, users.id))
      .where(eq(betLegs.matchId, id))
      .orderBy(desc(bets.id))
      .limit(50)
    return { match: m, markets: mk, outcomes: exp, bets: legs }
  }

  async listMembers(query: { cursor?: string; limit?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)
    const cursorId = query.cursor ? Number(query.cursor) : null
    const rows = await this.db.execute(sql`
      SELECT
        u.id, u.login, u.nick, u.grade, u.money,
        u.last_ip, u.last_device, u.withdraw_account, u.status,
        COALESCE(s.cnt, 0)::int AS sport_count,
        COALESCE(s.stake, 0)::bigint AS sport_stake,
        COALESCE(s.risk, 0)::bigint AS sport_risk,
        COALESCE(c.cnt, 0)::int AS casino_count,
        COALESCE(c.stake, 0)::bigint AS casino_stake,
        COALESCE(c.risk, 0)::bigint AS casino_risk
      FROM nex_users u
      LEFT JOIN (
        SELECT user_id,
          count(*)::int AS cnt,
          coalesce(sum(stake), 0)::bigint AS stake,
          coalesce(sum(GREATEST(potential_payout - stake, 0)), 0)::bigint AS risk
        FROM nex_bets
        WHERE status = '진행 중'
        GROUP BY user_id
      ) s ON s.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
          count(*)::int AS cnt,
          coalesce(sum(stake), 0)::bigint AS stake,
          coalesce(sum(GREATEST(payout - stake, 0)), 0)::bigint AS risk
        FROM nex_casino_bets
        WHERE status = '진행 중'
        GROUP BY user_id
      ) c ON c.user_id = u.id
      WHERE u.role = 'member'
        AND (${cursorId}::int IS NULL OR u.id > ${cursorId})
      ORDER BY u.id
      LIMIT ${limit}
    `)
    const items = [...rows].map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: Number(r.id),
        login: String(r.login),
        nick: String(r.nick),
        grade: String(r.grade || 'normal'),
        money: Number(r.money || 0),
        lastIp: maskIp(String(r.last_ip || '')),
        lastDevice: String(r.last_device || ''),
        withdrawAccount: maskAccount(String(r.withdraw_account || '')),
        status: String(r.status || 'active'),
        sportCount: Number(r.sport_count || 0),
        sportStake: Number(r.sport_stake || 0),
        sportRisk: Number(r.sport_risk || 0),
        casinoCount: Number(r.casino_count || 0),
        casinoStake: Number(r.casino_stake || 0),
        casinoRisk: Number(r.casino_risk || 0),
      }
    })
    const nextCursor =
      items.length === limit ? String(items[items.length - 1].id) : null
    return { items, nextCursor, limit }
  }

  async listAlerts() {
    return this.db
      .select()
      .from(riskAlerts)
      .orderBy(desc(riskAlerts.id))
      .limit(100)
  }

  async ackAlert(id: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('사유가 필요합니다.')
    const [row] = await this.db
      .update(riskAlerts)
      .set({ acked: true })
      .where(eq(riskAlerts.id, id))
      .returning()
    if (!row) throw new NotFoundException('알림 없음')
    await this.db.insert(auditLogs).values({
      actor: 'admin',
      targetType: 'alert',
      targetId: String(id),
      action: 'ack',
      reason: reason.trim(),
    })
    return row
  }

  async action(body: {
    action: string
    targetType: string
    targetId: number
    reason: string
    value?: number
  }) {
    if (!body.reason?.trim()) {
      throw new BadRequestException('사유가 필요합니다.')
    }
    return this.wallet.withTx(async (tx) => {
      if (body.action === 'suspend_market' || body.action === 'resume_market') {
        const suspended = body.action === 'suspend_market'
        const [mk] = await tx
          .update(markets)
          .set({ suspended })
          .where(eq(markets.id, body.targetId))
          .returning()
        if (!mk) throw new NotFoundException('마켓 없음')
      } else if (body.action === 'set_loss_limit' && body.value != null) {
        await tx.update(riskSettings).set({
          lossLimit: body.value,
          updatedAt: new Date(),
        })
      } else if (body.action === 'set_user_grade' && body.value != null) {
        // value unused — grade in reason payload alternate: use memo field via reason parse
        throw new BadRequestException('set_user_grade는 grade 문자열 API를 사용하세요.')
      } else {
        throw new BadRequestException('지원하지 않는 조치')
      }
      await tx.insert(auditLogs).values({
        actor: 'admin',
        targetType: body.targetType,
        targetId: String(body.targetId),
        action: body.action,
        reason: body.reason.trim(),
      })
      return { ok: true }
    })
  }

  async setUserGrade(userId: number, grade: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('사유가 필요합니다.')
    const [u] = await this.db
      .update(users)
      .set({ grade, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    if (!u) throw new NotFoundException('회원 없음')
    await this.db.insert(auditLogs).values({
      actor: 'admin',
      targetType: 'user',
      targetId: String(userId),
      action: 'set_grade',
      reason: reason.trim(),
    })
    return u
  }

  async getSettings() {
    const [row] = await this.db.select().from(riskSettings).limit(1)
    if (!row) {
      const [created] = await this.db.insert(riskSettings).values({}).returning()
      return created
    }
    return row
  }

  async putSettings(body: {
    lossLimit?: number
    weights?: string
    alertThresholds?: string
    reason: string
  }) {
    if (!body.reason?.trim()) throw new BadRequestException('사유가 필요합니다.')
    const current = await this.getSettings()
    const [row] = await this.db
      .update(riskSettings)
      .set({
        lossLimit: body.lossLimit ?? current.lossLimit,
        weights: body.weights ?? current.weights,
        alertThresholds: body.alertThresholds ?? current.alertThresholds,
        updatedAt: new Date(),
      })
      .where(eq(riskSettings.id, current.id))
      .returning()
    await this.db.insert(auditLogs).values({
      actor: 'admin',
      targetType: 'risk_settings',
      targetId: String(current.id),
      action: 'update',
      reason: body.reason.trim(),
    })
    return row
  }

  private async weights() {
    const [s] = await this.db.select().from(riskSettings).limit(1)
    try {
      return JSON.parse(
        s?.weights ||
          '{"limit":35,"skew":20,"imminent":15,"oddsDrop":10,"sharp":10,"multi":10}',
      ) as Record<string, number>
    } catch {
      return { limit: 35, skew: 20, imminent: 15, oddsDrop: 10, sharp: 10, multi: 10 }
    }
  }

  /** 배팅 등록 시 노출 증분 */
  async bumpExposure(
    tx: WalletTx,
    input: {
      matchId: number
      marketId: number
      outcomeId: number
      stake: number
      payout: number
      dir?: number
    },
  ) {
    const dir = input.dir ?? 1
    await tx.execute(sql`
      insert into nex_risk_exposure (match_id, market_id, outcome_id, stake_sum, payout_sum, bet_count)
      values (${input.matchId}, ${input.marketId}, ${input.outcomeId}, ${dir * input.stake}, ${dir * input.payout}, ${dir})
      on conflict (match_id, market_id, outcome_id) do update set
        stake_sum = nex_risk_exposure.stake_sum + ${dir * input.stake},
        payout_sum = nex_risk_exposure.payout_sum + ${dir * input.payout},
        bet_count = nex_risk_exposure.bet_count + ${dir},
        updated_at = now()
    `)
  }

  async assertMarketOpen(marketId: number) {
    const [mk] = await this.db.select().from(markets).where(eq(markets.id, marketId))
    if (!mk) throw new NotFoundException('마켓 없음')
    if (mk.suspended) {
      throw new BadRequestException('정지된 마켓에는 배팅할 수 없습니다.')
    }
  }
}
