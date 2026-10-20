import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import {
  dateCondition,
  resolveDateRange,
} from '../common/date-range.js'
import { pageParams, type Page } from '../common/pagination.js'
import { andTokens, searchTokens } from '../common/search-query.js'
import { DbService } from '../db/db.service.js'
import { users } from '../db/schema.js'
import {
  type UpdateUserStatusDto,
  type UserListQueryDto,
} from './dto/user.dto.js'

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db
  }

  async list(query: UserListQueryDto): Promise<Page<typeof users.$inferSelect>> {
    const { page, pageSize, offset } = pageParams(query)
    // 회원 목록은 기간 미지정 시 전체 (오늘만이면 시드·기존 회원이 빠짐)
    const range = resolveDateRange({ ...query, range: query.range ?? 'all' })
    const filters: SQL[] = []
    const date = dateCondition(users.createdAt, range)
    if (date) filters.push(date)
    if (query.status) filters.push(eq(users.status, query.status))
    for (const part of andTokens(searchTokens(query.q), (token) =>
      or(
        ilike(users.login, `%${token}%`),
        ilike(users.nick, `%${token}%`),
      ),
    )) {
      filters.push(part)
    }
    const where = filters.length ? and(...filters) : undefined
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.id))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(users).where(where),
    ])
    return { items, total, page, pageSize }
  }

  async get(id: number) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id))
    if (!row) throw new NotFoundException('회원을 찾을 수 없습니다.')
    return row
  }

  async updateStatus(id: number, body: UpdateUserStatusDto) {
    await this.get(id)
    const [row] = await this.db
      .update(users)
      .set({
        status: body.status,
        blockReason:
          body.status === 'blocked' ? (body.blockReason ?? '').trim() : '',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return row
  }
}
