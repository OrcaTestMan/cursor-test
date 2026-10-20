import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import {
  dateCondition,
  resolveDateRange,
} from '../common/date-range.js'
import { pageParams, type Page } from '../common/pagination.js'
import { andTokens, searchTokens } from '../common/search-query.js'
import { DbService } from '../db/db.service.js'
import { betSettlementEvents, bets, casinoBets, users } from '../db/schema.js'
import { MoneyRef, WalletService, type WalletTx } from '../money/wallet.service.js'
import {
  type BetListQueryDto,
  type CasinoBetListQueryDto,
  type PlaceBetDto,
  type PlaceCasinoBetDto,
  type UpdateBetStatusDto,
} from './dto/bet.dto.js'

@Injectable()
export class BetsService {
  constructor(
    private readonly dbService: DbService,
    private readonly wallet: WalletService,
  ) {}

  private get db() {
    return this.dbService.db
  }

  async listSports(query: BetListQueryDto): Promise<
    Page<{
      bet: typeof bets.$inferSelect
      login: string
      nick: string
    }>
  > {
    const { page, pageSize, offset } = pageParams(query)
    const range = resolveDateRange(query)
    const filters: SQL[] = []
    const date = dateCondition(bets.placedAt, range)
    if (date) filters.push(date)
    if (query.status) filters.push(eq(bets.status, query.status))
    if (query.whenLabel) filters.push(eq(bets.whenLabel, query.whenLabel))
    for (const part of andTokens(searchTokens(query.q), (token) =>
      or(
        ilike(bets.matchName, `%${token}%`),
        ilike(bets.league, `%${token}%`),
        ilike(users.login, `%${token}%`),
        ilike(users.nick, `%${token}%`),
      ),
    )) {
      filters.push(part)
    }
    const where = filters.length ? and(...filters) : undefined
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({ bet: bets, login: users.login, nick: users.nick })
        .from(bets)
        .innerJoin(users, eq(bets.userId, users.id))
        .where(where)
        .orderBy(desc(bets.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(bets)
        .innerJoin(users, eq(bets.userId, users.id))
        .where(where),
    ])
    return { items, total, page, pageSize }
  }

  async getSport(id: number) {
    const [row] = await this.db
      .select({ bet: bets, login: users.login, nick: users.nick })
      .from(bets)
      .innerJoin(users, eq(bets.userId, users.id))
      .where(eq(bets.id, id))
    if (!row) throw new NotFoundException('배팅을 찾을 수 없습니다.')
    return row
  }

  /** 스포츠 배팅 접수 → 스테이크 차감 + 원장 (멱등키 필수) */
  async placeSport(body: PlaceBetDto) {
    const scope = 'bet_place'
    if (!body.idempotencyKey?.trim()) {
      throw new BadRequestException('멱등키(idempotencyKey)가 필요합니다.')
    }
    const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
    if (cached) return cached.body

    const result = await this.wallet.withTx(async (tx) => {
      // 데드락 방지: 회원 행 잠금 → 배팅 INSERT → 원장 (출금과 동일 순서)
      await this.wallet.lockUser(tx, body.userId)
      const [bet] = await tx
        .insert(bets)
        .values({
          userId: body.userId,
          matchName: body.matchName,
          league: body.league ?? '',
          sport: body.sport ?? '',
          market: body.market ?? '승무패',
          line: body.line ?? '-',
          whenLabel: body.whenLabel ?? '일반',
          stake: body.stake,
          odds: String(body.odds),
          potentialPayout: body.potentialPayout,
          status: '진행 중',
          matchLive: body.whenLabel === '실시간',
        })
        .returning()
      await this.wallet.applyMoney(tx, {
        userId: body.userId,
        amount: -body.stake,
        reason: '배팅',
        refType: MoneyRef.betPlace,
        refId: bet.id,
      })
      return bet
    })
    await this.wallet.saveIdempotent(scope, body.idempotencyKey, 201, result)
    return result
  }

  /**
   * 정산·재정산.
   * 원장 ref_id 는 settlement_event.id (차수마다 신규) → (ref_type,ref_id) 유니크와 충돌 없음.
   */
  async updateSportStatus(id: number, body: UpdateBetStatusDto) {
    return this.wallet.withTx(async (tx) => {
      const [current] = await tx.select().from(bets).where(eq(bets.id, id))
      if (!current) throw new NotFoundException('배팅을 찾을 수 없습니다.')
      if (current.status === body.status) return current

      let moneyDelta = 0
      // 이전 정산의 머니 효과 되돌리기
      if (current.status === '적중') {
        moneyDelta += await this.applySettlementMoney(tx, {
          bet: current,
          amount: -current.potentialPayout,
          reason: '적중회수',
          refType: MoneyRef.betWinReverse,
          toStatus: body.status,
          memo: 'win reverse',
        })
      } else if (current.status === '취소') {
        moneyDelta += await this.applySettlementMoney(tx, {
          bet: current,
          amount: -current.stake,
          reason: '취소회수',
          refType: MoneyRef.betCancelReverse,
          toStatus: body.status,
          memo: 'cancel reverse',
        })
      }

      // 새 상태 적용
      if (body.status === '적중') {
        moneyDelta += await this.applySettlementMoney(tx, {
          bet: current,
          amount: current.potentialPayout,
          reason: '배팅적중',
          refType: MoneyRef.betWin,
          toStatus: body.status,
          memo: current.status === '진행 중' ? 'settle win' : 'resettle win',
        })
      } else if (body.status === '취소') {
        moneyDelta += await this.applySettlementMoney(tx, {
          bet: current,
          amount: current.stake,
          reason: '배팅취소',
          refType: MoneyRef.betCancel,
          toStatus: body.status,
          memo: current.status === '진행 중' ? 'settle void' : 'resettle void',
        })
      } else if (body.status === '미적중' && current.status === '진행 중') {
        // 낙첨: 머니 변동 없음, 이력만 (재정산 낙첨은 회수 이벤트만으로 충분)
        await this.recordSettlementEvent(tx, current, body.status, 0, 'settle lose')
      }

      const [fresh] = await tx.select().from(bets).where(eq(bets.id, id))
      const [updated] = await tx
        .update(bets)
        .set({
          status: body.status,
          settledAt: new Date(),
          settlementRevision: fresh?.settlementRevision ?? current.settlementRevision,
        })
        .where(eq(bets.id, id))
        .returning()
      void moneyDelta
      return updated
    })
  }

