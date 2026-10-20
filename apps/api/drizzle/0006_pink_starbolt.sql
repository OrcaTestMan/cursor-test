ALTER TYPE "public"."notification_type" ADD VALUE 'mention';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'subscribe';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'follow';--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"comment" boolean DEFAULT true NOT NULL,
	"reply" boolean DEFAULT true NOT NULL,
	"mention" boolean DEFAULT true NOT NULL,
	"subscribe" boolean DEFAULT true NOT NULL,
	"follow" boolean DEFAULT true NOT NULL,
	"inquiry_answer" boolean DEFAULT true NOT NULL,
	"message" boolean DEFAULT true NOT NULL,
	"report_result" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_subscriptions" (
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_subscriptions_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" integer NOT NULL,
	"followee_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "user_mutes" (
	"user_id" integer NOT NULL,
	"muted_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_mutes_user_id_muted_user_id_pk" PRIMARY KEY("user_id","muted_user_id")
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_subscriptions" ADD CONSTRAINT "post_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_subscriptions" ADD CONSTRAINT "post_subscriptions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_users_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muted_user_id_users_id_fk" FOREIGN KEY ("muted_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_subscriptions_post_idx" ON "post_subscriptions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "user_follows_followee_idx" ON "user_follows" USING btree ("followee_id");--> statement-breakpoint
CREATE INDEX "user_mutes_muted_idx" ON "user_mutes" USING btree ("muted_user_id");