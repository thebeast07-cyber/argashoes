// Asisten admin (docs/asisten-ai.md). Fungsi murni.
// Untuk pertanyaan stok, Gemini hanya menerjemahkan jadi Maksud. Pencocokan dan semua angka stok dihitung di sini
// dari data DB, jadi jawaban stok tidak pernah memuat angka karangan AI. Hanya obrolan umum yang berisi teks dari AI.

import { bandingkanSize, nilaiSize, normalisasiSize, statusStok, type AmbangStok, type StatusStok } from "./stok";

export type ModelStok = { id: string; brand: string; nama: string; aktif: boolean };
export type VarianStok = { productId: string; size: string; stok: number };

export type JenisMaksud = "sisa_model" | "cari_size" | "mau_habis" | "obrolan" | "ubah_data" | "tidak_paham";
export type Maksud = { jenis: JenisMaksud; model: string[]; size: string | null; balasan: string | null };

export type Giliran = { peran: "user" | "asisten"; teks: string };

export const BATAS_PERTANYAAN = 300;
// Model yang disebut AI dibatasi supaya pertanyaan yang terlalu umum ("nike sisa berapa?") tidak jadi daftar panjang.
export const BATAS_MODEL_DISEBUT = 5;
const BATAS_BARIS = 30;
export const BATAS_BALASAN = 2000;
// Konteks obrolan yang dikirim ulang ke Gemini: cukup untuk "kalau size 41?" setelah tanya satu model.
export const BATAS_RIWAYAT = 6;

/** Daftar model untuk prompt: nomor urut pendek, bukan id DB. AI menjawab dengan nomor ini. */
export function daftarUntukAi(model: readonly ModelStok[]): string {
  return model.map((m, i) => `${i + 1}. ${m.brand} ${m.nama}`).join("\n");
}

/** Balasan AI diperlakukan sebagai input tak tepercaya: bentuk dicek, nomor di luar daftar dibuang. */
export function bacaMaksud(mentah: unknown, model: readonly ModelStok[]): Maksud {
  const tidakPaham: Maksud = { jenis: "tidak_paham", model: [], size: null, balasan: null };
  if (!mentah || typeof mentah !== "object") return tidakPaham;
  const o = mentah as Record<string, unknown>;
  const jenis = o.jenis;
  if (jenis === "ubah_data") return { ...tidakPaham, jenis };
  if (jenis === "obrolan") {
    const balasan = typeof o.balasan === "string" ? o.balasan.trim().slice(0, BATAS_BALASAN) : "";
    return balasan ? { ...tidakPaham, jenis, balasan } : tidakPaham;
  }
  if (jenis !== "sisa_model" && jenis !== "cari_size" && jenis !== "mau_habis") return tidakPaham;

  const nomor = Array.isArray(o.nomorModel) ? o.nomorModel : [];
  const id = [
    ...new Set(nomor.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= model.length).map((n) => model[n - 1].id)),
  ].slice(0, BATAS_MODEL_DISEBUT);
  const size = typeof o.size === "string" && normalisasiSize(o.size) ? normalisasiSize(o.size) : null;

  if (jenis === "cari_size" && !size) return tidakPaham;
  return { jenis, model: id, size, balasan: null };
}

export type SizeStok = { size: string; stok: number; status: StatusStok };
export type BarisModel = { model: ModelStok; size: SizeStok[]; total: number };

export type Jawaban =
  | { jenis: "model"; baris: BarisModel[]; size: string | null }
  | { jenis: "size"; size: string; baris: { model: ModelStok; stok: number; status: StatusStok }[]; lebih: number }
  | { jenis: "mau_habis"; baris: BarisModel[]; lebih: number }
  | { jenis: "tidak_ketemu"; pesan: string }
  | { jenis: "obrolan"; teks: string }
  | { jenis: "ubah_data" }
  | { jenis: "tidak_paham" };

/** "42" sama dengan "42.0" dan "42,0"; size teks dibandingkan tanpa beda huruf besar/kecil. */
export function sizeSama(a: string, b: string): boolean {
  const na = nilaiSize(a);
  const nb = nilaiSize(b);
  if (na !== null && nb !== null) return Math.abs(na - nb) < 0.01;
  return normalisasiSize(a).toLowerCase() === normalisasiSize(b).toLowerCase();
}

function urutModel(a: ModelStok, b: ModelStok): number {
  return Number(b.aktif) - Number(a.aktif) || a.brand.localeCompare(b.brand) || a.nama.localeCompare(b.nama);
}

