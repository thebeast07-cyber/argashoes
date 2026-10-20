CREATE TABLE "percobaan_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "percobaan_login_email_idx" ON "percobaan_login" USING btree ("email","waktu");--> statement-breakpoint
CREATE INDEX "percobaan_login_ip_idx" ON "percobaan_login" USING btree ("ip","waktu");