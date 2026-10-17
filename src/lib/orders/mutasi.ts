import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, orders } from "@/db/schema";
import { CATATAN_INTERNAL_MAKS } from "@/lib/domain/order-admin";

// Perubahan order selain status (status lewat ubah-status.ts). Semua tercatat di audit_log dalam satu transaksi.

export async function simpanCatatanInternal(db: Db, orderId: string, teks: string, olehUserId: string): Promise<"ok" | "tidak_ada"> {
  const baru = teks.trim().slice(0, CATATAN_INTERNAL_MAKS) || null;
  return db.transaction(async (tx) => {
    const [lama] = await tx.select({ catatan: orders.catatanInternal }).from(orders).where(eq(orders.id, orderId)).for("update");
    if (!lama) return "tidak_ada";
    if (lama.catatan === baru) return "ok";
    await tx.update(orders).set({ catatanInternal: baru }).where(eq(orders.id, orderId));
    await tx.insert(auditLog).values({ olehUserId, aksi: "order.catatan", entitas: "orders", entitasId: orderId, data: { dari: lama.catatan, ke: baru } });
    return "ok";
  });
}

/** Mengembalikan URL foto resi lama (kalau ada) supaya filenya bisa dihapus setelah transaksi selesai. */
export async function simpanFotoResi(
  db: Db,
  orderId: string,
  url: string | null,
  olehUserId: string,
): Promise<{ ok: true; lama: string | null } | { ok: false }> {
  return db.transaction(async (tx) => {
    const [o] = await tx.select({ resiFoto: orders.resiFoto }).from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) return { ok: false } as const;
    await tx.update(orders).set({ resiFoto: url }).where(eq(orders.id, orderId));
    await tx.insert(auditLog).values({ olehUserId, aksi: url ? "order.foto_resi" : "order.foto_resi_dihapus", entitas: "orders", entitasId: orderId, data: { dari: o.resiFoto, ke: url } });
    return { ok: true, lama: o.resiFoto } as const;
  });
}
