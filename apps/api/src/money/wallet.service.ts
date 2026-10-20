import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql, sum } from 'drizzle-orm'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { DbService } from '../db/db.service.js'
import * as schema from '../db/schema.js'
import { cashRequests, idempotencyKeys, moneyMoves, users } from '../db/schema.js'

export type WalletTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export type ApplyMoneyInput = {
  userId: number
  /** +적립 / -차감 */
  amount: number
  reason: string
  refType: string
  refId: number
  memo?: string
  /** false면 잔액 부족 시 예외 (기본 true: 음수 금지) */
  requireNonNegative?: boolean
}

export type ApplyMoneyResult = {
  alreadyApplied: boolean
  balanceAfter: number
  move: typeof moneyMoves.$inferSelect | null
}

/** 원장 ref_type 상수 — (ref_type, ref_id) 유니크 */
export const MoneyRef = {
  cashDepositApprove: 'cash_deposit_approve',
  cashWithdrawHold: 'cash_withdraw_hold',
  cashWithdrawRestore: 'cash_withdraw_restore',
  betPlace: 'bet_place',
  betWin: 'bet_win',
  betCancel: 'bet_cancel',
  casinoPlace: 'casino_place',
  casinoWin: 'casino_win',
  casinoCancel: 'casino_cancel',
  adminAdjust: 'admin_adjust',
  pointConvert: 'point_convert',
  balanceFix: 'balance_fix',
  opening: 'opening',
} as const

@Injectable()
export class WalletService {
  constructor(private readonly dbService: DbService) {}

  get db() {
    return this.dbService.db
  }

  async withTx<T>(fn: (tx: WalletTx) => Promise<T>): Promise<T> {
    return this.db.transaction(fn)
  }

  /** 회원 지갑 행 잠금 */
  async lockUser(tx: WalletTx, userId: number) {
    await tx.execute(
      sql`SELECT id FROM nex_users WHERE id = ${userId} FOR UPDATE`,
    )
    const [user] = await tx.select().from(users).where(eq(users.id, userId))
    if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.')
    return user
  }

  /**
   * 잔액 변경 + 원장 기록 (같은 TX).
   * (ref_type, ref_id) 중복 시 alreadyApplied=true 로 멱등 처리.
   */
  async applyMoney(
    tx: WalletTx,
    input: ApplyMoneyInput,
  ): Promise<ApplyMoneyResult> {
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      throw new BadRequestException('금액은 0이 아닌 정수(원)여야 합니다.')
    }
    if (!input.refType || input.refId == null) {
      throw new BadRequestException('원장 원본(refType, refId)이 필요합니다.')
    }

    const user = await this.lockUser(tx, input.userId)
    const next = user.money + input.amount
    const requireNonNegative = input.requireNonNegative !== false
    if (requireNonNegative && next < 0) {
      throw new BadRequestException('보유머니가 부족합니다.')
    }

