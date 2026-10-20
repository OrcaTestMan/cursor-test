CREATE TABLE "nex_money_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" varchar(40) NOT NULL,
	"ref_type" varchar(40) DEFAULT '' NOT NULL,
	"ref_id" integer,
	"memo" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nex_money_moves" ADD CONSTRAINT "nex_money_moves_user_id_nex_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."nex_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nex_money_moves_user_idx" ON "nex_money_moves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nex_money_moves_created_idx" ON "nex_money_moves" USING btree ("created_at");