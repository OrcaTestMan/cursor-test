DO $$ BEGIN
  ALTER TABLE "nex_users" ADD CONSTRAINT "nex_users_money_nonneg" CHECK (money >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "nex_bets" ADD COLUMN IF NOT EXISTS "settlement_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nex_bet_settlement_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "bet_id" integer NOT NULL,
  "revision" integer NOT NULL,
  "from_status" varchar(20) NOT NULL,
  "to_status" varchar(20) NOT NULL,
  "money_delta" bigint DEFAULT 0 NOT NULL,
  "memo" varchar(200) DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nex_bet_settlement_events"
    ADD CONSTRAINT "nex_bet_settlement_events_bet_id_nex_bets_id_fk"
    FOREIGN KEY ("bet_id") REFERENCES "public"."nex_bets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bet_settle_bet_idx" ON "nex_bet_settlement_events" USING btree ("bet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nex_bet_settle_bet_rev_uidx" ON "nex_bet_settlement_events" USING btree ("bet_id","revision");
