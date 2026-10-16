CREATE TYPE "public"."peran" AS ENUM('pemilik', 'admin_toko');--> statement-breakpoint
CREATE TYPE "public"."status_order" AS ENUM('lead', 'dikonfirmasi', 'dikirim', 'selesai', 'batal');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oleh_user_id" uuid,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"data" jsonb,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"no_wa" text NOT NULL,
	"email" text,
	"alamat_terakhir" text,
	"persetujuan_pada" timestamp with time zone,
	"user_id" uuid,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_no_wa_unique" UNIQUE("no_wa")
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulan" text NOT NULL,
	"total" integer NOT NULL,
	"dibayar_pada" timestamp with time zone,
	"catatan" text,
	CONSTRAINT "fee_payments_bulan_unique" UNIQUE("bulan")
);
--> statement-breakpoint
CREATE TABLE "fee_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"harga_min" integer NOT NULL,
	"harga_max" integer,
	"fee" integer NOT NULL,
	CONSTRAINT "fee_tiers_rentang_check" CHECK ("fee_tiers"."harga_min" >= 0 and ("fee_tiers"."harga_max" is null or "fee_tiers"."harga_max" > "fee_tiers"."harga_min")),
	CONSTRAINT "fee_tiers_fee_check" CHECK ("fee_tiers"."fee" between 50000 and 100000)
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"dari_status" "status_order",
	"ke_status" "status_order" NOT NULL,
	"oleh_user_id" uuid,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"nama_produk" text NOT NULL,
	"size" text NOT NULL,
	"harga_satuan" integer NOT NULL,
	"jumlah" integer NOT NULL,
	"fee_per_pasang" integer NOT NULL,
	CONSTRAINT "order_items_jumlah_check" CHECK ("order_items"."jumlah" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "status_order" DEFAULT 'lead' NOT NULL,
	"total" integer NOT NULL,
	"nama" text NOT NULL,
	"no_wa" text NOT NULL,
	"alamat" text NOT NULL,
	"catatan" text,
	"catatan_internal" text,
	"wa_clicked_at" timestamp with time zone,
	"resi_nomor" text,
	"resi_foto" text,
	"dikirim_pada" timestamp with time zone,
	"utm_source" text,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_kode_unique" UNIQUE("kode"),
	CONSTRAINT "orders_resi_check" CHECK ("orders"."status" not in ('dikirim', 'selesai') or ("orders"."resi_nomor" is not null and length(trim("orders"."resi_nomor")) > 0 and "orders"."dikirim_pada" is not null))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"brand" text NOT NULL,
	"kategori" text,
	"deskripsi" text,
	"harga" integer NOT NULL,
	"harga_coret" integer,
	"fee_per_pasang" integer,
	"foto" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_harga_check" CHECK ("products"."harga" >= 0),
	CONSTRAINT "products_fee_check" CHECK ("products"."fee_per_pasang" is null or "products"."fee_per_pasang" between 50000 and 100000)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kedaluwarsa" timestamp with time zone NOT NULL,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"kunci" text PRIMARY KEY NOT NULL,
	"nilai" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"peran" "peran" NOT NULL,
	"password_hash" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"size" text NOT NULL,
	"stok" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variants_stok_check" CHECK ("variants"."stok" >= 0)
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_oleh_user_id_users_id_fk" FOREIGN KEY ("oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_oleh_user_id_users_id_fk" FOREIGN KEY ("oleh_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entitas_idx" ON "audit_log" USING btree ("entitas","entitas_id");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_dikirim_pada_idx" ON "orders" USING btree ("dikirim_pada");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_product_size_uq" ON "variants" USING btree ("product_id","size");