  private async recordSettlementEvent(
    tx: WalletTx,
    bet: typeof bets.$inferSelect,
    toStatus: string,
    moneyDelta: number,
    memo: string,
  ) {
    const revision = bet.settlementRevision + 1
    const [event] = await tx
      .insert(betSettlementEvents)
      .values({
        betId: bet.id,
        revision,
        fromStatus: bet.status,
        toStatus,
        moneyDelta,
        memo,
      })
      .returning()
    await tx
      .update(bets)
      .set({ settlementRevision: revision })
      .where(eq(bets.id, bet.id))
    bet.settlementRevision = revision
    return event
  }

  private async applySettlementMoney(
    tx: WalletTx,
    input: {
      bet: typeof bets.$inferSelect
      amount: number
      reason: string
      refType: string
      toStatus: string
      memo: string
    },
  ) {
    const event = await this.recordSettlementEvent(
      tx,
      input.bet,
      input.toStatus,
      input.amount,
      input.memo,
    )
    await this.wallet.applyMoney(tx, {
      userId: input.bet.userId,
      amount: input.amount,
      reason: input.reason,
      refType: input.refType,
      refId: event.id,
      memo: `bet#${input.bet.id} rev${event.revision}`,
    })
    return input.amount
  }

  async listCasino(query: CasinoBetListQueryDto): Promise<
    Page<{
      bet: typeof casinoBets.$inferSelect
      login: string
      nick: string
    }>
  > {
    const { page, pageSize, offset } = pageParams(query)
    const range = resolveDateRange(query)
    const filters: SQL[] = []
    const date = dateCondition(casinoBets.placedAt, range)
    if (date) filters.push(date)
    if (query.status) filters.push(eq(casinoBets.status, query.status))
    if (query.kind) filters.push(eq(casinoBets.kind, query.kind))
    for (const part of andTokens(searchTokens(query.q), (token) =>
      or(
        ilike(casinoBets.name, `%${token}%`),
        ilike(users.login, `%${token}%`),
        ilike(users.nick, `%${token}%`),
      ),
    )) {
      filters.push(part)
    }
    const where = filters.length ? and(...filters) : undefined
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({ bet: casinoBets, login: users.login, nick: users.nick })
        .from(casinoBets)
        .innerJoin(users, eq(casinoBets.userId, users.id))
        .where(where)
        .orderBy(desc(casinoBets.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(casinoBets)
        .innerJoin(users, eq(casinoBets.userId, users.id))
        .where(where),
    ])
    return { items, total, page, pageSize }
  }

  async getCasino(id: number) {
    const [row] = await this.db
      .select({ bet: casinoBets, login: users.login, nick: users.nick })
      .from(casinoBets)
      .innerJoin(users, eq(casinoBets.userId, users.id))
      .where(eq(casinoBets.id, id))
    if (!row) throw new NotFoundException('카지노 배팅을 찾을 수 없습니다.')
    return row
  }

  async placeCasino(body: PlaceCasinoBetDto) {
    const scope = 'casino_place'
    if (body.idempotencyKey) {
      const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
      if (cached) return cached.body
    }
    const result = await this.wallet.withTx(async (tx) => {
      await this.wallet.lockUser(tx, body.userId)
      const [bet] = await tx
        .insert(casinoBets)
        .values({
          userId: body.userId,
          name: body.name,
          kind: body.kind ?? 'other',
          stake: body.stake,
          payout: 0,
          status: '진행 중',
        })
        .returning()
      await this.wallet.applyMoney(tx, {
        userId: body.userId,
        amount: -body.stake,
        reason: '카지노배팅',
        refType: MoneyRef.casinoPlace,
        refId: bet.id,
      })
      return bet
    })
    if (body.idempotencyKey) {
      await this.wallet.saveIdempotent(scope, body.idempotencyKey, 201, result)
    }
    return result
  }

  async updateCasinoStatus(id: number, body: UpdateBetStatusDto) {
    return this.wallet.withTx(async (tx) => {
      const [current] = await tx
        .select()
        .from(casinoBets)
        .where(eq(casinoBets.id, id))
      if (!current) {
        throw new NotFoundException('카지노 배팅을 찾을 수 없습니다.')
      }
      if (current.status !== '진행 중') {
        throw new BadRequestException('진행 중 배팅만 정산할 수 있습니다.')
      }

      if (body.status === '적중') {
        const payout = current.payout > 0 ? current.payout : current.stake
        await this.wallet.applyMoney(tx, {
          userId: current.userId,
          amount: payout,
          reason: '카지노적중',
          refType: MoneyRef.casinoWin,
          refId: current.id,
        })
      } else if (body.status === '취소') {
        await this.wallet.applyMoney(tx, {
          userId: current.userId,
          amount: current.stake,
          reason: '카지노취소',
          refType: MoneyRef.casinoCancel,
          refId: current.id,
        })
      }

      const [updated] = await tx
        .update(casinoBets)
        .set({ status: body.status, settledAt: new Date() })
        .where(eq(casinoBets.id, id))
        .returning()
      return updated
    })
  }
}
