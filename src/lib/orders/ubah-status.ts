import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { transisiStatus, type GagalTransisi, type StatusOrder } from "@/lib/domain/order-status";

export type HasilUbahStatus = { ok: true } | { ok: false; error: GagalTransisi | "ORDER_TIDAK_ADA" };

/**
 * Ubah status order + catat event audit dalam satu transaksi.
 * Aturan transisinya ada di fungsi murni transisiStatus.
 */
export async function ubahStatusOrder(
  db: Db,
  input: { orderId: string; ke: StatusOrder; resiNomor?: string | null; alasanBatal?: string | null; olehUserId: string; waktu?: Date },
): Promise<HasilUbahStatus> {
  const waktu = input.waktu ?? new Date();

  return db.transaction(async (tx) => {
    // FOR UPDATE: dua admin yang mengubah order sama tidak saling timpa.
    const [order] = await tx
      .select({ status: orders.status, resiNomor: orders.resiNomor, dikirimPada: orders.dikirimPada })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!order) return { ok: false, error: "ORDER_TIDAK_ADA" } as const;

    const hasil = transisiStatus({ order, ke: input.ke, resiNomor: input.resiNomor, alasanBatal: input.alasanBatal, waktu });
    if (!hasil.ok) return hasil;

    await tx.update(orders).set(hasil.perubahan).where(eq(orders.id, input.orderId));
    await tx.insert(orderEvents).values({ orderId: input.orderId, ...hasil.event, olehUserId: input.olehUserId });
    return { ok: true } as const;
  });
}
