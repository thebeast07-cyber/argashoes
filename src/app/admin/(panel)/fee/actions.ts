"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { isBulan, tanggalWib } from "@/lib/domain/laporan-fee";
import { rekapBulan } from "@/lib/fee/data";
import { batalkanTandaDibayar, tandaiFeeDibayar } from "@/lib/fee/mutasi";

export type StateFee = { error?: string; sukses?: string };

function segarkan(bulan: string) {
  revalidatePath(`/admin/fee/${bulan}`);
  revalidatePath("/admin/fee");
}

/** Total diambil dari rekap di server saat itu, bukan dari form. */
export async function tandaiDibayar(bulan: string, _prev: StateFee, form: FormData): Promise<StateFee> {
  const user = await wajibIzin("fee.laporan");
  if (!isBulan(bulan)) return { error: "Bulan tidak dikenal." };
  const tanggal = tanggalWib(String(form.get("tanggal") ?? ""));
  if (!tanggal) return { error: "Isi tanggal pembayaran." };
  if (tanggal.getTime() > Date.now() + 24 * 60 * 60_000) return { error: "Tanggal pembayaran tidak boleh di masa depan." };
  const db = await getDb();
  const rekap = await rekapBulan(db, bulan);
  if (rekap.totalFee === 0) return { error: "Bulan ini belum ada fee." };
  const catatan = String(form.get("catatan") ?? "").trim().slice(0, 300) || null;
  await tandaiFeeDibayar(db, { bulan, total: rekap.totalFee, dibayarPada: tanggal, catatan }, user.id);
  segarkan(bulan);
  return { sukses: "Ditandai sudah dibayar." };
}

export async function batalkanDibayar(bulan: string): Promise<StateFee> {
  const user = await wajibIzin("fee.laporan");
  if (!isBulan(bulan)) return { error: "Bulan tidak dikenal." };
  await batalkanTandaDibayar(await getDb(), bulan, user.id);
  segarkan(bulan);
  return { sukses: "Tanda dibayar dibatalkan." };
}
