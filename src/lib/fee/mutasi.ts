import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, feePayments } from "@/db/schema";

// Pembayaran fee bulanan oleh retailer ke pemilik web. Total disimpan sebagai angka saat ditandai,
// supaya kalau rekap bulan itu berubah sesudahnya, selisihnya terlihat (domain/laporan-fee statusBayar).

export async function tandaiFeeDibayar(
  db: Db,
  input: { bulan: string; total: number; dibayarPada: Date; catatan: string | null },
  olehUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const nilai = { total: input.total, dibayarPada: input.dibayarPada, catatan: input.catatan };
    await tx
      .insert(feePayments)
      .values({ bulan: input.bulan, ...nilai })
      .onConflictDoUpdate({ target: feePayments.bulan, set: nilai });
    await tx.insert(auditLog).values({ olehUserId, aksi: "fee.dibayar", entitas: "fee_payments", entitasId: input.bulan, data: nilai });
  });
}

export async function batalkanTandaDibayar(db: Db, bulan: string, olehUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [lama] = await tx.select().from(feePayments).where(eq(feePayments.bulan, bulan)).for("update");
    if (!lama?.dibayarPada) return;
    await tx.update(feePayments).set({ dibayarPada: null }).where(eq(feePayments.bulan, bulan));
    await tx.insert(auditLog).values({
      olehUserId,
      aksi: "fee.dibayar_dibatalkan",
      entitas: "fee_payments",
      entitasId: bulan,
      data: { total: lama.total, dibayarPada: lama.dibayarPada },
    });
  });
}
