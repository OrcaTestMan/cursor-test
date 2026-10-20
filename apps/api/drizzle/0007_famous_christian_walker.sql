CREATE TABLE "post_poll_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"label" varchar(40) NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_poll_votes" (
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_poll_votes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_polls" (
	"post_id" integer PRIMARY KEY NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" integer NOT NULL,
	"badge_id" varchar(30) NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
ALTER TABLE "post_poll_options" ADD CONSTRAINT "post_poll_options_post_id_post_polls_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post_polls"("post_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_post_id_post_polls_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post_polls"("post_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_option_id_post_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."post_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_polls" ADD CONSTRAINT "post_polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_poll_options_post_idx" ON "post_poll_options" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "post_poll_votes_option_idx" ON "post_poll_votes" USING btree ("option_id");