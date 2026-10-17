ALTER TABLE "banner" DROP CONSTRAINT "banner_tombol_check";--> statement-breakpoint
ALTER TABLE "banner" ADD COLUMN "gambar_potret" text;--> statement-breakpoint
ALTER TABLE "banner" ADD COLUMN "gambar_lanskap" text;--> statement-breakpoint
-- Banner lama (versi strip teks): gambarnya dipakai untuk kedua ukuran; yang tanpa gambar dimatikan
-- supaya constraint di bawah bisa dipasang. Ditulis tangan, bukan hasil drizzle-kit.
UPDATE "banner" SET "gambar_potret" = "gambar_url", "gambar_lanskap" = "gambar_url" WHERE "gambar_url" IS NOT NULL;--> statement-breakpoint
UPDATE "banner" SET "aktif" = false WHERE "gambar_url" IS NULL;--> statement-breakpoint
ALTER TABLE "banner" ADD CONSTRAINT "banner_gambar_check" CHECK (not "banner"."aktif" or ("banner"."gambar_potret" is not null and "banner"."gambar_lanskap" is not null));