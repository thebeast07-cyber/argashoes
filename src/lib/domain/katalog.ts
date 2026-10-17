// Katalog publik: membaca pencarian dari URL, menyaring, mengurutkan, dan meringkas size per kartu. Fungsi murni.

import { parseRupiah } from "./produk";
import { bandingkanSize, statusStok, type AmbangStok } from "./stok";

export const PER_HALAMAN_KATALOG = 24;

export const URUT_KATALOG = ["baru", "murah", "mahal"] as const;
export type UrutKatalog = (typeof URUT_KATALOG)[number];
export const LABEL_URUT: Record<UrutKatalog, string> = { baru: "Terbaru", murah: "Harga terendah", mahal: "Harga tertinggi" };

export type CariKatalog = {
  size?: string;
  brand?: string;
  kategori?: string;
  q?: string;
  hargaMin?: number;
  hargaMax?: number;
  urut: UrutKatalog;
  hal: number;
};

export type VarianKatalog = { size: string; stok: number };

export type ItemKatalog = {
  id: string;
  nama: string;
  brand: string;
  kategori: string | null;
  harga: number;
  hargaCoret: number | null;
  sampul: string | null;
  dibuat: Date;
  varian: VarianKatalog[];
};

type ParamUrl = Record<string, string | string[] | undefined>;

function teks(nilai: string | string[] | undefined): string | undefined {
  const t = (Array.isArray(nilai) ? nilai[0] : nilai)?.trim();
  return t ? t.slice(0, 60) : undefined;
}

/** Isi URL datang dari siapa saja: nilai aneh diabaikan, bukan membuat halaman gagal. */
export function parseCariKatalog(p: ParamUrl): CariKatalog {
  const harga = (k: string) => {
    const t = teks(p[k]);
    return t ? (parseRupiah(t) ?? undefined) : undefined;
  };
  let hargaMin = harga("min");
  let hargaMax = harga("maks");
  if (hargaMin !== undefined && hargaMax !== undefined && hargaMin > hargaMax) [hargaMin, hargaMax] = [hargaMax, hargaMin];
  const urut = teks(p.urut);
  const hal = Number(teks(p.hal));
  const cari: CariKatalog = {
    size: teks(p.size),
    brand: teks(p.brand),
    kategori: teks(p.kategori),
    q: teks(p.q),
    hargaMin,
    hargaMax,
    urut: (URUT_KATALOG as readonly string[]).includes(urut ?? "") ? (urut as UrutKatalog) : "baru",
    hal: Number.isInteger(hal) && hal > 1 ? hal : 1,
  };
  for (const k of Object.keys(cari) as (keyof CariKatalog)[]) if (cari[k] === undefined) delete cari[k];
  return cari;
}

const stokDi = (item: ItemKatalog, size: string) => item.varian.find((v) => v.size === size)?.stok ?? 0;

/**
 * Model tanpa size tidak tampil (tidak bisa dipesan). Saat size dipilih, hanya model yang masih ada stoknya di size itu,
 * diurutkan dari stok terbanyak supaya yang paling aman dipesan tampil dulu, kecuali pembeli memilih urut harga.
 */
export function saringKatalog(items: readonly ItemKatalog[], cari: CariKatalog): ItemKatalog[] {
  const q = cari.q?.toLowerCase();
  const hasil = items.filter(
    (it) =>
      it.varian.length > 0 &&
      (!cari.size || stokDi(it, cari.size) > 0) &&
      (!cari.brand || it.brand === cari.brand) &&
      (!cari.kategori || it.kategori === cari.kategori) &&
      (!q || `${it.brand} ${it.nama}`.toLowerCase().includes(q)) &&
      (cari.hargaMin === undefined || it.harga >= cari.hargaMin) &&
      (cari.hargaMax === undefined || it.harga <= cari.hargaMax),
  );
  const nama = (a: ItemKatalog, b: ItemKatalog) => a.brand.localeCompare(b.brand) || a.nama.localeCompare(b.nama);
  return hasil.sort((a, b) => {
    if (cari.urut === "murah") return a.harga - b.harga || nama(a, b);
    if (cari.urut === "mahal") return b.harga - a.harga || nama(a, b);
    if (cari.size) return stokDi(b, cari.size) - stokDi(a, cari.size) || nama(a, b);
    return b.dibuat.getTime() - a.dibuat.getTime() || nama(a, b);
  });
}

