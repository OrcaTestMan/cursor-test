import postgres from 'postgres'

const sql = postgres(
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex',
  { max: 1 },
)
const users = await sql`select id from nex_users where login like 'perf_%' limit 2000`
if (!users.length) throw new Error('no perf users')
const t0 = Date.now()
let moved = 0
const target = 1_000_000
while (moved < target) {
  const batch = Math.min(500, target - moved)
  const vals = []
  for (let i = 0; i < batch; i++) {
    const uid = users[moved % users.length].id
    const ref = 20_000_000 + moved
    vals.push(`(${uid}, 0, 0, 'perf', 'perf_move', ${ref}, 'perf3m')`)
    moved++
  }
  await sql.unsafe(
    `insert into nex_money_moves (user_id, amount, balance_after, reason, ref_type, ref_id, memo) values ${vals.join(',')}`,
  )
  if (moved % 100000 === 0) console.log('moves', moved)
}
const c = await sql`select count(*)::int as c from nex_money_moves`
console.log(JSON.stringify({ ok: true, extraMs: Date.now() - t0, moved, totalMoves: c[0].c }))
await sql.end()
