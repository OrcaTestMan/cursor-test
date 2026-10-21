import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/** 운영은 백업 후 db:migrate 로만 적용한다. 개발·테스트만 기동 시 적용. */
export function shouldMigrateOnBoot(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
}

export async function migrateOnBoot() {
  if (!shouldMigrateOnBoot()) {
    return { skipped: true as const, reason: 'production' }
  }
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
  return { skipped: false as const, folder }
}
