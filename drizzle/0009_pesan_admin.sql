CREATE TABLE "pesan_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dari_user_id" uuid NOT NULL,
	"ke_user_id" uuid NOT NULL,
	"isi" text NOT NULL,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL,
	"dibaca" timestamp with time zone,
	CONSTRAINT "pesan_admin_isi_check" CHECK (char_length("pesan_admin"."isi") between 1 and 1000),
	CONSTRAINT "pesan_admin_beda_check" CHECK ("pesan_admin"."dari_user_id" <> "pesan_admin"."ke_user_id")
);
--> statement-breakpoint
ALTER TABLE "pesan_admin" ADD CONSTRAINT "pesan_admin_dari_user_id_users_id_fk" FOREIGN KEY ("dari_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesan_admin" ADD CONSTRAINT "pesan_admin_ke_user_id_users_id_fk" FOREIGN KEY ("ke_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pesan_admin_masuk_idx" ON "pesan_admin" USING btree ("ke_user_id","dibaca");