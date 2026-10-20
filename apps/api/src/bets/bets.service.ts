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
import { bets, casinoBets, moneyMoves, users } from '../db/schema.js'
import {
  type BetListQueryDto,
  type CasinoBetListQueryDto,
  type UpdateBetStatusDto,
} from './dto/bet.dto.js'

@Injectable()
export class BetsService {
  constructor(private readonly dbService: DbService) {}

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

  async updateSportStatus(id: number, body: UpdateBetStatusDto) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(bets).where(eq(bets.id, id))
      if (!current) throw new NotFoundException('배팅을 찾을 수 없습니다.')
      if (current.status !== '진행 중') {
        throw new BadRequestException('진행 중 배팅만 정산할 수 있습니다.')
      }
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, current.userId))
      if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.')

      let nextMoney = user.money
      if (body.status === '적중') {
        nextMoney = user.money + current.potentialPayout
        await tx
          .update(users)
          .set({ money: nextMoney, updatedAt: new Date() })
          .where(eq(users.id, user.id))
        await tx.insert(moneyMoves).values({
          userId: user.id,
          amount: current.potentialPayout,
          balanceAfter: nextMoney,
          reason: '배팅적중',
          refType: 'bet',
          refId: current.id,
        })
      } else if (body.status === '취소') {
        nextMoney = user.money + current.stake
        await tx
          .update(users)
          .set({ money: nextMoney, updatedAt: new Date() })
          .where(eq(users.id, user.id))
        await tx.insert(moneyMoves).values({
          userId: user.id,
          amount: current.stake,
          balanceAfter: nextMoney,
          reason: '배팅취소',
          refType: 'bet',
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

  async updateCasinoStatus(id: number, body: UpdateBetStatusDto) {
    return this.db.transaction(async (tx) => {
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
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, current.userId))
      if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.')

      let nextMoney = user.money
      if (body.status === '적중') {
        const payout = current.payout > 0 ? current.payout : current.stake
        nextMoney = user.money + payout
        await tx
          .update(users)
          .set({ money: nextMoney, updatedAt: new Date() })
          .where(eq(users.id, user.id))
        await tx.insert(moneyMoves).values({
          userId: user.id,
          amount: payout,
          balanceAfter: nextMoney,
          reason: '카지노적중',
          refType: 'casino',
          refId: current.id,
        })
      } else if (body.status === '취소') {
        nextMoney = user.money + current.stake
        await tx
          .update(users)
          .set({ money: nextMoney, updatedAt: new Date() })
          .where(eq(users.id, user.id))
        await tx.insert(moneyMoves).values({
          userId: user.id,
          amount: current.stake,
          balanceAfter: nextMoney,
          reason: '카지노취소',
          refType: 'casino',
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
