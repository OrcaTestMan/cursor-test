import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = postgres(process.env.DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex', {
  max: 1,
})

const q = fs.readFileSync(path.join(root, 'scripts/money-verify.sql'), 'utf8')
const rows = await sql.unsafe(q)
const backfill = await sql`
  select id, user_id, amount, reason, ref_type, ref_id, memo
  from nex_money_moves
  where memo like ${'backfill%'}
  order by id
`
const deposit50k = await sql`
  select id, user_id, amount, reason, ref_type, ref_id, memo
  from nex_money_moves
  where ref_type = 'cash_deposit_approve' and amount = 50000
  order by id
`

console.log(
  JSON.stringify(
    {
      mismatchCount: rows.length,
      rows,
      backfill,
      deposit50k,
    },
    null,
    2,
  ),
)
await sql.end()
