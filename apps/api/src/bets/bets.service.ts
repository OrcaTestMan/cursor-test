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
import { bets, casinoBets, users } from '../db/schema.js'
import { MoneyRef, WalletService } from '../money/wallet.service.js'
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

  /** 스포츠 배팅 접수 → 스테이크 차감 + 원장 */
  async placeSport(body: PlaceBetDto) {
    const scope = 'bet_place'
    if (body.idempotencyKey) {
      const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
      if (cached) return cached.body
    }
    const result = await this.wallet.withTx(async (tx) => {
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
    if (body.idempotencyKey) {
      await this.wallet.saveIdempotent(scope, body.idempotencyKey, 201, result)
    }
    return result
  }

  async updateSportStatus(id: number, body: UpdateBetStatusDto) {
    return this.wallet.withTx(async (tx) => {
      const [current] = await tx.select().from(bets).where(eq(bets.id, id))
      if (!current) throw new NotFoundException('배팅을 찾을 수 없습니다.')
      if (current.status !== '진행 중') {
        throw new BadRequestException('진행 중 배팅만 정산할 수 있습니다.')
      }

      if (body.status === '적중') {
        await this.wallet.applyMoney(tx, {
          userId: current.userId,
          amount: current.potentialPayout,
          reason: '배팅적중',
          refType: MoneyRef.betWin,
          refId: current.id,
        })
      } else if (body.status === '취소') {
        // 적특·취소 → 스테이크 환불
        await this.wallet.applyMoney(tx, {
          userId: current.userId,
          amount: current.stake,
          reason: '배팅취소',
          refType: MoneyRef.betCancel,
          refId: current.id,
        })
      }

      const [updated] = await tx
        .update(bets)
        .set({ status: body.status, settledAt: new Date() })
        .where(eq(bets.id, id))
        .returning()
      return updated
    })
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
