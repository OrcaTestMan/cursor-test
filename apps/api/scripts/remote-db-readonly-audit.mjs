/**
 * 원격 DB 사고 조사 — SELECT 전용. DDL/DML 절대 금지.
 * ALLOW_REMOTE_DB=1 필요.
 */
import postgres from 'postgres'

const url = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL
if (!url || !/211\.110\.16\.130/.test(url)) {
  console.error('REMOTE_DATABASE_URL must point to 211.110.16.130')
  process.exit(2)
}
if (process.env.ALLOW_REMOTE_DB !== '1') {
  console.error('Set ALLOW_REMOTE_DB=1 for explicit read-only audit')
  process.exit(2)
}

const sql = postgres(url, { max: 1, idle_timeout: 5 })

const out = {}

out.connection = await sql`
  select current_database() as db,
         current_user as db_user,
         inet_server_addr()::text as addr,
         inet_server_port() as port,
         current_setting('server_version') as version
`

out.tables = await sql`
  select tablename
  from pg_tables
  where schemaname = 'public' and tablename like 'nex_%'
  order by tablename
`

out.nightishTables = await sql`
  select to_regclass('public.nex_bet_settlement_events') as bet_settlement_events,
         to_regclass('public.nex_matches') as matches,
         to_regclass('public.nex_markets') as markets,
         to_regclass('public.nex_outcomes') as outcomes,
         to_regclass('public.nex_bet_legs') as bet_legs,
         to_regclass('public.nex_risk_exposure') as risk_exposure,
         to_regclass('public.nex_risk_settings') as risk_settings,
         to_regclass('public.nex_risk_alerts') as risk_alerts,
         to_regclass('public.nex_audit_logs') as audit_logs,
         to_regclass('public.nex_idempotency_keys') as idempotency_keys
`

out.userColumns = await sql`
  select column_name, data_type, column_default
  from information_schema.columns
  where table_schema='public' and table_name='nex_users'
  order by ordinal_position
`

out.betColumns = await sql`
  select column_name, data_type, column_default
  from information_schema.columns
  where table_schema='public' and table_name='nex_bets'
    and column_name in ('settlement_revision')
`

out.constraints = await sql`
  select conname, contype, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.nex_users'::regclass
     or conrelid = 'public.nex_bet_settlement_events'::regclass
     or conrelid = 'public.nex_money_moves'::regclass
  order by conname
`

out.indexesExtra = await sql`
  select indexname, indexdef
  from pg_indexes
  where schemaname='public'
    and indexname in (
      'nex_users_money_nonneg',
      'nex_bet_settle_bet_idx',
      'nex_bet_settle_bet_rev_uidx',
      'nex_money_moves_ref_uidx',
      'nex_risk_exposure_uidx',
      'nex_cash_idempotency_uidx'
    )
  order by indexname
`

// drizzle migrations
try {
  out.drizzleMigrations = await sql`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by created_at
  `
} catch (err) {
  out.drizzleMigrationsError = String(err.message || err)
}

out.users = await sql`
  select id, login, nick, money, status, created_at
  from nex_users
  order by id
`

out.probeUsers = await sql`
  select id, login, money, created_at
  from nex_users
  where login like 'night_probe_%' or login like 'perf_%'
  order by login
`

const probeIds = out.probeUsers.map((u) => u.id)
if (probeIds.length) {
  out.probeCounts = await sql`
    select
      (select count(*)::int from nex_money_moves where user_id = any(${probeIds})) as money_moves,
      (select count(*)::int from nex_cash_requests where user_id = any(${probeIds})) as cash,
      (select count(*)::int from nex_bets where user_id = any(${probeIds})) as bets,
      (select count(*)::int from nex_casino_bets where user_id = any(${probeIds})) as casino
  `
} else {
  out.probeCounts = [{ money_moves: 0, cash: 0, bets: 0, casino: 0 }]
}

out.seedSix = await sql`
  select login, money, status, nick
  from nex_users
  where login in ('admin','test','test123','user03','user04','user05')
  order by login
`

out.counts = await sql`
  select
    (select count(*)::int from nex_users) as users,
    (select count(*)::int from nex_money_moves) as money_moves,
    (select count(*)::int from nex_cash_requests) as cash,
    (select count(*)::int from nex_bets) as bets,
    (select count(*)::int from nex_bet_settlement_events) as settle_events
`

// opening / balance_fix presence for seed users
out.seedLedger = await sql`
  select u.login, u.money as wallet,
         coalesce(sum(m.amount),0)::bigint as ledger_sum,
         count(m.id)::int as move_count
  from nex_users u
  left join nex_money_moves m on m.user_id = u.id
  where u.login in ('admin','test','test123','user03','user04','user05')
  group by u.id
  order by u.login
`

console.log(JSON.stringify(out, null, 2))
await sql.end({ timeout: 5 })
