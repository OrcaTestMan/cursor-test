ALTER TYPE "nex_bet_status" ADD VALUE IF NOT EXISTS '적특';--> statement-breakpoint
ALTER TABLE "nex_bets" ADD COLUMN IF NOT EXISTS "folder_kind" varchar(10) DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "match_name" varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "market_name" varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "outcome_name" varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "sport" varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "league" varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "nex_bet_legs" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT '진행 중' NOT NULL;--> statement-breakpoint
UPDATE "nex_bets" b SET "folder_kind" = 'multi'
WHERE (
  SELECT count(*) FROM "nex_bet_legs" l WHERE l.bet_id = b.id
) >= 2;--> statement-breakpoint
UPDATE "nex_bet_legs" l SET
  "match_name" = coalesce(m.name, ''),
  "sport" = coalesce(m.sport, ''),
  "league" = coalesce(m.league, ''),
  "live" = coalesce(m.live, false)
FROM "nex_matches" m
WHERE m.id = l.match_id;--> statement-breakpoint
UPDATE "nex_bet_legs" l SET "market_name" = coalesce(mk.name, '')
FROM "nex_markets" mk
WHERE mk.id = l.market_id;--> statement-breakpoint
UPDATE "nex_bet_legs" l SET "outcome_name" = coalesce(o.name, '')
FROM "nex_outcomes" o
WHERE o.id = l.outcome_id;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_placed_id_idx" ON "nex_bets" ("placed_at", "id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_folder_kind_idx" ON "nex_bets" ("folder_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_sport_idx" ON "nex_bets" ("sport");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_league_idx" ON "nex_bets" ("league");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_live_idx" ON "nex_bets" ("match_live");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nex_bets_stake_idx" ON "nex_bets" ("stake");
