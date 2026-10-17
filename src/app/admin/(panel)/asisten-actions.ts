"use server";

import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { AsistenTidakTersedia, tanyaGemini } from "@/lib/asisten/gemini";
import {
  BATAS_PERTANYAAN,
  bacaMaksud,
  bacaRiwayat,
  cekBatasTanya,
  daftarUntukAi,
  jawabStok,
  ringkasJawaban,
  type Jawaban,
} from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { dataStokAsisten, getAmbangStok } from "@/lib/produk/data";

export type HasilTanya = { jawaban?: Jawaban; ringkas?: string; ambang?: AmbangStok; galat?: string };

// Di memori per instance, sama seperti batas kirim per IP di checkout: cukup untuk mencegah salah tekan
// menghabiskan kuota gratis, bukan pengaman yang ketat.
const riwayatTanya = new Map<string, number[]>();

export async function tanyaAsisten(pertanyaanMentah: string, riwayatMentah: unknown): Promise<HasilTanya> {
  const user = await wajibIzin("produk.kelola");
  const pertanyaan = String(pertanyaanMentah ?? "").trim().slice(0, BATAS_PERTANYAAN);
  if (!pertanyaan) return { galat: "Tulis pertanyaannya dulu." };

  const boleh = cekBatasTanya(riwayatTanya.get(user.id) ?? [], Date.now());
  if (!boleh) return { galat: "Terlalu banyak pertanyaan dalam semenit. Tunggu sebentar, lalu tanya lagi." };
  riwayatTanya.set(user.id, boleh);

  const db = await getDb();
  const [{ model, varian }, ambang] = await Promise.all([dataStokAsisten(db), getAmbangStok(db)]);

  try {
    const mentah = await tanyaGemini(pertanyaan, bacaRiwayat(riwayatMentah), daftarUntukAi(model));
    const jawaban = jawabStok(bacaMaksud(mentah, model), model, varian, ambang);
    return { jawaban, ringkas: ringkasJawaban(jawaban), ambang };
  } catch (e) {
    if (e instanceof AsistenTidakTersedia) return { galat: e.message };
    console.error("Asisten gagal", e);
    return { galat: "Asisten sedang bermasalah. Cari stok lewat daftar produk dulu." };
  }
}
