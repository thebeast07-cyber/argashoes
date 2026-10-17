ALTER TABLE "order_events" ADD COLUMN "catatan" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "alasan_batal" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_alasan_batal_check" CHECK ("orders"."status" <> 'batal' or ("orders"."alasan_batal" is not null and length(trim("orders"."alasan_batal")) > 0));