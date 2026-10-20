CREATE TYPE "public"."nex_bet_status" AS ENUM('진행 중', '적중', '미적중', '취소');--> statement-breakpoint
CREATE TYPE "public"."nex_cash_status" AS ENUM('대기', '승인', '거절', '지급 실패');--> statement-breakpoint
CREATE TYPE "public"."nex_cash_type" AS ENUM('입금', '출금');--> statement-breakpoint
CREATE TYPE "public"."nex_casino_kind" AS ENUM('live', 'slot', 'other');--> statement-breakpoint
CREATE TYPE "public"."nex_review_rec" AS ENUM('void_review', 'weak_evidence', 'ambiguous', 'not_won', 'none');--> statement-breakpoint
CREATE TYPE "public"."nex_user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."nex_user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "nex_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar(400) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_name" varchar(200) NOT NULL,
	"league" varchar(120) DEFAULT '' NOT NULL,
	"sport" varchar(60) DEFAULT '' NOT NULL,
	"market" varchar(80) DEFAULT '승무패' NOT NULL,
	"line" varchar(40) DEFAULT '-' NOT NULL,
	"when_label" varchar(20) DEFAULT '일반' NOT NULL,
	"stake" integer NOT NULL,
	"odds" numeric(12, 4) NOT NULL,
	"potential_payout" integer NOT NULL,
	"status" "nex_bet_status" DEFAULT '진행 중' NOT NULL,
	"match_live" boolean DEFAULT false NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nex_cash_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"user_id" integer NOT NULL,
	"type" "nex_cash_type" NOT NULL,
	"amount" integer NOT NULL,
	"status" "nex_cash_status" DEFAULT '대기' NOT NULL,
	"memo" varchar(200) DEFAULT '' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nex_casino_bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"kind" "nex_casino_kind" DEFAULT 'other' NOT NULL,
	"stake" integer NOT NULL,
	"payout" integer DEFAULT 0 NOT NULL,
	"status" "nex_bet_status" DEFAULT '진행 중' NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nex_dist_accruals" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"source" varchar(80) DEFAULT '스포츠' NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer DEFAULT 0 NOT NULL,
	"memo" varchar(200) DEFAULT '' NOT NULL,
	"accrued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_dist_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"login" varchar(40) NOT NULL,
	"nick" varchar(40) NOT NULL,
	"line_name" varchar(80) DEFAULT '' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"unpaid" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_dist_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"memo" varchar(200) DEFAULT '' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" varchar(160) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_point_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar(40) DEFAULT '지급' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_review_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"bet_id" integer,
	"user_id" integer NOT NULL,
	"recommendation" "nex_review_rec" DEFAULT 'none' NOT NULL,
	"flagged" boolean DEFAULT true NOT NULL,
	"ambiguous" boolean DEFAULT false NOT NULL,
	"backlog" boolean DEFAULT false NOT NULL,
	"match_name" varchar(200) NOT NULL,
	"market" varchar(80) DEFAULT '' NOT NULL,
	"selection" varchar(80) DEFAULT '' NOT NULL,
	"stake" integer NOT NULL,
	"potential_payout" integer NOT NULL,
	"bet_status" "nex_bet_status" DEFAULT '진행 중' NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	"event_at" timestamp with time zone,
	"margin_sec" numeric(8, 1),
	"slack_sec" numeric(8, 1),
	"feed_at" timestamp with time zone,
	"snapshot" varchar(40) DEFAULT '-' NOT NULL,
	"horizon_ok" boolean,
	"badges" text DEFAULT '' NOT NULL,
	"reasons" text DEFAULT '' NOT NULL,
	"recent_30" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" text DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"login" varchar(40) NOT NULL,
	"nick" varchar(40) NOT NULL,
	"password_hash" text DEFAULT '' NOT NULL,
	"role" "nex_user_role" DEFAULT 'member' NOT NULL,
	"status" "nex_user_status" DEFAULT 'active' NOT NULL,
	"block_reason" varchar(200) DEFAULT '' NOT NULL,
	"money" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nex_wallet_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"network" varchar(40) DEFAULT 'TRC-20' NOT NULL,
	"address" varchar(200) DEFAULT '' NOT NULL,
	"rate" varchar(40) DEFAULT '1450' NOT NULL,
	"min_amount" varchar(40) DEFAULT '10' NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nex_bets" ADD CONSTRAINT "nex_bets_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_cash_requests" ADD CONSTRAINT "nex_cash_requests_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_casino_bets" ADD CONSTRAINT "nex_casino_bets_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_dist_accruals" ADD CONSTRAINT "nex_dist_accruals_agent_id_nex_dist_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."nex_dist_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_dist_payouts" ADD CONSTRAINT "nex_dist_payouts_agent_id_nex_dist_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."nex_dist_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_inquiries" ADD CONSTRAINT "nex_inquiries_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_point_moves" ADD CONSTRAINT "nex_point_moves_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_review_flags" ADD CONSTRAINT "nex_review_flags_bet_id_nex_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."nex_bets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nex_review_flags" ADD CONSTRAINT "nex_review_flags_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nex_activity_logs_created_idx" ON "nex_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "nex_bets_user_idx" ON "nex_bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_bets_status_idx" ON "nex_bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nex_bets_match_idx" ON "nex_bets" USING btree ("match_name");--> statement-breakpoint
CREATE UNIQUE INDEX "nex_cash_public_id_uidx" ON "nex_cash_requests" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "nex_cash_user_idx" ON "nex_cash_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_cash_status_idx" ON "nex_cash_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nex_casino_bets_user_idx" ON "nex_casino_bets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_casino_bets_kind_idx" ON "nex_casino_bets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "nex_casino_bets_status_idx" ON "nex_casino_bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nex_dist_accruals_agent_idx" ON "nex_dist_accruals" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nex_dist_agents_code_uidx" ON "nex_dist_agents" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "nex_dist_agents_login_uidx" ON "nex_dist_agents" USING btree ("login");--> statement-breakpoint
CREATE INDEX "nex_dist_payouts_agent_idx" ON "nex_dist_payouts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "nex_point_moves_user_idx" ON "nex_point_moves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_review_flags_user_idx" ON "nex_review_flags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_review_flags_flagged_idx" ON "nex_review_flags" USING btree ("flagged");--> statement-breakpoint
CREATE UNIQUE INDEX "nex_users_login_uidx" ON "nex_users" USING btree ("login");--> statement-breakpoint
CREATE INDEX "nex_users_status_idx" ON "nex_users" USING btree ("status");