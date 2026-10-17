// Asisten admin (docs/asisten-ai.md). Fungsi murni.
// Gemini menerima ringkasan katalog dan stok terbaru lalu menjawab bebas. Totalnya dihitung di sini supaya AI
// tinggal membaca, bukan menjumlah. Model yang dibahas AI ditampilkan lagi dari data DB sebagai pembanding.

import { bandingkanSize, statusStok, type AmbangStok, type StatusStok } from "./stok";

export type ModelStok = {
  id: string;
  brand: string;
  nama: string;
  kategori: string | null;
  harga: number;
  hargaCoret: number | null;
  aktif: boolean;
};
export type VarianStok = { productId: string; size: string; stok: number };
export type Giliran = { peran: "user" | "asisten"; teks: string };

export const BATAS_PERTANYAAN = 2000;
export const BATAS_BALASAN = 6000;
export const BATAS_RIWAYAT = 12;
export const BATAS_MODEL_DISEBUT = 5;

export type SizeStok = { size: string; stok: number; status: StatusStok };
export type BarisModel = { model: ModelStok; size: SizeStok[]; total: number };

function barisModel(m: ModelStok, varian: readonly VarianStok[], ambang: AmbangStok): BarisModel {
  const size = varian
    .filter((v) => v.productId === m.id)
    .sort((a, b) => bandingkanSize(a.size, b.size))
    .map((v) => ({ size: v.size, stok: v.stok, status: statusStok(v.stok, ambang) }));
  return { model: m, size, total: size.reduce((n, s) => n + s.stok, 0) };
}

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

/** Data untuk prompt. Model diberi nomor urut pendek; AI menyebut nomor ini untuk model yang dibahas. */
export function ringkasanUntukAi(model: readonly ModelStok[], varian: readonly VarianStok[], ambang: AmbangStok): string {
  const baris = model.map((m) => barisModel(m, varian, ambang));
  const semuaSize = baris.flatMap((b) => b.size);
  const kepala = [
    `Ambang stok: Ready kalau ${ambang.readyMin} pasang atau lebih, Sisa sedikit kalau 1 sampai ${ambang.readyMin - 1}, Habis kalau 0.`,
    `Total: ${model.length} model (${model.filter((m) => m.aktif).length} aktif tampil di web), ${semuaSize.length} size, ${semuaSize.reduce(
      (n, s) => n + s.stok,
      0,
    )} pasang. ${semuaSize.filter((s) => s.status === "habis").length} size habis, ${semuaSize.filter((s) => s.status === "sisa_sedikit").length} size sisa sedikit.`,
  ];
  const isi = baris.map((b, i) => {
    const m = b.model;
    const harga = m.hargaCoret ? `${rupiah(m.harga)} (coret ${rupiah(m.hargaCoret)})` : rupiah(m.harga);
    const size = b.size.map((s) => `${s.size}:${s.stok}`).join(" ") || "belum ada size";
    return `${i + 1}. ${m.brand} ${m.nama} | ${m.kategori ?? "tanpa kategori"} | ${harga} | ${m.aktif ? "aktif" : "nonaktif"} | total ${b.total} | ${size}`;
  });
  return [...kepala, "", "Format: nomor. brand nama | kategori | harga | status tampil | total pasang | size:stok", ...isi].join("\n");
}

/** Balasan AI diperlakukan sebagai input tak tepercaya: bentuk dicek, nomor di luar daftar dibuang. */
export function bacaBalasan(mentah: unknown, model: readonly ModelStok[]): { teks: string; model: string[] } | null {
  if (!mentah || typeof mentah !== "object") return null;
  const o = mentah as Record<string, unknown>;
  const teks = typeof o.balasan === "string" ? o.balasan.trim().slice(0, BATAS_BALASAN) : "";
  if (!teks) return null;
  const nomor = Array.isArray(o.nomorModel) ? o.nomorModel : [];
  const id = [
    ...new Set(nomor.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= model.length).map((n) => model[n - 1].id)),
  ].slice(0, BATAS_MODEL_DISEBUT);
  return { teks, model: id };
}

/** Kotak size dari DB untuk model yang dibahas AI, urutan mengikuti sebutan AI. */
export function dataModel(id: readonly string[], model: readonly ModelStok[], varian: readonly VarianStok[], ambang: AmbangStok): BarisModel[] {
  return id.flatMap((i) => {
    const m = model.find((x) => x.id === i);
    return m ? [barisModel(m, varian, ambang)] : [];
  });
}

/** Riwayat dari browser dianggap input tak tepercaya: bentuk dicek, dipotong ke giliran terakhir. */
export function bacaRiwayat(mentah: unknown): Giliran[] {
  if (!Array.isArray(mentah)) return [];
  return mentah
    .filter((g): g is Giliran => Boolean(g) && (g.peran === "user" || g.peran === "asisten") && typeof g.teks === "string" && g.teks.trim() !== "")
    .slice(-BATAS_RIWAYAT)
    .map((g) => ({ peran: g.peran, teks: g.teks.slice(0, BATAS_BALASAN) }));
}

export type PotonganTeks = { tebal: boolean; teks: string };
export type BarisTeks = { daftar: boolean; isi: PotonganTeks[] };

/** Format ringan untuk balasan: baris "- " jadi butir daftar, **teks** jadi tebal. Sisanya teks biasa. */
export function uraiTeks(teks: string): BarisTeks[] {
  return teks.split("\n").map((baris) => {
    const daftar = /^\s*[-*•]\s+/.test(baris);
    const bersih = daftar ? baris.replace(/^\s*[-*•]\s+/, "") : baris;
    const isi = bersih
      .split(/(\*\*[^*]+\*\*)/)
      .filter(Boolean)
      .map((p) => (p.startsWith("**") && p.endsWith("**") ? { tebal: true, teks: p.slice(2, -2) } : { tebal: false, teks: p }));
    return { daftar, isi };
  });
}
