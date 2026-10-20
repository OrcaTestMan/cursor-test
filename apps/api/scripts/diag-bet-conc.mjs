import postgres from 'postgres'

const BASE = 'http://localhost:3000/api'
const sql = postgres(
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex',
  { max: 1 },
)

const login = 'night_probe_bet'
let rows = await sql`select id from nex_users where login = ${login}`
let id = rows[0]?.id
if (!id) {
  const ins = await sql`
    insert into nex_users (login, nick, password_hash, money)
    values (${login}, ${login}, '', 10000) returning id`
  id = ins[0].id
}
await sql`delete from nex_bet_settlement_events where bet_id in (select id from nex_bets where user_id = ${id})`
await sql`delete from nex_bets where user_id = ${id}`
await sql`delete from nex_money_moves where user_id = ${id}`
await sql`update nex_users set money = 10000 where id = ${id}`
await sql`
  insert into nex_money_moves (user_id, amount, balance_after, reason, ref_type, ref_id, memo)
  values (${id}, 10000, 10000, '기초/보정', 'balance_fix', ${id}, 'diag')
`

const results = await Promise.all(
  Array.from({ length: 50 }, (_, i) =>
    fetch(`${BASE}/bets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: id,
        matchName: 'Diag',
        stake: 1000,
        odds: 1.9,
        potentialPayout: 1900,
        idempotencyKey: `diag-${Date.now()}-${i}`,
      }),
    }).then(async (res) => ({
      status: res.status,
      body: await res.text(),
    })),
  ),
)

const byStatus = {}
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1
}
const samples = {}
for (const r of results) {
  if (!samples[r.status]) samples[r.status] = r.body.slice(0, 300)
}
const money = await sql`select money from nex_users where id = ${id}`
console.log(JSON.stringify({ byStatus, samples, money: money[0].money }, null, 2))
await sql.end()
