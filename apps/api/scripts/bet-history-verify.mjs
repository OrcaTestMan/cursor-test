/**
 * 스포츠베팅 내역 화면 숫자 = SQL 직접 집계.
 * 기본 비교: login=parkdh (스포츠베팅 내역 검증 회원).
 */
import postgres from 'postgres'

const dbUrl =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(dbUrl)) {
  console.error('bet-history-verify refused remote DB')
  process.exit(2)
}

const login = String(process.env.BET_HISTORY_LOGIN || 'parkdh').trim()
const sql = postgres(dbUrl, { max: 1 })

const [screen] = await sql`
  SELECT
    count(*)::int AS count,
    coalesce(sum(b.stake), 0)::bigint AS total_stake,
    coalesce(sum(CASE
      WHEN b.status = '적중' THEN b.potential_payout
      WHEN b.status IN ('취소', '적특') THEN b.stake
      ELSE 0 END), 0)::bigint AS total_paid
  FROM nex_bets b
  JOIN nex_users u ON u.id = b.user_id
  WHERE u.login = ${login}
`
const [ledger] = await sql`
  SELECT
    coalesce(sum(CASE WHEN m.ref_type = 'bet_place' THEN -m.amount ELSE 0 END), 0)::bigint AS stake_from_ledger,
    coalesce(sum(CASE
      WHEN m.ref_type IN ('bet_win', 'bet_cancel', 'bet_push') THEN m.amount
      WHEN m.ref_type IN ('bet_win_reverse', 'bet_cancel_reverse') THEN m.amount
      ELSE 0 END), 0)::bigint AS paid_from_ledger
  FROM nex_money_moves m
  JOIN nex_bets b ON (
    (m.ref_type = 'bet_place' AND m.ref_id = b.id)
    OR (
      m.ref_type IN ('bet_win','bet_win_reverse','bet_cancel','bet_cancel_reverse','bet_push')
      AND m.ref_id IN (SELECT e.id FROM nex_bet_settlement_events e WHERE e.bet_id = b.id)
    )
  )
  JOIN nex_users u ON u.id = b.user_id
  WHERE u.login = ${login}
`

const count = Number(screen.count)
const totalStake = Number(screen.total_stake)
const totalPaid = Number(screen.total_paid)
const companyPnl = totalStake - totalPaid
const stakeLedger = Number(ledger.stake_from_ledger)
const paidLedger = Number(ledger.paid_from_ledger)

const mismatches = []
if (count < 6) mismatches.push({ label: 'count>=6', api: count, sql: 6 })
if (totalStake !== stakeLedger) {
  mismatches.push({ label: 'totalStake', api: totalStake, sql: stakeLedger })
}
if (totalPaid !== paidLedger) {
  mismatches.push({ label: 'totalPaid', api: totalPaid, sql: paidLedger })
}
if (login === 'parkdh' && totalStake !== 55000) {
  mismatches.push({ label: 'parkdh.totalStake', api: totalStake, sql: 55000 })
}
if (login === 'parkdh' && totalPaid !== 40000) {
  mismatches.push({ label: 'parkdh.totalPaid', api: totalPaid, sql: 40000 })
}
if (login === 'parkdh' && companyPnl !== 15000) {
  mismatches.push({ label: 'parkdh.companyPnl', api: companyPnl, sql: 15000 })
}

const result = {
  login,
  count,
  totalStake,
  totalPaid,
  companyPnl,
  stakeLedger,
  paidLedger,
  mismatches,
  ok: mismatches.length === 0,
}
console.log(JSON.stringify(result))
await sql.end({ timeout: 5 })
if (!result.ok) process.exit(1)
