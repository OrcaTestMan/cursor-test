/**
 * 임대 서버 Postgres에 NEX(nex_*) 스키마를 심고 구 커뮤니티 테이블을 제거한다.
 * 기본: postgresql://app:app@211.110.16.130:5432/app
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const host = process.env.SERVER_PG_HOST || '211.110.16.130'

const appUrl =
  process.env.SERVER_DATABASE_URL ||
  `postgresql://app:app@${host}:5432/app`

async function tryCreateNex(sql) {
  const isSuper = await sql`select rolsuper from pg_roles where rolname = current_user`
  if (!isSuper[0]?.rolsuper) {
    console.log('current user is not superuser; use app database')
    return null
  }
  await sql.unsafe(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nex') THEN
      CREATE ROLE nex LOGIN PASSWORD 'nex';
    END IF;
  END $$;`)
  const dbs = await sql`select 1 from pg_database where datname = 'nex'`
  if (dbs.length === 0) {
    await sql.unsafe(`CREATE DATABASE nex OWNER nex`)
    console.log('created database nex')
  }
  return `postgresql://nex:nex@${host}:5432/nex`
}

async function dropLegacy(db) {
  const tables = await db`
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not like 'nex_%'
  `
  for (const row of tables) {
    await db.unsafe(`DROP TABLE IF EXISTS public."${row.tablename}" CASCADE`)
    console.log('dropped table', row.tablename)
  }
  const enums = await db`
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e' and t.typname not like 'nex_%'
  `
  for (const row of enums) {
    await db.unsafe(`DROP TYPE IF EXISTS public."${row.typname}" CASCADE`)
    console.log('dropped type', row.typname)
  }
}

async function main() {
  console.log('probe', appUrl.replace(/:[^:@]+@/, ':***@'))
  const probe = postgres(appUrl, { max: 1, connect_timeout: 15 })
  let targetUrl = appUrl
  try {
    const created = await tryCreateNex(probe)
    if (created) targetUrl = created
  } catch (e) {
    console.log('create nex skipped:', String(e.message).split('\n')[0])
  }
  await probe.end({ timeout: 2 })

  // app DB에 남은 레거시도 정리
  if (targetUrl.includes('/nex')) {
    const appDb = postgres(appUrl, { max: 1, connect_timeout: 15 })
    await dropLegacy(appDb)
    await appDb.end({ timeout: 2 })
  }

  const db = postgres(targetUrl, { max: 1, connect_timeout: 15 })
  await dropLegacy(db)
  await db.end({ timeout: 2 })

  console.log('migrate →', targetUrl.replace(/:[^:@]+@/, ':***@'))
  const mig = spawnSync(
    'yarn',
    ['workspace', 'api', 'db:migrate'],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: targetUrl },
      encoding: 'utf8',
      shell: true,
    },
  )
  process.stdout.write(mig.stdout || '')
  process.stderr.write(mig.stderr || '')
  if (mig.status !== 0) process.exit(mig.status || 1)

  console.log('seed →', targetUrl.replace(/:[^:@]+@/, ':***@'))
  const seed = spawnSync(
    'yarn',
    ['workspace', 'api', 'db:seed'],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: targetUrl },
      encoding: 'utf8',
      shell: true,
    },
  )
  process.stdout.write(seed.stdout || '')
  process.stderr.write(seed.stderr || '')
  if (seed.status !== 0) process.exit(seed.status || 1)

  const check = postgres(targetUrl, { max: 1, connect_timeout: 15 })
  const tables = await check`
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'nex_%'
    order by 1
  `
  const users = await check`select count(*)::int as n from nex_users`
  console.log(
    'nex tables:',
    tables.map((t) => t.tablename).join(', '),
  )
  console.log('nex_users count:', users[0].n)
  await check.end({ timeout: 2 })
  console.log('server NEX DB ready')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
