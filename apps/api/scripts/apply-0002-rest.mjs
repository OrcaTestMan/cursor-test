import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = postgres(process.env.DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex', {
  max: 1,
})

await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS nex_cash_pending_idx ON nex_cash_requests (id, requested_at) WHERE status = '대기'`,
)
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS nex_bets_open_idx ON nex_bets (id, placed_at) WHERE status = '진행 중'`,
)
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS nex_casino_bets_open_idx ON nex_casino_bets (id, placed_at) WHERE status = '진행 중'`,
)
await sql.unsafe(
  `CREATE UNIQUE INDEX IF NOT EXISTS nex_cash_idempotency_uidx ON nex_cash_requests (idempotency_key) WHERE idempotency_key IS NOT NULL`,
)

const idx = await sql`
  SELECT indexname FROM pg_indexes
  WHERE indexname IN (
    'nex_cash_pending_idx',
    'nex_bets_open_idx',
    'nex_casino_bets_open_idx',
    'nex_cash_idempotency_uidx'
  )
`
console.log('indexes', idx)

const file = `ALTER TABLE "nex_users" ALTER COLUMN "money" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_users" ALTER COLUMN "points" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_money_moves" ALTER COLUMN "id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_money_moves" ALTER COLUMN "amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_money_moves" ALTER COLUMN "balance_after" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_cash_requests" ALTER COLUMN "amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_cash_requests" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(128);--> statement-breakpoint
ALTER TABLE "nex_bets" ALTER COLUMN "stake" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_bets" ALTER COLUMN "potential_payout" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_casino_bets" ALTER COLUMN "stake" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "nex_casino_bets" ALTER COLUMN "payout" SET DATA TYPE bigint;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_idempotency_keys" (
  "id" bigserial PRIMARY KEY,
  "scope" varchar(64) NOT NULL,
  "key" varchar(128) NOT NULL,
  "status_code" integer NOT NULL DEFAULT 200,
  "response_body" text NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nex_idempotency_scope_key_uidx" ON "nex_idempotency_keys" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_idempotency_created_idx" ON "nex_idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nex_money_moves_ref_uidx" ON "nex_money_moves" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_money_moves_user_created_id_idx" ON "nex_money_moves" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_cash_pending_idx" ON "nex_cash_requests" USING btree ("id","requested_at") WHERE "status" = '대기';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_open_idx" ON "nex_bets" USING btree ("id","placed_at") WHERE "status" = '진행 중';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_casino_bets_open_idx" ON "nex_casino_bets" USING btree ("id","placed_at") WHERE "status" = '진행 중';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nex_cash_idempotency_uidx" ON "nex_cash_requests" USING btree ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
`

fs.writeFileSync(path.join(root, 'drizzle/0002_money_ledger_hardening.sql'), file, 'utf8')
console.log('rewrote 0002 sql')
await sql.end()
