CREATE TYPE "public"."cheer_side" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('comment', 'reply', 'inquiry_answer', 'message', 'report_result');--> statement-breakpoint
CREATE TYPE "public"."prediction_pick" AS ENUM('home', 'draw', 'away');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('abuse', 'obscene', 'spam', 'privacy', 'etc');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('post', 'comment');--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'deleted';--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" integer,
	"detail" varchar(300) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "forbidden_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forbidden_words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE TABLE "match_cheers" (
	"match_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"side" "cheer_side" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_cheers_match_id_user_id_pk" PRIMARY KEY("match_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "match_predictions" (
	"match_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"pick" "prediction_pick" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_predictions_match_id_user_id_pk" PRIMARY KEY("match_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"text" varchar(200) NOT NULL,
	"link" varchar(200) NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" integer NOT NULL,
	"reason" "report_reason" NOT NULL,
	"detail" varchar(300) DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"handled_by_id" integer,
	"handled_at" timestamp with time zone,
	"handle_note" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tag" varchar(20);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "best_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "best_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "report_hide_threshold" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "post_cooldown_sec" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "comment_cooldown_sec" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "free_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "match_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nickname_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_cheers" ADD CONSTRAINT "match_cheers_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_cheers" ADD CONSTRAINT "match_cheers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookmarks_post_id_idx" ON "bookmarks" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "match_cheers_user_id_idx" ON "match_cheers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_predictions_user_id_idx" ON "match_predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "post_likes_user_id_idx" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_target_uq" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "posts_like_count_idx" ON "posts" USING btree ("like_count");