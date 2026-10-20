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
import { cashRequests, users } from '../db/schema.js'
import { MoneyRef, WalletService } from '../money/wallet.service.js'
import {
  type CreateCashDto,
  type CashListQueryDto,
  type UpdateCashStatusDto,
} from './dto/cash.dto.js'

@Injectable()
export class CashService {
  constructor(
    private readonly dbService: DbService,
    private readonly wallet: WalletService,
  ) {}

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
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          request: cashRequests,
          login: users.login,
          nick: users.nick,
        })
        .from(cashRequests)
        .innerJoin(users, eq(cashRequests.userId, users.id))
        .where(where)
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

  /** 입금=대기만 / 출금=대기+홀드(차감) */
  async create(body: CreateCashDto) {
    const scope = 'cash_create'
    if (body.idempotencyKey) {
      const cached = await this.wallet.getIdempotent(scope, body.idempotencyKey)
      if (cached) return cached.body
    }

    const result = await this.wallet.withTx(async (tx) => {
      await this.wallet.lockUser(tx, body.userId)
      const publicId = `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
      const [created] = await tx
        .insert(cashRequests)
        .values({
          publicId,
          userId: body.userId,
          type: body.type,
          amount: body.amount,
          status: '대기',
          memo: (body.memo ?? '').trim(),
          idempotencyKey: body.idempotencyKey ?? null,
        })
        .returning()

      if (body.type === '출금') {
        await this.wallet.applyMoney(tx, {
          userId: body.userId,
          amount: -body.amount,
          reason: '출금홀드',
          refType: MoneyRef.cashWithdrawHold,
          refId: created.id,
          memo: (body.memo ?? '').trim(),
        })
      }
      return created
    })

    if (body.idempotencyKey) {
      await this.wallet.saveIdempotent(scope, body.idempotencyKey, 201, result)
    }
    return result
  }

  async updateStatus(id: number, body: UpdateCashStatusDto) {
    const scope = 'cash_status'
    const idemKey = body.idempotencyKey
    if (idemKey) {
      const cached = await this.wallet.getIdempotent(scope, idemKey)
      if (cached) return cached.body
    }

    const updated = await this.wallet.withTx(async (tx) => {
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

      if (body.status === '승인') {
        if (current.type === '입금') {
          await this.wallet.applyMoney(tx, {
            userId: current.userId,
            amount: current.amount,
            reason: '입금승인',
            refType: MoneyRef.cashDepositApprove,
            refId: current.id,
            memo: (body.memo ?? '').trim(),
          })
        } else {
          // 출금: 홀드가 있으면 확정만. 구데이터(홀드 없음)는 승인 시 차감.
          const held = await this.wallet.findMoveByRef(
            tx,
            MoneyRef.cashWithdrawHold,
            current.id,
          )
          if (!held) {
            await this.wallet.applyMoney(tx, {
              userId: current.userId,
              amount: -current.amount,
              reason: '출금승인',
              refType: MoneyRef.cashWithdrawHold,
              refId: current.id,
              memo: (body.memo ?? 'legacy approve debit').trim(),
            })
          }
        }
      } else if (body.status === '거절' || body.status === '지급 실패') {
        if (current.type === '출금') {
          const held = await this.wallet.findMoveByRef(
            tx,
            MoneyRef.cashWithdrawHold,
            current.id,
          )
          if (held) {
            await this.wallet.applyMoney(tx, {
              userId: current.userId,
              amount: current.amount,
              reason: '출금복원',
              refType: MoneyRef.cashWithdrawRestore,
              refId: current.id,
              memo: (body.memo ?? '').trim(),
            })
          }
        }
      }

      const [row] = await tx
        .update(cashRequests)
        .set({
          status: body.status,
          memo: body.memo !== undefined ? body.memo.trim() : current.memo,
          processedAt: new Date(),
        })
        .where(eq(cashRequests.id, id))
        .returning()
      return row
    })

    if (idemKey) {
      await this.wallet.saveIdempotent(scope, idemKey, 200, updated)
    }
    return updated
  }
}
