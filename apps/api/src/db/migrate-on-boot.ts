import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/** API 기동 시 drizzle 마이그레이션을 적용한다. 서버 PC auto-pull 후 재시작에도 안전하다. */
export async function migrateOnBoot() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '../../drizzle'),
    path.resolve(process.cwd(), 'drizzle'),
    path.resolve(process.cwd(), 'apps/api/drizzle'),
  ]
  const folder = candidates.find((p) => existsSync(p))
  if (!folder) {
    throw new Error(`drizzle migrations folder not found (tried ${candidates.join(', ')})`)
  }

  const client = postgres(url, { max: 1 })
  try {
    await migrate(drizzle(client), { migrationsFolder: folder })
  } finally {
    await client.end({ timeout: 5 })
  }
}
