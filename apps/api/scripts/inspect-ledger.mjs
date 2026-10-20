import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex', {
  max: 1,
})

const users = await sql`select id, login, money from nex_users order by id`
const moves = await sql`
  select id, user_id, amount, reason, ref_type, ref_id, memo
  from nex_money_moves
  order by id
`
const mism = await sql.unsafe(`
SELECT u.id, u.login, u.money AS wallet,
       COALESCE(SUM(m.amount), 0) AS ledger_sum,
       (u.money - COALESCE(SUM(m.amount), 0)) AS diff
FROM nex_users u
LEFT JOIN nex_money_moves m ON m.user_id = u.id
GROUP BY u.id
HAVING u.money <> COALESCE(SUM(m.amount), 0)
ORDER BY u.id
`)

console.log(
  JSON.stringify(
    {
      users,
      movesCount: moves.length,
      moves,
      mismatchCount: mism.length,
      mism,
    },
    null,
    2,
  ),
)
await sql.end()
