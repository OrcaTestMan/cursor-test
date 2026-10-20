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
import { cashRequests, moneyMoves, users } from '../db/schema.js'
import {
  type CashListQueryDto,
  type UpdateCashStatusDto,
} from './dto/cash.dto.js'

@Injectable()
export class CashService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db
  }

  async list(query: CashListQueryDto): Promise<
    Page<{
      request: typeof cashRequests.$inferSelect
      login: string
      nick: string
    }>
  > {
    const { page, pageSize, offset } = pageParams(query)
    const range = resolveDateRange(query)
    const filters: SQL[] = []
    const date = dateCondition(cashRequests.requestedAt, range)
    if (date) filters.push(date)
    if (query.type) filters.push(eq(cashRequests.type, query.type))
    if (query.status) filters.push(eq(cashRequests.status, query.status))
    for (const part of andTokens(searchTokens(query.q), (token) =>
      or(
        ilike(cashRequests.publicId, `%${token}%`),
        ilike(users.login, `%${token}%`),
        ilike(users.nick, `%${token}%`),
      ),
    )) {
      filters.push(part)
    }
    const where = filters.length ? and(...filters) : undefined
    const base = this.db
      .select({
        request: cashRequests,
        login: users.login,
        nick: users.nick,
      })
      .from(cashRequests)
      .innerJoin(users, eq(cashRequests.userId, users.id))
      .where(where)
    const [items, [{ value: total }]] = await Promise.all([
      base
        .orderBy(desc(cashRequests.id))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(cashRequests)
        .innerJoin(users, eq(cashRequests.userId, users.id))
        .where(where),
    ])
    return { items, total, page, pageSize }
  }

  async get(id: number) {
    const [row] = await this.db
      .select({
        request: cashRequests,
        login: users.login,
        nick: users.nick,
      })
      .from(cashRequests)
      .innerJoin(users, eq(cashRequests.userId, users.id))
      .where(eq(cashRequests.id, id))
    if (!row) throw new NotFoundException('입출금 신청을 찾을 수 없습니다.')
    return row
  }

  async updateStatus(id: number, body: UpdateCashStatusDto) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(cashRequests)
        .where(eq(cashRequests.id, id))
      if (!current) {
        throw new NotFoundException('입출금 신청을 찾을 수 없습니다.')
      }
      if (current.status !== '대기') {
        throw new BadRequestException('대기 상태만 변경할 수 있습니다.')
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, current.userId))
      if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.')

      let nextMoney = user.money
      if (body.status === '승인') {
        if (current.type === '입금') {
          nextMoney = user.money + current.amount
        } else {
          if (user.money < current.amount) {
            throw new BadRequestException('보유머니가 부족합니다.')
          }
          nextMoney = user.money - current.amount
        }
        await tx
          .update(users)
          .set({ money: nextMoney, updatedAt: new Date() })
          .where(eq(users.id, user.id))
        await tx.insert(moneyMoves).values({
          userId: user.id,
          amount: current.type === '입금' ? current.amount : -current.amount,
          balanceAfter: nextMoney,
          reason: current.type === '입금' ? '입금승인' : '출금승인',
          refType: 'cash',
          refId: current.id,
          memo: (body.memo ?? '').trim(),
        })
      }

      const [updated] = await tx
        .update(cashRequests)
        .set({
          status: body.status,
          memo: body.memo !== undefined ? body.memo.trim() : current.memo,
          processedAt: new Date(),
        })
        .where(eq(cashRequests.id, id))
        .returning()
      return updated
    })
  }
}
