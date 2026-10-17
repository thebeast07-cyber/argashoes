"use server";

import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { AsistenTidakTersedia, terjemahkanPertanyaan } from "@/lib/asisten/gemini";
import { BATAS_PERTANYAAN, bacaMaksud, cekBatasTanya, daftarUntukAi, jawabStok, type Jawaban } from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { dataStokAsisten, getAmbangStok } from "@/lib/produk/data";

export type HasilTanya = { pertanyaan: string; jawaban?: Jawaban; ambang?: AmbangStok; galat?: string };

// Di memori per instance, sama seperti batas kirim per IP di checkout: cukup untuk mencegah salah tekan
// menghabiskan kuota gratis, bukan pengaman yang ketat.
const riwayatTanya = new Map<string, number[]>();

export async function tanyaStok(pertanyaanMentah: string): Promise<HasilTanya> {
  const user = await wajibIzin("produk.kelola");
  const pertanyaan = String(pertanyaanMentah ?? "").trim().slice(0, BATAS_PERTANYAAN);
  if (!pertanyaan) return { pertanyaan, galat: "Tulis pertanyaannya dulu." };

  const boleh = cekBatasTanya(riwayatTanya.get(user.id) ?? [], Date.now());
  if (!boleh) return { pertanyaan, galat: "Terlalu banyak pertanyaan dalam semenit. Tunggu sebentar, lalu tanya lagi." };
  riwayatTanya.set(user.id, boleh);

  const db = await getDb();
  const [{ model, varian }, ambang] = await Promise.all([dataStokAsisten(db), getAmbangStok(db)]);
  if (model.length === 0) return { pertanyaan, galat: "Katalog masih kosong. Tambah produk dulu lewat Model baru atau Import." };

  try {
    const mentah = await terjemahkanPertanyaan(pertanyaan, daftarUntukAi(model));
    return { pertanyaan, jawaban: jawabStok(bacaMaksud(mentah, model), model, varian, ambang), ambang };
  } catch (e) {
    if (e instanceof AsistenTidakTersedia) return { pertanyaan, galat: e.message };
    console.error("Asisten tanya stok gagal", e);
    return { pertanyaan, galat: "Asisten sedang bermasalah. Cari lewat daftar produk dulu." };
  }
}