export function jawabStok(maksud: Maksud, model: readonly ModelStok[], varian: readonly VarianStok[], ambang: AmbangStok): Jawaban {
  const perModel = new Map<string, VarianStok[]>();
  for (const v of varian) perModel.set(v.productId, [...(perModel.get(v.productId) ?? []), v]);
  const ringkas = (m: ModelStok, saring?: (v: VarianStok) => boolean): BarisModel => {
    const size = (perModel.get(m.id) ?? [])
      .filter((v) => !saring || saring(v))
      .sort((a, b) => bandingkanSize(a.size, b.size))
      .map((v) => ({ size: v.size, stok: v.stok, status: statusStok(v.stok, ambang) }));
    return { model: m, size, total: size.reduce((n, s) => n + s.stok, 0) };
  };

  if (maksud.jenis === "sisa_model") {
    const dipilih = model.filter((m) => maksud.model.includes(m.id)).sort(urutModel);
    if (dipilih.length === 0) return { jenis: "tidak_ketemu", pesan: "Model itu tidak ketemu di katalog. Coba tulis brand dan nama lebih lengkap." };
    const size = maksud.size;
    return { jenis: "model", size, baris: dipilih.map((m) => ringkas(m, size ? (v) => sizeSama(v.size, size) : undefined)) };
  }

  if (maksud.jenis === "cari_size" && maksud.size) {
    const size = maksud.size;
    const semua = model
      .flatMap((m) =>
        (perModel.get(m.id) ?? []).filter((v) => v.stok > 0 && sizeSama(v.size, size)).map((v) => ({ model: m, stok: v.stok, status: statusStok(v.stok, ambang) })),
      )
      .sort((a, b) => urutModel(a.model, b.model));
    if (semua.length === 0) return { jenis: "tidak_ketemu", pesan: `Tidak ada model dengan size ${size} yang masih ada stoknya.` };
    return { jenis: "size", size, baris: semua.slice(0, BATAS_BARIS), lebih: Math.max(0, semua.length - BATAS_BARIS) };
  }

  if (maksud.jenis === "mau_habis") {
    const sasaran = maksud.model.length > 0 ? model.filter((m) => maksud.model.includes(m.id)) : model;
    const semua = [...sasaran]
      .sort(urutModel)
      .map((m) => ringkas(m, (v) => statusStok(v.stok, ambang) !== "ready"))
      .filter((b) => b.size.length > 0);
    if (semua.length === 0) return { jenis: "tidak_ketemu", pesan: "Semua size masih Ready." };
    return { jenis: "mau_habis", baris: semua.slice(0, BATAS_BARIS), lebih: Math.max(0, semua.length - BATAS_BARIS) };
  }

  if (maksud.jenis === "obrolan" && maksud.balasan) return { jenis: "obrolan", teks: maksud.balasan };
  if (maksud.jenis === "ubah_data") return { jenis: "ubah_data" };
  return { jenis: "tidak_paham" };
}

export const TEKS_UBAH_DATA = "Aku cuma bisa membaca stok, tidak bisa mengubah data. Ubah stok atau produk lewat halaman Produk.";
export const TEKS_TIDAK_PAHAM = "Maaf, aku belum menangkap maksudnya. Coba tulis ulang dengan kalimat lain.";

function ringkasSize(b: BarisModel): string {
  return b.size.map((s) => `${s.size} ${s.stok > 0 ? `(${s.stok})` : "habis"}`).join(", ");
}

/** Teks pendek jawaban untuk riwayat obrolan yang dikirim ulang ke Gemini, supaya pertanyaan lanjutan nyambung. */
export function ringkasJawaban(j: Jawaban): string {
  switch (j.jenis) {
    case "model":
      return j.baris.map((b) => `${b.model.brand} ${b.model.nama}: ${ringkasSize(b) || "belum ada size"}`).join("; ");
    case "size":
      return `Size ${j.size} ada di: ${j.baris.map((b) => `${b.model.brand} ${b.model.nama} (${b.stok})`).join(", ")}`;
    case "mau_habis":
      return `Mau habis: ${j.baris.map((b) => `${b.model.brand} ${b.model.nama} ${ringkasSize(b)}`).join("; ")}`;
    case "tidak_ketemu":
      return j.pesan;
    case "obrolan":
      return j.teks;
    case "ubah_data":
      return TEKS_UBAH_DATA;
    case "tidak_paham":
      return TEKS_TIDAK_PAHAM;
  }
}

/** Riwayat dari browser dianggap input tak tepercaya: bentuk dicek, dipotong ke giliran terakhir. */
export function bacaRiwayat(mentah: unknown): Giliran[] {
  if (!Array.isArray(mentah)) return [];
  return mentah
    .filter((g): g is Giliran => Boolean(g) && (g.peran === "user" || g.peran === "asisten") && typeof g.teks === "string" && g.teks.trim() !== "")
    .slice(-BATAS_RIWAYAT)
    .map((g) => ({ peran: g.peran, teks: g.teks.slice(0, BATAS_BALASAN) }));
}

/** Batas pertanyaan per akun: maksimal `batas` dalam `jendelaMs` terakhir. Mengembalikan riwayat baru kalau boleh. */
export function cekBatasTanya(riwayat: readonly number[], sekarang: number, batas = 10, jendelaMs = 60_000): number[] | null {
  const baru = riwayat.filter((t) => sekarang - t < jendelaMs);
  if (baru.length >= batas) return null;
  return [...baru, sekarang];
}
