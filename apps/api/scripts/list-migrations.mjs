import postgres from 'postgres'
const sql = postgres(
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex',
  { max: 1 },
)
const rows = await sql`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`
console.log(rows)
await sql.end()
