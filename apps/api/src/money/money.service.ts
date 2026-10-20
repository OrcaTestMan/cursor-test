import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import {
  dateCondition,
  resolveDateRange,
} from '../common/date-range.js'
import { pageParams, type Page } from '../common/pagination.js'
import { andTokens, searchTokens } from '../common/search-query.js'
import { DbService } from '../db/db.service.js'
import { moneyMoves, users } from '../db/schema.js'
import type {
  AdminAdjustDto,
  MoneyMoveListQueryDto,
  PointConvertDto,
} from './dto/money.dto.js'
import { MoneyRef, WalletService } from './wallet.service.js'

function refIdFromKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const n = Math.abs(h) % 2147483646
  return n === 0 ? 1 : n
}

@Injectable()
export class MoneyService {
  constructor(
    private readonly dbService: DbService,
    private readonly wallet: WalletService,
  ) {}

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

  /** 관리자 수동 지급/회수 — 사유·메모·멱등키 필수 */
  async adminAdjust(body: AdminAdjustDto) {
    if (!body.reason?.trim()) {
      throw new BadRequestException('사유가 필요합니다.')
    }
    if (!body.memo?.trim()) {
      throw new BadRequestException('처리 메모(처리자/근거)가 필요합니다.')
    }
    if (!body.idempotencyKey?.trim()) {
      throw new BadRequestException('멱등키(idempotencyKey)가 필요합니다.')
    }
    if (!Number.isInteger(body.amount) || body.amount === 0) {
      throw new BadRequestException('금액은 0이 아닌 정수여야 합니다.')
    }

    const scope = 'admin_adjust'
    const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
    if (cached) return cached.body

    const result = await this.wallet.withTx(async (tx) => {
      const applied = await this.wallet.applyMoney(tx, {
        userId: body.userId,
        amount: body.amount,
        reason: body.reason.trim().slice(0, 40),
        refType: MoneyRef.adminAdjust,
        refId: refIdFromKey(body.idempotencyKey!),
        memo: body.memo.trim(),
      })
      return {
        alreadyApplied: applied.alreadyApplied,
        balanceAfter: applied.balanceAfter,
        move: applied.move,
      }
    })

    await this.wallet.saveIdempotent(scope, body.idempotencyKey, 200, result)
    return result
  }

  /** 포인트 → 머니 전환 (포인트 차감 + 머니 원장) */
  async pointConvert(body: PointConvertDto) {
    const scope = 'point_convert'
    if (body.idempotencyKey) {
      const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
      if (cached) return cached.body
    }

    const result = await this.wallet.withTx(async (tx) => {
      const user = await this.wallet.lockUser(tx, body.userId)
      if (user.points < body.points) {
        throw new BadRequestException('포인트가 부족합니다.')
      }
      await tx
        .update(users)
        .set({
          points: user.points - body.points,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      const refId = body.idempotencyKey
        ? refIdFromKey(body.idempotencyKey)
        : body.userId * 100000 + body.points
      const applied = await this.wallet.applyMoney(tx, {
        userId: body.userId,
        amount: body.points,
        reason: '포인트전환',
        refType: MoneyRef.pointConvert,
        refId,
        memo: `${body.points}P→머니`,
      })
      return applied
    })

    if (body.idempotencyKey) {
      await this.wallet.saveIdempotent(scope, body.idempotencyKey, 200, result)
    }
    return result
  }
}
