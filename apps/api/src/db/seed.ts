import { count } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  if (/211\.110\.16\.130/.test(url)) {
    throw new Error('seed refused remote DB')
  }
  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })

  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(schema.users)
  await client.end()
  if (userCount > 0) {
    console.log('nex seed skip: users already exist')
    return
  }
  console.log('nex seed skip: run ALLOW_SEED_RESET=1 yarn workspace api seed:reset')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
