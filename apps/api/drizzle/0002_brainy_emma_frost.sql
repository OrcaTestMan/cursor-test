ALTER TYPE "public"."post_category" ADD VALUE 'humor';--> statement-breakpoint
ALTER TYPE "public"."post_category" ADD VALUE 'review';--> statement-breakpoint
ALTER TYPE "public"."post_category" ADD VALUE 'news';--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "humor_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "review_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "news_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_likes_user_id_idx" ON "comment_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_like_count_idx" ON "comments" USING btree ("like_count");