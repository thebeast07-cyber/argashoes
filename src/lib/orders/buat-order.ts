import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { customers, orderEvents, orderItems, orders, products, variants } from "@/db/schema";
import {
  buatKodeOrder,
  lewatBatasKirim,
  rencanakanOrder,
  type DataPembeli,
  type ItemDiminta,
  type MasalahItem,
  type VarianTerkini,
} from "@/lib/domain/checkout";
import type { FeeTier } from "@/lib/domain/fee";

// Order publik: dicatat dulu sebagai Lead, baru pembeli diarahkan ke WhatsApp (PRD: closing tidak boleh lolos tanpa catatan).

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type HasilBuatOrder =
  | { ok: true; kode: string }
  | { ok: false; alasan: "item"; masalah: MasalahItem[] }
  | { ok: false; alasan: "batas" };

async function varianTerkini(tx: Tx, diminta: readonly ItemDiminta[]): Promise<VarianTerkini[]> {
  const ids = [...new Set(diminta.map((d) => d.productId))];
  if (ids.length === 0) return [];
  return tx
    .select({
      productId: products.id,
      variantId: variants.id,
      size: variants.size,
      stok: variants.stok,
      nama: products.nama,
      brand: products.brand,
      harga: products.harga,
      feeProduk: products.feePerPasang,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(and(inArray(products.id, ids), eq(products.aktif, true)));
}

export async function buatOrder(
  db: Db,
  input: {
    pembeli: DataPembeli;
    diminta: readonly ItemDiminta[];
    tiers: readonly FeeTier[];
    utmSource: string | null;
    sekarang?: Date;
    acak?: () => Uint8Array;
  },
): Promise<HasilBuatOrder> {
  const sekarang = input.sekarang ?? new Date();
  const acak = input.acak ?? (() => randomBytes(4));
  const { pembeli } = input;

  // Kode bentrok (peluang kecil) membatalkan transaksi; diulang dengan kode baru.
  for (let percobaan = 0; percobaan < 5; percobaan++) {
    try {
      return await db.transaction(async (tx): Promise<HasilBuatOrder> => {
        const sebelumnya = await tx
          .select({ dibuat: orders.dibuat })
          .from(orders)
          .where(and(eq(orders.noWa, pembeli.noWa), gt(orders.dibuat, new Date(sekarang.getTime() - 60 * 60_000))));
        if (lewatBatasKirim(sebelumnya.map((o) => o.dibuat), sekarang)) return { ok: false, alasan: "batas" };

        const rencana = rencanakanOrder(input.diminta, await varianTerkini(tx, input.diminta), input.tiers);
        if (!rencana.ok) return { ok: false, alasan: "item", masalah: rencana.masalah };

        const [pelanggan] = await tx
          .insert(customers)
          .values({ nama: pembeli.nama, noWa: pembeli.noWa, alamatTerakhir: pembeli.alamat, persetujuanPada: sekarang })
          .onConflictDoUpdate({
            target: customers.noWa,
            set: { nama: pembeli.nama, alamatTerakhir: pembeli.alamat, persetujuanPada: sekarang },
          })
          .returning({ id: customers.id });

        const kode = buatKodeOrder(acak());
        const [order] = await tx
          .insert(orders)
          .values({
            kode,
            customerId: pelanggan.id,
            total: rencana.total,
            nama: pembeli.nama,
            noWa: pembeli.noWa,
            alamat: pembeli.alamat,
            catatan: pembeli.catatan,
            utmSource: input.utmSource,
            dibuat: sekarang,
          })
          .returning({ id: orders.id });
        await tx.insert(orderItems).values(rencana.items.map((i) => ({ orderId: order.id, ...i })));
        await tx.insert(orderEvents).values({ orderId: order.id, dariStatus: null, keStatus: "lead", olehUserId: null, waktu: sekarang });
        return { ok: true, kode };
      });
    } catch (e) {
      if (!isUniqueViolation(e, "orders_kode_unique")) throw e;
    }
  }
  throw new Error("Gagal membuat kode order unik setelah 5 percobaan.");
}

/** Untuk halaman konfirmasi pembeli: tanpa nomor WA, tanpa data internal. */
export async function orderPublik(db: Db, kode: string) {
  const [o] = await db
    .select({ id: orders.id, kode: orders.kode, nama: orders.nama, alamat: orders.alamat, catatan: orders.catatan, total: orders.total })
    .from(orders)
    .where(eq(orders.kode, kode));
  if (!o) return null;
  const items = await db
    .select({ namaProduk: orderItems.namaProduk, size: orderItems.size, jumlah: orderItems.jumlah, hargaSatuan: orderItems.hargaSatuan })
    .from(orderItems)
    .where(eq(orderItems.orderId, o.id));
  return { ...o, items };
}

/** Klik WhatsApp dicatat sebagai waktu, bukan status (PRD aturan 1). Hanya klik pertama yang disimpan. */
export async function catatKlikWa(db: Db, kode: string, waktu = new Date()): Promise<void> {
  await db.update(orders).set({ waClickedAt: waktu }).where(and(eq(orders.kode, kode), isNull(orders.waClickedAt)));
}
