CREATE TABLE "banner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judul" text NOT NULL,
	"keterangan" text,
	"gambar_url" text,
	"tautan" text,
	"teks_tombol" text,
	"mulai" timestamp with time zone NOT NULL,
	"selesai" timestamp with time zone NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banner_jadwal_check" CHECK ("banner"."selesai" > "banner"."mulai"),
	CONSTRAINT "banner_tombol_check" CHECK (("banner"."tautan" is null) = ("banner"."teks_tombol" is null))
);
--> statement-breakpoint
CREATE INDEX "banner_jadwal_idx" ON "banner" USING btree ("aktif","mulai","selesai");