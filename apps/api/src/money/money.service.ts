import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import {
  dateCondition,
  resolveDateRange,
} from '../common/date-range.js'
import { pageParams, type Page } from '../common/pagination.js'
import { andTokens, searchTokens } from '../common/search-query.js'
import { DbService } from '../db/db.service.js'
import { moneyMoves, users } from '../db/schema.js'
import type { MoneyMoveListQueryDto } from './dto/money.dto.js'

@Injectable()
export class MoneyService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db
  }

  async listMoves(query: MoneyMoveListQueryDto): Promise<
    Page<{
      move: typeof moneyMoves.$inferSelect
      login: string
      nick: string
    }>
  > {
    const { page, pageSize, offset } = pageParams(query)
    const range = resolveDateRange(query)
    const filters: SQL[] = []
    const date = dateCondition(moneyMoves.createdAt, range)
    if (date) filters.push(date)
    if (query.userId) filters.push(eq(moneyMoves.userId, query.userId))
    for (const part of andTokens(searchTokens(query.q), (token) =>
      or(
        ilike(moneyMoves.reason, `%${token}%`),
        ilike(users.login, `%${token}%`),
        ilike(users.nick, `%${token}%`),
      ),
    )) {
      filters.push(part)
    }
    const where = filters.length ? and(...filters) : undefined
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          move: moneyMoves,
          login: users.login,
          nick: users.nick,
        })
        .from(moneyMoves)
        .innerJoin(users, eq(moneyMoves.userId, users.id))
        .where(where)
        .orderBy(desc(moneyMoves.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(moneyMoves)
        .innerJoin(users, eq(moneyMoves.userId, users.id))
        .where(where),
    ])
    return { items, total, page, pageSize }
  }

  async getMove(id: number) {
    const [row] = await this.db
      .select({
        move: moneyMoves,
        login: users.login,
        nick: users.nick,
      })
      .from(moneyMoves)
      .innerJoin(users, eq(moneyMoves.userId, users.id))
      .where(eq(moneyMoves.id, id))
    if (!row) throw new NotFoundException('머니 내역을 찾을 수 없습니다.')
    return row
  }
}
