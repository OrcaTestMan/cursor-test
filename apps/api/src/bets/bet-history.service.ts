import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js'
import { DbService } from '../db/db.service.js'
import {
  betLegs,
  betSettlementEvents,
  bets,
  moneyMoves,
  users,
} from '../db/schema.js'
import type { BetHistoryQueryDto } from './dto/bet-history.dto.js'
import {
  decodeCursor,
  encodeCursor,
  folderLabel,
  ledgerKind,
  liveLabel,
  paidAmount,
  parseStatusFilter,
  statusLabel,
} from './bet-history.util.js'

const LIST_SELECT = {
  id: bets.id,
  placedAt: bets.placedAt,
  login: users.login,
  nick: users.nick,
  matchName: bets.matchName,
  market: bets.market,
  line: bets.line,
  odds: bets.odds,
  stake: bets.stake,
  potentialPayout: bets.potentialPayout,
  status: bets.status,
  folderKind: bets.folderKind,
  matchLive: bets.matchLive,
  whenLabel: bets.whenLabel,
  sport: bets.sport,
  league: bets.league,
}

@Injectable()
export class BetHistoryService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db
  }

  private filters(query: BetHistoryQueryDto) {
    const range = resolveDateRange(query)
    const parts: SQL[] = []
    const date = dateCondition(bets.placedAt, range)
    if (date) parts.push(date)
    const status = parseStatusFilter(query.status)
    if (query.status && !status) {
      throw new BadRequestException('배팅 상태가 올바르지 않습니다.')
    }
    if (status) parts.push(eq(bets.status, status))
    if (query.login?.trim()) parts.push(eq(users.login, query.login.trim()))
    if (query.sport?.trim()) parts.push(eq(bets.sport, query.sport.trim()))
    if (query.league?.trim()) parts.push(eq(bets.league, query.league.trim()))
    const folder =
      query.folder === '다폴더' || query.folder === 'multi'
        ? 'multi'
        : query.folder === '단폴더' || query.folder === 'single'
          ? 'single'
          : undefined
    if (folder) parts.push(eq(bets.folderKind, folder))
    const live =
      query.live === '라이브' || query.live === 'live'
        ? true
        : query.live === '일반' || query.live === 'prematch'
          ? false
          : undefined
    if (live === true) parts.push(eq(bets.matchLive, true))
    if (live === false) parts.push(eq(bets.matchLive, false))
    if (query.stakeMin != null) parts.push(gte(bets.stake, query.stakeMin))
    if (query.stakeMax != null) parts.push(lte(bets.stake, query.stakeMax))
    if (
      query.stakeMin != null &&
      query.stakeMax != null &&
      query.stakeMin > query.stakeMax
    ) {
      throw new BadRequestException('금액 범위가 올바르지 않습니다.')
    }
    return { range, where: parts.length ? and(...parts) : undefined }
  }

  private mapRow(
    row: {
      id: number
      placedAt: Date
      login: string
      nick: string
      matchName: string
      market: string
      line: string
      odds: string
      stake: number
      potentialPayout: number
      status: string
      folderKind: string
      matchLive: boolean
      whenLabel: string
      sport: string
      league: string
    },
    legs: Array<{
      id: number
      matchName: string
      marketName: string
      outcomeName: string
      oddsAtBet: string
      line: string
      sport: string
      league: string
      live: boolean
      status: string
    }>,
  ) {
    const paid = paidAmount(row.status, row.stake, row.potentialPayout)
    return {
      id: row.id,
      placedAt: row.placedAt.toISOString(),
      login: row.login,
      nick: row.nick,
      matchName: row.matchName,
      market: row.market,
      line: row.line,
      outcome: legs.length === 1 ? legs[0].outcomeName : '',
      odds: Number(row.odds),
      stake: row.stake,
      potentialPayout: row.potentialPayout,
      paidAmount: paid,
      status: row.status,
      statusLabel: statusLabel(row.status),
      folderKind: row.folderKind,
      folderLabel: folderLabel(row.folderKind, legs.length),
      live: row.matchLive,
      liveLabel: liveLabel(row.matchLive, row.whenLabel),
      sport: row.sport,
      league: row.league,
      expandable: row.folderKind === 'multi' || legs.length >= 2,
      legs: legs.map((leg) => ({
        id: leg.id,
        matchName: leg.matchName,
        marketName: leg.marketName,
        outcomeName: leg.outcomeName,
        odds: Number(leg.oddsAtBet),
        line: leg.line,
        sport: leg.sport,
        league: leg.league,
        live: leg.live,
        status: leg.status,
        statusLabel: statusLabel(leg.status),
      })),
    }
  }

  async summary(query: BetHistoryQueryDto) {
    const { range, where } = this.filters(query)
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        totalStake: sql<number>`coalesce(sum(${bets.stake}), 0)::bigint`,
        totalPaid: sql<number>`coalesce(sum(case
          when ${bets.status} = '적중' then ${bets.potentialPayout}
          when ${bets.status} in ('취소', '적특') then ${bets.stake}
          else 0 end), 0)::bigint`,
      })
      .from(bets)
      .innerJoin(users, eq(bets.userId, users.id))
      .where(where)
    const count = Number(row?.count || 0)
    const totalStake = Number(row?.totalStake || 0)
    const totalPaid = Number(row?.totalPaid || 0)
    return {
      ...rangeMeta(range),
      count,
      totalStake,
      totalPaid,
      companyPnl: totalStake - totalPaid,
    }
  }

  async list(query: BetHistoryQueryDto) {
    const { range, where } = this.filters(query)
    const limit = query.limit ?? 20
    const cursor = decodeCursor(query.cursor)
    if (query.cursor && !cursor) {
      throw new BadRequestException('커서가 올바르지 않습니다.')
    }
    const cursorWhere = cursor
      ? or(
          lt(bets.placedAt, cursor.placedAt),
          and(eq(bets.placedAt, cursor.placedAt), lt(bets.id, cursor.id)),
        )
      : undefined
    const combined = and(where, cursorWhere)
    const rows = await this.db
      .select(LIST_SELECT)
      .from(bets)
      .innerJoin(users, eq(bets.userId, users.id))
      .where(combined)
      .orderBy(desc(bets.placedAt), desc(bets.id))
      .limit(limit + 1)
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const ids = page.map((row) => row.id)
    const legs = ids.length
      ? await this.db
          .select({
            id: betLegs.id,
            betId: betLegs.betId,
            matchName: betLegs.matchName,
            marketName: betLegs.marketName,
            outcomeName: betLegs.outcomeName,
            oddsAtBet: betLegs.oddsAtBet,
            line: betLegs.line,
            sport: betLegs.sport,
            league: betLegs.league,
            live: betLegs.live,
            status: betLegs.status,
          })
          .from(betLegs)
          .where(inArray(betLegs.betId, ids))
          .orderBy(asc(betLegs.id))
      : []
    const byBet = new Map<number, typeof legs>()
    for (const leg of legs) {
      const list = byBet.get(leg.betId) || []
      list.push(leg)
      byBet.set(leg.betId, list)
    }
    const items = page.map((row) => this.mapRow(row, byBet.get(row.id) || []))
    const last = page[page.length - 1]
    return {
      ...rangeMeta(range),
      items,
      nextCursor: hasMore && last ? encodeCursor(last.placedAt, last.id) : null,
    }
  }

  async get(id: number) {
    const [row] = await this.db
      .select(LIST_SELECT)
      .from(bets)
      .innerJoin(users, eq(bets.userId, users.id))
      .where(eq(bets.id, id))
    if (!row) throw new NotFoundException('배팅을 찾을 수 없습니다.')
    const legs = await this.db
      .select({
        id: betLegs.id,
        betId: betLegs.betId,
        matchName: betLegs.matchName,
        marketName: betLegs.marketName,
        outcomeName: betLegs.outcomeName,
        oddsAtBet: betLegs.oddsAtBet,
        line: betLegs.line,
        sport: betLegs.sport,
        league: betLegs.league,
        live: betLegs.live,
        status: betLegs.status,
      })
      .from(betLegs)
      .where(eq(betLegs.betId, id))
      .orderBy(asc(betLegs.id))
    const events = await this.db
      .select({ id: betSettlementEvents.id })
      .from(betSettlementEvents)
      .where(eq(betSettlementEvents.betId, id))
    const eventIds = events.map((item) => item.id)
    const settleFilter =
      eventIds.length > 0
        ? and(
            inArray(moneyMoves.refType, [
              'bet_win',
              'bet_win_reverse',
              'bet_cancel',
              'bet_cancel_reverse',
              'bet_push',
            ]),
            inArray(moneyMoves.refId, eventIds),
          )
        : sql`false`
    const moves = await this.db
      .select({
        id: moneyMoves.id,
        amount: moneyMoves.amount,
        balanceAfter: moneyMoves.balanceAfter,
        reason: moneyMoves.reason,
        refType: moneyMoves.refType,
        refId: moneyMoves.refId,
        memo: moneyMoves.memo,
        createdAt: moneyMoves.createdAt,
      })
      .from(moneyMoves)
      .where(
        or(
          and(eq(moneyMoves.refType, 'bet_place'), eq(moneyMoves.refId, id)),
          settleFilter,
        ),
      )
      .orderBy(asc(moneyMoves.createdAt), asc(moneyMoves.id))
    return {
      ...this.mapRow(row, legs),
      ledger: moves.map((move) => ({
        id: move.id,
        kind: ledgerKind(move.refType, move.amount),
        amount: move.amount,
        balanceAfter: move.balanceAfter,
        reason: move.reason,
        refType: move.refType,
        createdAt: move.createdAt.toISOString(),
      })),
    }
  }

  async csv(query: BetHistoryQueryDto) {
    const more: Awaited<ReturnType<BetHistoryService['list']>>['items'] = []
    let next: string | undefined
    let guard = 0
    do {
      const page = await this.list({
        ...query,
        cursor: next,
        limit: 100,
      })
      more.push(...page.items)
      next = page.nextCursor || undefined
      guard += 1
    } while (next && guard < 50 && more.length < 5000)
    const header = [
      'id',
      'placedAt',
      'login',
      'nick',
      'match',
      'market',
      'line',
      'odds',
      'stake',
      'potentialPayout',
      'paidAmount',
      'status',
      'folder',
      'live',
      'sport',
      'league',
    ]
    const lines = [
      header.join(','),
      ...more.map((row) =>
        [
          row.id,
          row.placedAt,
          csvCell(row.login),
          csvCell(row.nick),
          csvCell(row.matchName),
          csvCell(row.market),
          csvCell(row.line),
          row.odds,
          row.stake,
          row.potentialPayout,
          row.paidAmount,
          csvCell(row.statusLabel),
          csvCell(row.folderLabel),
          csvCell(row.liveLabel),
          csvCell(row.sport),
          csvCell(row.league),
        ].join(','),
      ),
    ]
    return `\uFEFF${lines.join('\n')}\n`
  }
}

function csvCell(value: string) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}