    try {
      const [move] = await tx
        .insert(moneyMoves)
        .values({
          userId: user.id,
          amount: input.amount,
          balanceAfter: next,
          reason: input.reason,
          refType: input.refType,
          refId: input.refId,
          memo: (input.memo ?? '').trim(),
        })
        .returning()

      await tx
        .update(users)
        .set({ money: next, updatedAt: new Date() })
        .where(eq(users.id, user.id))

      return { alreadyApplied: false, balanceAfter: next, move }
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505') {
        const [existing] = await tx
          .select()
          .from(moneyMoves)
          .where(
            and(
              eq(moneyMoves.refType, input.refType),
              eq(moneyMoves.refId, input.refId),
            ),
          )
        return {
          alreadyApplied: true,
          balanceAfter: existing?.balanceAfter ?? user.money,
          move: existing ?? null,
        }
      }
      throw err
    }
  }

  async findMoveByRef(tx: WalletTx, refType: string, refId: number) {
    const [row] = await tx
      .select()
      .from(moneyMoves)
      .where(and(eq(moneyMoves.refType, refType), eq(moneyMoves.refId, refId)))
    return row ?? null
  }

  /** 멱등키: 있으면 저장 응답 반환, 없으면 null */
  async getIdempotent(scope: string, key: string) {
    const [row] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)))
    if (!row) return null
    return {
      statusCode: row.statusCode,
      body: JSON.parse(row.responseBody) as unknown,
    }
  }

  async saveIdempotent(
    scope: string,
    key: string,
    statusCode: number,
    body: unknown,
  ) {
    try {
      await this.db.insert(idempotencyKeys).values({
        scope,
        key,
        statusCode,
        responseBody: JSON.stringify(body),
      })
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') return
      throw err
    }
  }

  /** 회원 잔액 = 원장 합계 검증 */
  async verifyBalances() {
    const rows = await this.db.execute(sql`
      SELECT u.id, u.login, u.money AS wallet,
             COALESCE(SUM(m.amount), 0)::bigint AS ledger_sum,
             (u.money - COALESCE(SUM(m.amount), 0))::bigint AS diff
      FROM nex_users u
      LEFT JOIN nex_money_moves m ON m.user_id = u.id
      GROUP BY u.id
      HAVING u.money <> COALESCE(SUM(m.amount), 0)
      ORDER BY u.id
    `)
    return {
      mismatchCount: rows.length,
      mismatches: rows,
      query: `SELECT u.id, u.login, u.money AS wallet,
  COALESCE(SUM(m.amount), 0) AS ledger_sum,
  (u.money - COALESCE(SUM(m.amount), 0)) AS diff
FROM nex_users u
LEFT JOIN nex_money_moves m ON m.user_id = u.id
GROUP BY u.id
HAVING u.money <> COALESCE(SUM(m.amount), 0)
ORDER BY u.id;`,
    }
  }

  /**
   * 백필: 승인 입금 원장 누락 + 잔액 갭 보정.
   * 잔액 컬럼은 바꾸지 않고 원장만 맞춰 검증 0건이 되게 한다.
   */
  async backfillLedgers() {
    const inserted: Array<Record<string, unknown>> = []

    await this.withTx(async (tx) => {
      const approvedDeposits = await tx
        .select()
        .from(cashRequests)
        .where(
          and(eq(cashRequests.type, '입금'), eq(cashRequests.status, '승인')),
        )

      for (const cash of approvedDeposits) {
        const existing = await this.findMoveByRef(
          tx,
          MoneyRef.cashDepositApprove,
          cash.id,
        )
        if (existing) continue

        const user = await this.lockUser(tx, cash.userId)
        // 잔액 컬럼은 이미 반영된 상태 → 원장만 추가하되 balance_after는 당시 추정 불가하므로
        // 갭 보정 단계에서 최종 정합. 여기서는 입금 이벤트를 원장에 남긴다.
        // 잔액을 건드리지 않으려면 amount만 넣고 balance_after는 user.money 임시.
        // 대신 아래 갭 보정으로 한 번에 맞춘다 → 입금 백필은 이벤트 기록용.
        try {
          const [move] = await tx
            .insert(moneyMoves)
            .values({
              userId: cash.userId,
              amount: cash.amount,
              balanceAfter: user.money,
              reason: '입금승인',
              refType: MoneyRef.cashDepositApprove,
              refId: cash.id,
              memo: `backfill cash#${cash.id}`,
            })
            .returning()
          inserted.push({
            kind: 'cash_deposit_approve',
            cashId: cash.id,
            loginHint: cash.userId,
            amount: cash.amount,
            moveId: move.id,
          })
        } catch (err) {
          if ((err as { code?: string })?.code !== '23505') throw err
        }
      }

      // 갭 보정: wallet - sum(ledger) 를 balance_fix 로 기록 (잔액 컬럼 불변)
      const usersRows = await tx.select().from(users)
      for (const user of usersRows) {
        await this.lockUser(tx, user.id)
        const [agg] = await tx
          .select({ total: sum(moneyMoves.amount) })
          .from(moneyMoves)
          .where(eq(moneyMoves.userId, user.id))
        const ledgerSum = Number(agg?.total ?? 0)
        const diff = user.money - ledgerSum
        if (diff === 0) continue
        const [move] = await tx
          .insert(moneyMoves)
          .values({
            userId: user.id,
            amount: diff,
            balanceAfter: user.money,
            reason: diff > 0 ? '기초/보정' : '보정차감',
            refType: MoneyRef.balanceFix,
            refId: user.id,
            memo: 'backfill gap to match wallet column',
          })
          .returning()
        inserted.push({
          kind: 'balance_fix',
          userId: user.id,
          login: user.login,
          amount: diff,
          moveId: move.id,
        })
      }
    })

    return { inserted, verify: await this.verifyBalances() }
  }
}
