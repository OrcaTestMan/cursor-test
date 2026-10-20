ALTER TABLE "match_messages" DROP CONSTRAINT "match_messages_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "match_messages" ADD CONSTRAINT "match_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;