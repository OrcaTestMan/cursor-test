CREATE TABLE IF NOT EXISTS "nex_matches" (
  "id" serial PRIMARY KEY NOT NULL,
  "sport" varchar(60) DEFAULT '' NOT NULL,
  "league" varchar(120) DEFAULT '' NOT NULL,
  "name" varchar(200) NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "live" boolean DEFAULT false NOT NULL,
  "tier" varchar(20) DEFAULT 'main' NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_markets" (
  "id" serial PRIMARY KEY NOT NULL,
  "match_id" integer NOT NULL REFERENCES "nex_matches"("id") ON DELETE cascade,
  "name" varchar(80) NOT NULL,
  "suspended" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_outcomes" (
  "id" serial PRIMARY KEY NOT NULL,
  "market_id" integer NOT NULL REFERENCES "nex_markets"("id") ON DELETE cascade,
  "name" varchar(80) NOT NULL,
  "odds_open" numeric(12,4) NOT NULL,
  "odds_current" numeric(12,4) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_bet_legs" (
  "id" serial PRIMARY KEY NOT NULL,
  "bet_id" integer NOT NULL REFERENCES "nex_bets"("id") ON DELETE cascade,
  "match_id" integer REFERENCES "nex_matches"("id") ON DELETE set null,
  "market_id" integer REFERENCES "nex_markets"("id") ON DELETE set null,
  "outcome_id" integer REFERENCES "nex_outcomes"("id") ON DELETE set null,
  "odds_at_bet" numeric(12,4) NOT NULL,
  "line" varchar(40) DEFAULT '-' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bet_legs_bet_idx" ON "nex_bet_legs" ("bet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bet_legs_match_idx" ON "nex_bet_legs" ("match_id");--> statement-breakpoint
ALTER TABLE "nex_users" ADD COLUMN IF NOT EXISTS "grade" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_users" ADD COLUMN IF NOT EXISTS "last_ip" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_users" ADD COLUMN IF NOT EXISTS "last_device" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_users" ADD COLUMN IF NOT EXISTS "withdraw_account" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_audit_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "actor" varchar(80) NOT NULL,
  "target_type" varchar(40) NOT NULL,
  "target_id" varchar(40) NOT NULL,
  "action" varchar(80) NOT NULL,
  "reason" varchar(400) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_audit_logs_created_idx" ON "nex_audit_logs" ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_risk_exposure" (
  "id" serial PRIMARY KEY NOT NULL,
  "match_id" integer NOT NULL REFERENCES "nex_matches"("id") ON DELETE cascade,
  "market_id" integer NOT NULL REFERENCES "nex_markets"("id") ON DELETE cascade,
  "outcome_id" integer NOT NULL REFERENCES "nex_outcomes"("id") ON DELETE cascade,
  "stake_sum" bigint DEFAULT 0 NOT NULL,
  "payout_sum" bigint DEFAULT 0 NOT NULL,
  "bet_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nex_risk_exposure_uidx" ON "nex_risk_exposure" ("match_id","market_id","outcome_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_risk_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "loss_limit" bigint DEFAULT 5000000 NOT NULL,
  "weights" text DEFAULT '{"limit":35,"skew":20,"imminent":15,"oddsDrop":10,"sharp":10,"multi":10}' NOT NULL,
  "alert_thresholds" text DEFAULT '{}' NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_risk_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "kind" varchar(60) NOT NULL,
  "severity" varchar(20) DEFAULT 'medium' NOT NULL,
  "message" varchar(400) NOT NULL,
  "match_id" integer,
  "user_id" integer,
  "acked" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
