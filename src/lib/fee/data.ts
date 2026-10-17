import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { feePayments, orderItems, orders } from "@/db/schema";
import { rekapFeeBulanan, STATUS_KENA_FEE } from "@/lib/domain/fee";
import { rentangBulanWib, ringkasPerBulan } from "@/lib/domain/laporan-fee";

// Query laporan fee. Aturan siapa yang kena fee tetap di domain/fee.ts; di sini hanya menyaring kasar lewat SQL.

const kandidat = and(inArray(orders.status, [...STATUS_KENA_FEE]), isNotNull(orders.dikirimPada), isNotNull(orders.resiNomor));

export async function ringkasanSemuaBulan(db: Db, sekarang: Date) {
  const [rows, bayar] = await Promise.all([
    db
      .select({
        dikirimPada: orders.dikirimPada,
        pasang: sql<number>`sum(${orderItems.jumlah})::int`,
        fee: sql<number>`sum(${orderItems.feePerPasang} * ${orderItems.jumlah})::int`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(kandidat)
      .groupBy(orders.id),
    db.select().from(feePayments),
  ]);
  const bulan = ringkasPerBulan(
    rows.map((r) => ({ dikirimPada: r.dikirimPada!, pasang: r.pasang, fee: r.fee })),
    sekarang,
  );
  return bulan.map((b) => ({ ...b, pembayaran: bayar.find((p) => p.bulan === b.bulan) ?? null }));
}

export async function rekapBulan(db: Db, bulan: string) {
  const { mulai, akhir } = rentangBulanWib(bulan);
  const daftar = await db
    .select({
      id: orders.id,
      kode: orders.kode,
      status: orders.status,
      resiNomor: orders.resiNomor,
      dikirimPada: orders.dikirimPada,
      nama: orders.nama,
      total: orders.total,
    })
    .from(orders)
    .where(and(kandidat, gte(orders.dikirimPada, mulai), lt(orders.dikirimPada, akhir)))
    .orderBy(desc(orders.dikirimPada));
  const items = daftar.length
    ? await db
        .select({ orderId: orderItems.orderId, feePerPasang: orderItems.feePerPasang, jumlah: orderItems.jumlah })
        .from(orderItems)
        .where(inArray(orderItems.orderId, daftar.map((o) => o.id)))
    : [];
  const rekap = rekapFeeBulanan(
    daftar.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
    bulan,
  );
  // Urutan tampilan: yang terakhir dikirim di atas; angka tetap dari rekapFeeBulanan.
  const detail = daftar.flatMap((o) => {
    const r = rekap.orders.find((x) => x.id === o.id);
    return r ? [{ ...o, dikirimPada: o.dikirimPada!, pasang: r.pasang, fee: r.fee }] : [];
  });
  const [pembayaran] = await db.select().from(feePayments).where(eq(feePayments.bulan, bulan));
  return { bulan, jumlahPasang: rekap.jumlahPasang, totalFee: rekap.totalFee, orders: detail, pembayaran: pembayaran ?? null };
}
