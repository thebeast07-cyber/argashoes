CREATE TYPE "public"."jenis_usulan" AS ENUM('tier', 'fee_produk', 'rekening');--> statement-breakpoint
CREATE TYPE "public"."status_usulan" AS ENUM('menunggu', 'disetujui', 'ditolak', 'dibatalkan');--> statement-breakpoint
CREATE TABLE "usulan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jenis" "jenis_usulan" NOT NULL,
	"kunci" text NOT NULL,
	"product_id" uuid,
	"isi" jsonb NOT NULL,
	"dasar" jsonb NOT NULL,
	"alasan" text,
	"status" "status_usulan" DEFAULT 'menunggu' NOT NULL,
	"diajukan_oleh" uuid NOT NULL,
	"diajukan_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diputuskan_oleh" uuid,
	"diputuskan_pada" timestamp with time zone,
	"catatan_keputusan" text,
	CONSTRAINT "usulan_keputusan_check" CHECK (("usulan"."status" = 'menunggu') = ("usulan"."diputuskan_pada" is null))
);
--> statement-breakpoint
ALTER TABLE "usulan" ADD CONSTRAINT "usulan_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usulan" ADD CONSTRAINT "usulan_diajukan_oleh_users_id_fk" FOREIGN KEY ("diajukan_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usulan" ADD CONSTRAINT "usulan_diputuskan_oleh_users_id_fk" FOREIGN KEY ("diputuskan_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usulan_satu_menunggu_uq" ON "usulan" USING btree ("kunci") WHERE "usulan"."status" = 'menunggu';--> statement-breakpoint
CREATE INDEX "usulan_status_idx" ON "usulan" USING btree ("status","diajukan_pada");