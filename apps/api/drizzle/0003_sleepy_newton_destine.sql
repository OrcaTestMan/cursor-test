CREATE TYPE "public"."upload_kind" AS ENUM('post', 'avatar');--> statement-breakpoint
CREATE TABLE "post_teams" (
	"post_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "post_teams_post_id_team_id_pk" PRIMARY KEY("post_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"sport" varchar(20) NOT NULL,
	"league_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "upload_kind" DEFAULT 'post' NOT NULL,
	"post_id" integer,
	"stored_name" varchar(200) NOT NULL,
	"original_name" varchar(200) NOT NULL,
	"mime" varchar(50) NOT NULL,
	"size" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_teams" (
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_teams_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_upload_id" integer;--> statement-breakpoint
ALTER TABLE "post_teams" ADD CONSTRAINT "post_teams_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_teams" ADD CONSTRAINT "post_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_teams_team_id_idx" ON "post_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_sport_idx" ON "teams" USING btree ("sport");--> statement-breakpoint
CREATE INDEX "uploads_post_id_idx" ON "uploads" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "uploads_user_id_idx" ON "uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_teams_team_id_idx" ON "user_teams" USING btree ("team_id");