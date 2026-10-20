"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { AsistenTidakTersedia, tanyaGemini } from "@/lib/asisten/gemini";
import { bacaKonfirmasiStok, bacaPerintahStok, rencanaStokAsisten, type RencanaStokAsisten } from "@/lib/domain/asisten-aksi";
import { BATAS_PERTANYAAN, bacaBalasan, bacaRiwayat, dataModel, ringkasanUntukAi, type BarisModel } from "@/lib/domain/asisten-stok";
import { bacaPerintahPesan, idAkunSah, penerimaPesan, rapikanIsiPesan, ringkasanAkunUntukAi, type RencanaPesan } from "@/lib/domain/pesan-admin";
import type { AmbangStok } from "@/lib/domain/stok";
import { dataStokAsisten, getAmbangStok } from "@/lib/produk/data";
import { ubahStokLewatAsisten } from "@/lib/produk/mutasi";
import { bukaPesanBaru, daftarAkunPesan, jumlahPesanBaru, kirimPesan, type PesanMasuk } from "@/lib/pesan/data";

export type HasilTanya = {
  teks?: string;
  data?: BarisModel[];
  ambang?: AmbangStok;
  rencana?: RencanaStokAsisten;
  pesan?: { rencana: RencanaPesan } | { masalah: string };
  galat?: string;
};

// Tanpa batas per menit untuk admin dan pemilik (keputusan pemilik). Yang membatasi hanya kuota harian Gemini.
export async function tanyaAsisten(pertanyaanMentah: string, riwayatMentah: unknown): Promise<HasilTanya> {
  const user = await wajibIzin("produk.kelola");
  const pertanyaan = String(pertanyaanMentah ?? "").trim().slice(0, BATAS_PERTANYAAN);
  if (!pertanyaan) return { galat: "Tulis pertanyaannya dulu." };

  const db = await getDb();
  const [{ model, varian }, ambang, akun] = await Promise.all([dataStokAsisten(db), getAmbangStok(db), daftarAkunPesan(db)]);
  const penerima = penerimaPesan(akun, user.id);

  try {
    const dataToko = `${ringkasanUntukAi(model, varian, ambang)}\n\nAKUN LAIN (untuk kirimPesan):\n${ringkasanAkunUntukAi(penerima)}`;
    const mentah = await tanyaGemini(pertanyaan, bacaRiwayat(riwayatMentah), dataToko);
    const balasan = bacaBalasan(mentah, model);
    if (!balasan) return { galat: "Balasan Gemini tidak terbaca. Coba kirim ulang." };
    const rencana = rencanaStokAsisten(bacaPerintahStok((mentah as { ubahStok?: unknown }).ubahStok), model, varian) ?? undefined;
    const pesan = bacaPerintahPesan((mentah as { kirimPesan?: unknown }).kirimPesan, penerima) ?? undefined;
    return { teks: balasan.teks, data: dataModel(balasan.model, model, varian, ambang), ambang, rencana, pesan };
  } catch (e) {
    if (e instanceof AsistenTidakTersedia) return { galat: e.message };
    console.error("Asisten gagal", e);
    return { galat: "Asisten sedang bermasalah. Coba lagi sebentar lagi." };
  }
}

export type HasilSimpanStok = { sukses?: string; galat?: string };

/** Tombol Simpan stok di kartu konfirmasi. Tidak memanggil Gemini lagi. */
export async function simpanStokAsisten(perubahanMentah: unknown): Promise<HasilSimpanStok> {
  const user = await wajibIzin("produk.kelola");
  const perubahan = bacaKonfirmasiStok(perubahanMentah);
  if (!perubahan) return { galat: "Isi kartu tidak terbaca. Minta ulang ke asisten." };

  const hasil = await ubahStokLewatAsisten(await getDb(), perubahan, user.id);
  if (hasil === "berubah") return { galat: "Stok sudah berubah sejak kartu ini dibuat, jadi tidak disimpan. Minta ulang supaya angkanya terbaru." };
  if (hasil === "tidak_ada") return { galat: "Ada size yang sudah dihapus, jadi tidak disimpan. Minta ulang ke asisten." };
  revalidatePath("/", "layout");
  return { sukses: `Tersimpan. Stok ${perubahan.length} size sudah diperbarui.` };
}

// --- Pesan antar akun ------------------------------------------------------------

export type HasilKirimPesan = { sukses?: string; galat?: string };

/** Dari kartu konfirmasi Gemini maupun form Kirim pesan. Tidak memanggil Gemini. */
export async function kirimPesanAdmin(keId: unknown, isiMentah: unknown): Promise<HasilKirimPesan> {
  const user = await wajibIzin("produk.kelola");
  const isi = rapikanIsiPesan(isiMentah);
  if (!isi) return { galat: "Tulis pesannya dulu, maksimal 1.000 karakter." };
  if (!idAkunSah(keId)) return { galat: "Pilih penerimanya dulu." };
  const hasil = await kirimPesan(await getDb(), user.id, keId, isi);
  if (hasil === "tidak_ada") return { galat: "Akun penerima tidak ditemukan atau sudah nonaktif." };
  return { sukses: "Terkirim. Muncul di tombol Asisten penerima saat ia membuka admin." };
}

export async function cekPesanBaru(): Promise<number> {
  const user = await wajibIzin("produk.kelola");
  return jumlahPesanBaru(await getDb(), user.id);
}

export async function ambilPesanBaru(): Promise<PesanMasuk[]> {
  const user = await wajibIzin("produk.kelola");
  return bukaPesanBaru(await getDb(), user.id);
}