export function halamanKatalog<T>(items: readonly T[], hal: number, perHalaman = PER_HALAMAN_KATALOG) {
  const totalHalaman = Math.max(1, Math.ceil(items.length / perHalaman));
  const h = Math.min(Math.max(1, hal), totalHalaman);
  return { items: items.slice((h - 1) * perHalaman, h * perHalaman), total: items.length, hal: h, totalHalaman };
}

/** Pilihan untuk filter: hanya size yang masih ada stoknya di model mana pun, brand dan kategori yang benar-benar ada. */
export function opsiKatalog(items: readonly ItemKatalog[]) {
  const size = new Set<string>();
  const brand = new Set<string>();
  const kategori = new Set<string>();
  for (const it of items) {
    if (it.varian.length === 0) continue;
    brand.add(it.brand);
    if (it.kategori) kategori.add(it.kategori);
    for (const v of it.varian) if (v.stok > 0) size.add(v.size);
  }
  const alfabet = (a: string, b: string) => a.localeCompare(b, "id");
  return { size: [...size].sort(bandingkanSize), brand: [...brand].sort(alfabet), kategori: [...kategori].sort(alfabet) };
}

/**
 * Size di kartu: hanya yang masih ada stoknya, beberapa pertama saja, plus jumlah sisanya.
 * Size sisa sedikit dikembalikan terpisah supaya bisa ditulis, bukan cuma diwarnai (DESIGN.md).
 */
export function ringkasSizeKartu(varian: readonly VarianKatalog[], ambang: AmbangStok, maks = 4) {
  const ada = varian.filter((v) => v.stok > 0).sort((a, b) => bandingkanSize(a.size, b.size));
  const tampil = ada.slice(0, maks).map((v) => ({ size: v.size, sisaSedikit: statusStok(v.stok, ambang) === "sisa_sedikit" }));
  return { tampil, lebih: ada.length - tampil.length, sisaSedikit: tampil.filter((v) => v.sisaSedikit).map((v) => v.size) };
}

/** URL katalog dengan sebagian pencarian diubah. `undefined` menghapus parameter; halaman kembali ke 1 kecuali diubah. */
export function urlKatalog(cari: CariKatalog, ubah: Partial<CariKatalog> = {}): string {
  const c = { ...cari, hal: 1, ...ubah };
  const p = new URLSearchParams();
  if (c.size) p.set("size", c.size);
  if (c.brand) p.set("brand", c.brand);
  if (c.kategori) p.set("kategori", c.kategori);
  if (c.q) p.set("q", c.q);
  if (c.hargaMin !== undefined) p.set("min", String(c.hargaMin));
  if (c.hargaMax !== undefined) p.set("maks", String(c.hargaMax));
  if (c.urut !== "baru") p.set("urut", c.urut);
  if (c.hal > 1) p.set("hal", String(c.hal));
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

/**
 * Nama brand untuk kalimat di halaman: "Nike", "Nike dan Adidas", "Adidas, New Balance, dan Nike".
 * Lebih dari 4 brand (atau belum ada): null, supaya kalimatnya umum dan tidak jadi daftar panjang.
 */
export function kalimatMerek(brand: readonly string[], maks = 4): string | null {
  if (brand.length === 0 || brand.length > maks) return null;
  if (brand.length === 1) return brand[0];
  return `${brand.slice(0, -1).join(", ")}${brand.length > 2 ? "," : ""} dan ${brand[brand.length - 1]}`;
}
