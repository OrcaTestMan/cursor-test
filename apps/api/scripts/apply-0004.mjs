import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const url =
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(url)) throw new Error('refuse remote')
const sql = postgres(url, { max: 1 })
const file = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../drizzle/0004_risk_seed_schema.sql'),
  'utf8',
)
for (const part of file.split(/--> statement-breakpoint\s*/)) {
  const stmt = part.trim()
  if (!stmt) continue
  await sql.unsafe(stmt)
}
console.log('0004 applied')
await sql.end()
