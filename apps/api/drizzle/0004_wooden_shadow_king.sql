ALTER TYPE "public"."report_target" ADD VALUE 'chat';--> statement-breakpoint
CREATE TABLE "match_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" varchar(500) NOT NULL,
	"status" "content_status" DEFAULT 'visible' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_messages" ADD CONSTRAINT "match_messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_messages" ADD CONSTRAINT "match_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_messages_match_id_id_idx" ON "match_messages" USING btree ("match_id","id");--> statement-breakpoint
CREATE INDEX "match_messages_user_id_idx" ON "match_messages" USING btree ("user_id");