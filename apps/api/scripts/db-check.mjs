import postgres from 'postgres'

const url = process.env.DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
console.log('url', url)
const sql = postgres(url, { max: 1 })
const db = await sql`select current_database() as db, inet_server_addr() as addr, inet_server_port() as port`
const tables = await sql`
  select tablename from pg_tables
  where schemaname='public' and tablename like 'nex_%'
  order by 1
`
const settle = await sql`select to_regclass('public.nex_bet_settlement_events') as reg`
const check = await sql`select conname from pg_constraint where conname='nex_users_money_nonneg'`
console.log(JSON.stringify({ db, settle, check, tables }, null, 2))
await sql.end()
