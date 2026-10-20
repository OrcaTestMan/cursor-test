import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex', {
  max: 1,
})

await sql.unsafe(`
DO $$ BEGIN
  ALTER TABLE nex_users ADD CONSTRAINT nex_users_money_nonneg CHECK (money >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`)

await sql.unsafe(`
ALTER TABLE nex_bets ADD COLUMN IF NOT EXISTS settlement_revision integer DEFAULT 0 NOT NULL;
`)

await sql.unsafe(`
CREATE TABLE IF NOT EXISTS nex_bet_settlement_events (
  id serial PRIMARY KEY NOT NULL,
  bet_id integer NOT NULL REFERENCES nex_bets(id) ON DELETE cascade,
  revision integer NOT NULL,
  from_status varchar(20) NOT NULL,
  to_status varchar(20) NOT NULL,
  money_delta bigint DEFAULT 0 NOT NULL,
  memo varchar(200) DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
`)

await sql.unsafe(`
CREATE INDEX IF NOT EXISTS nex_bet_settle_bet_idx ON nex_bet_settlement_events (bet_id);
`)
await sql.unsafe(`
CREATE UNIQUE INDEX IF NOT EXISTS nex_bet_settle_bet_rev_uidx ON nex_bet_settlement_events (bet_id, revision);
`)

const check = await sql`SELECT conname FROM pg_constraint WHERE conname = 'nex_users_money_nonneg'`
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'nex_bets' AND column_name = 'settlement_revision'
`
const tbl = await sql`
  SELECT to_regclass('public.nex_bet_settlement_events') AS reg
`
console.log({ check, cols, tbl })
await sql.end()
