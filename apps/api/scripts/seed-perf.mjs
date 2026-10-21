/**
 * seed:perf — seed:reset 과 분리. 대규모 삽입 벤치.
 * 기본은 축소 모드(PERF_FULL=1 이면 목표 규모 시도).
 */
import postgres from 'postgres'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:perf blocked in production')
  process.exit(2)
}

const url =
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(url)) throw new Error('refuse remote')
const sql = postgres(url, { max: 1 })
const full = process.env.PERF_FULL === '1'
const usersN = full ? 10_000 : 500
const betsN = full ? 1_000_000 : 5_000
const movesExtra = full ? 3_000_000 : 10_000

const t0 = Date.now()
const [u0] = await sql`select id from nex_users order by id limit 1`
if (!u0) {
  console.error('run seed:reset first')
  process.exit(1)
}

console.log('seed:perf start', { usersN, betsN, movesExtra, full })

// 추가 회원
for (let i = 0; i < usersN; i += 100) {
  const chunk = []
  for (let j = 0; j < 100 && i + j < usersN; j++) {
    const n = i + j
    chunk.push(
      sql`
      insert into nex_users (login, nick, password_hash, money, grade)
      values (${`perf_${n}`}, ${`perf${n}`}, '', 0, 'normal')
      on conflict do nothing
    `,
    )
  }
  await Promise.all(chunk)
}

const users = await sql`select id from nex_users where login like 'perf_%' limit ${Math.min(usersN, 2000)}`
const match = await sql`select id from nex_matches order by id limit 1`
if (!match.length) {
  console.error('no matches — seed:reset first')
  process.exit(1)
}

let placed = 0
while (placed < betsN) {
  const batch = Math.min(200, betsN - placed)
  const values = []
  for (let i = 0; i < batch; i++) {
    const uid = users[placed % users.length].id
    values.push(
      `(${uid}, 'perf match', 'PERF', '축구', '승패', '-', '일반', 1000, 1.9, 1900, '진행 중', false)`,
    )
    placed++
  }
  await sql.unsafe(
    `insert into nex_bets (user_id, match_name, league, sport, market, line, when_label, stake, odds, potential_payout, status, match_live) values ${values.join(',')}`,
  )
  if (placed % 2000 === 0) console.log('bets', placed)
}

// 원장 대량 (opening 스타일 아님 — perf 전용 ref)
let moved = 0
while (moved < movesExtra) {
  const batch = Math.min(500, movesExtra - moved)
  const vals = []
  for (let i = 0; i < batch; i++) {
    const uid = users[moved % users.length].id
    const ref = 10_000_000 + moved
    vals.push(`(${uid}, 0, 0, 'perf', 'perf_move', ${ref}, 'perf')`)
    moved++
  }
  try {
    await sql.unsafe(
      `insert into nex_money_moves (user_id, amount, balance_after, reason, ref_type, ref_id, memo) values ${vals.join(',')}`,
    )
  } catch (err) {
    console.warn('moves batch error', err.message)
    break
  }
  if (moved % 5000 === 0) console.log('moves', moved)
}

const ms = Date.now() - t0
console.log(JSON.stringify({ ok: true, ms, usersN, betsN, moved, full }, null, 2))
await sql.end()
