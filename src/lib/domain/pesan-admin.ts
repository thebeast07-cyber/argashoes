// Pesan antar akun admin lewat Asisten. Fungsi murni.
// Pemilik web dan owner saling menitip pesan lewat Asisten: penerima melihat angka di tombol Asisten dan pesannya
// muncul saat panel dibuka. Pesan dikirim lewat kartu konfirmasi (disusun Gemini) atau ditulis langsung tanpa AI.

import { LABEL_PERAN, type Peran } from "@/lib/auth/roles";

export const BATAS_PESAN = 1000;
export const BATAS_PESAN_DIBUKA = 20;

export type AkunPesan = { id: string; nama: string; peran: Peran };
export type RencanaPesan = { keId: string; keNama: string; kePeran: string; isi: string };

/** Spasi di ujung dibuang dan baris kosong beruntun diringkas. null kalau kosong atau terlalu panjang. */
export function rapikanIsiPesan(isi: unknown): string | null {
  if (typeof isi !== "string") return null;
  const rapi = isi.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return rapi && rapi.length <= BATAS_PESAN ? rapi : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id penerima datang dari browser; yang bukan uuid ditolak sebelum menyentuh database. */
export function idAkunSah(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

/** Akun yang bisa dikirimi pesan: semua akun aktif kecuali diri sendiri. */
export function penerimaPesan(akun: readonly AkunPesan[], diriId: string): AkunPesan[] {
  return akun.filter((a) => a.id !== diriId);
}

/** Daftar untuk prompt. Nomor urut ini yang disebut Gemini di kirimPesan; email tidak ikut dikirim. */
export function ringkasanAkunUntukAi(penerima: readonly AkunPesan[]): string {
  if (penerima.length === 0) return "Belum ada akun lain.";
  return penerima.map((a, i) => `${i + 1}. ${a.nama} (${LABEL_PERAN[a.peran]})`).join("\n");
}

/** kirimPesan dari Gemini dianggap input tak tepercaya. null kalau Gemini tidak menyiapkan pesan. */
export function bacaPerintahPesan(mentah: unknown, penerima: readonly AkunPesan[]): { rencana: RencanaPesan } | { masalah: string } | null {
  if (!mentah || typeof mentah !== "object") return null;
  const o = mentah as { nomorAkun?: unknown; isi?: unknown };
  if (o.nomorAkun === undefined && o.isi === undefined) return null;
  const akun = Number.isInteger(o.nomorAkun) ? penerima[(o.nomorAkun as number) - 1] : undefined;
  if (!akun) return { masalah: "Penerimanya tidak ditemukan di daftar akun. Sebut namanya, atau tulis pesan langsung lewat Kirim pesan." };
  const isi = rapikanIsiPesan(o.isi);
  if (!isi) return { masalah: `Isi pesan kosong atau lebih dari ${BATAS_PESAN} karakter.` };
  return { rencana: { keId: akun.id, keNama: akun.nama, kePeran: LABEL_PERAN[akun.peran], isi } };
}
