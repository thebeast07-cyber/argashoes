"use server";

import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { AsistenTidakTersedia, tanyaGemini } from "@/lib/asisten/gemini";
import { BATAS_PERTANYAAN, bacaBalasan, bacaRiwayat, dataModel, ringkasanUntukAi, type BarisModel } from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { dataStokAsisten, getAmbangStok } from "@/lib/produk/data";

export type HasilTanya = { teks?: string; data?: BarisModel[]; ambang?: AmbangStok; galat?: string };

// Tanpa batas per menit untuk admin dan pemilik (keputusan pemilik). Yang membatasi hanya kuota harian Gemini.
export async function tanyaAsisten(pertanyaanMentah: string, riwayatMentah: unknown): Promise<HasilTanya> {
  await wajibIzin("produk.kelola");
  const pertanyaan = String(pertanyaanMentah ?? "").trim().slice(0, BATAS_PERTANYAAN);
  if (!pertanyaan) return { galat: "Tulis pertanyaannya dulu." };

  const db = await getDb();
  const [{ model, varian }, ambang] = await Promise.all([dataStokAsisten(db), getAmbangStok(db)]);

  try {
    const mentah = await tanyaGemini(pertanyaan, bacaRiwayat(riwayatMentah), ringkasanUntukAi(model, varian, ambang));
    const balasan = bacaBalasan(mentah, model);
    if (!balasan) return { galat: "Balasan Gemini tidak terbaca. Coba kirim ulang." };
    return { teks: balasan.teks, data: dataModel(balasan.model, model, varian, ambang), ambang };
  } catch (e) {
    if (e instanceof AsistenTidakTersedia) return { galat: e.message };
    console.error("Asisten gagal", e);
    return { galat: "Asisten sedang bermasalah. Coba lagi sebentar lagi." };
  }
}
