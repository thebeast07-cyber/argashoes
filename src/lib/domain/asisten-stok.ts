// Asisten tanya stok (docs/asisten-ai.md). Fungsi murni.
// Gemini hanya menerjemahkan pertanyaan jadi Maksud. Pencocokan dan semua angka stok dihitung di sini dari data DB,
// jadi jawaban tidak pernah memuat angka karangan AI.

import { bandingkanSize, nilaiSize, normalisasiSize, statusStok, type AmbangStok, type StatusStok } from "./stok";

export type ModelStok = { id: string; brand: string; nama: string; aktif: boolean };
export type VarianStok = { productId: string; size: string; stok: number };

export type JenisMaksud = "sisa_model" | "cari_size" | "mau_habis" | "tidak_paham";
export type Maksud = { jenis: JenisMaksud; model: string[]; size: string | null };

export const BATAS_PERTANYAAN = 300;
// Model yang disebut AI dibatasi supaya pertanyaan yang terlalu umum ("nike sisa berapa?") tidak jadi daftar panjang.
export const BATAS_MODEL_DISEBUT = 5;
const BATAS_BARIS = 30;

/** Daftar model untuk prompt: nomor urut pendek, bukan id DB. AI menjawab dengan nomor ini. */
export function daftarUntukAi(model: readonly ModelStok[]): string {
  return model.map((m, i) => `${i + 1}. ${m.brand} ${m.nama}`).join("\n");
}

/** Balasan AI diperlakukan sebagai input tak tepercaya: bentuk dicek, nomor di luar daftar dibuang. */
export function bacaMaksud(mentah: unknown, model: readonly ModelStok[]): Maksud {
  const tidakPaham: Maksud = { jenis: "tidak_paham", model: [], size: null };
  if (!mentah || typeof mentah !== "object") return tidakPaham;
  const o = mentah as Record<string, unknown>;
  const jenis = o.jenis;
  if (jenis !== "sisa_model" && jenis !== "cari_size" && jenis !== "mau_habis") return tidakPaham;

  const nomor = Array.isArray(o.nomorModel) ? o.nomorModel : [];
  const id = [
    ...new Set(nomor.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= model.length).map((n) => model[n - 1].id)),
  ].slice(0, BATAS_MODEL_DISEBUT);
  const size = typeof o.size === "string" && normalisasiSize(o.size) ? normalisasiSize(o.size) : null;

  if (jenis === "cari_size" && !size) return tidakPaham;
  return { jenis, model: id, size };
}

export type SizeStok = { size: string; stok: number; status: StatusStok };
export type BarisModel = { model: ModelStok; size: SizeStok[]; total: number };

export type Jawaban =
  | { jenis: "model"; baris: BarisModel[]; size: string | null }
  | { jenis: "size"; size: string; baris: { model: ModelStok; stok: number; status: StatusStok }[]; lebih: number }
  | { jenis: "mau_habis"; baris: BarisModel[]; lebih: number }
  | { jenis: "tidak_ketemu"; pesan: string }
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

  return { jenis: "tidak_paham" };
}

/** Batas pertanyaan per akun: maksimal `batas` dalam `jendelaMs` terakhir. Mengembalikan riwayat baru kalau boleh. */
export function cekBatasTanya(riwayat: readonly number[], sekarang: number, batas = 10, jendelaMs = 60_000): number[] | null {
  const baru = riwayat.filter((t) => sekarang - t < jendelaMs);
  if (baru.length >= batas) return null;
  return [...baru, sekarang];
}
