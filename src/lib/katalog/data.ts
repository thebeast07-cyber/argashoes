import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { products, variants } from "@/db/schema";
import type { ItemKatalog } from "@/lib/domain/katalog";
import { rapikanHurufBesar } from "@/lib/domain/teks";
import { bandingkanSize } from "@/lib/domain/stok";

// Query halaman publik. Hanya model aktif; penyaringan dan urutan ada di domain/katalog.ts.
// Nama yang diketik HURUF BESAR SEMUA dirapikan untuk tampilan publik (rapikanHurufBesar); admin tetap melihat aslinya.
// Ratusan model masih ringan dibaca sekaligus; kalau katalog jauh membesar, pindahkan saringan ke SQL.

export async function semuaProdukAktif(db: Db): Promise<ItemKatalog[]> {
  const baris = await db
    .select({
      id: products.id,
      nama: products.nama,
      brand: products.brand,
      kategori: products.kategori,
      harga: products.harga,
      hargaCoret: products.hargaCoret,
      foto: products.foto,
      dibuat: products.dibuat,
    })
    .from(products)
    .where(eq(products.aktif, true));
  const ids = baris.map((p) => p.id);
  const semuaVarian = ids.length
    ? await db.select({ productId: variants.productId, size: variants.size, stok: variants.stok }).from(variants).where(inArray(variants.productId, ids))
    : [];
  return baris.map(({ foto, ...p }) => ({
    ...p,
    nama: rapikanHurufBesar(p.nama),
    sampul: foto[0] ?? null,
    varian: semuaVarian.filter((v) => v.productId === p.id).map(({ size, stok }) => ({ size, stok })),
  }));
}

export type ProdukPublik = {
  id: string;
  nama: string;
  brand: string;
  kategori: string | null;
  deskripsi: string | null;
  harga: number;
  hargaCoret: number | null;
  foto: string[];
  varian: { size: string; stok: number }[];
};

export async function produkPublik(db: Db, id: string): Promise<ProdukPublik | null> {
  const [p] = await db
    .select({
      id: products.id,
      nama: products.nama,
      brand: products.brand,
      kategori: products.kategori,
      deskripsi: products.deskripsi,
      harga: products.harga,
      hargaCoret: products.hargaCoret,
      foto: products.foto,
    })
    .from(products)
    .where(and(eq(products.id, id), eq(products.aktif, true)));
  if (!p) return null;
  const varian = await db.select({ size: variants.size, stok: variants.stok }).from(variants).where(eq(variants.productId, id));
  return { ...p, nama: rapikanHurufBesar(p.nama), varian: varian.sort((a, b) => bandingkanSize(a.size, b.size)) };
}

/** Brand yang tampil di katalog: model aktif yang punya size. Dipakai untuk kalimat di beranda, footer, dan deskripsi situs. */
export async function merekAktif(db: Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ v: products.brand })
    .from(products)
    .innerJoin(variants, eq(variants.productId, products.id))
    .where(eq(products.aktif, true));
  return rows.map((r) => r.v).sort((a, b) => a.localeCompare(b, "id"));
}
