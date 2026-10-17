import { and, asc, count, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { products, settings, variants } from "@/db/schema";
import type { ProdukAda, VarianAda } from "@/lib/domain/import";
import { AMBANG_STOK_DEFAULT, bandingkanSize, isAmbangStok, type AmbangStok } from "@/lib/domain/stok";

export const PER_HALAMAN = 30;

export type VarianRingkas = { id: string; sku: string; size: string; stok: number };

export type ProdukDaftar = {
  id: string;
  nama: string;
  brand: string;
  kategori: string | null;
  harga: number;
  aktif: boolean;
  varian: VarianRingkas[];
};

export async function getAmbangStok(db: Db): Promise<AmbangStok> {
  const [row] = await db.select({ nilai: settings.nilai }).from(settings).where(eq(settings.kunci, "ambang_stok"));
  return isAmbangStok(row?.nilai) ? row.nilai : AMBANG_STOK_DEFAULT;
}

function polaCari(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function daftarProduk(
  db: Db,
  filter: { q?: string; brand?: string; size?: string; halaman?: number },
): Promise<{ items: ProdukDaftar[]; total: number }> {
  const syarat = [];
  const q = filter.q?.trim();
  if (q) {
    const pola = polaCari(q);
    syarat.push(
      or(
        ilike(products.nama, pola),
        ilike(products.brand, pola),
        exists(
          db
            .select({ x: sql`1` })
            .from(variants)
            .where(and(eq(variants.productId, products.id), ilike(variants.sku, pola))),
        ),
      ),
    );
  }
  if (filter.brand) syarat.push(eq(products.brand, filter.brand));
  if (filter.size) {
    syarat.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(variants)
          .where(and(eq(variants.productId, products.id), eq(variants.size, filter.size))),
      ),
    );
  }
  const where = syarat.length > 0 ? and(...syarat) : undefined;
  const halaman = Math.max(1, filter.halaman ?? 1);

  const [{ total }] = await db.select({ total: count() }).from(products).where(where);
  const baris = await db
    .select({
      id: products.id,
      nama: products.nama,
      brand: products.brand,
      kategori: products.kategori,
      harga: products.harga,
      aktif: products.aktif,
    })
    .from(products)
    .where(where)
    .orderBy(asc(products.brand), asc(products.nama))
    .limit(PER_HALAMAN)
    .offset((halaman - 1) * PER_HALAMAN);

  const ids = baris.map((p) => p.id);
  const semuaVarian = ids.length
    ? await db
        .select({ id: variants.id, productId: variants.productId, sku: variants.sku, size: variants.size, stok: variants.stok })
        .from(variants)
        .where(inArray(variants.productId, ids))
    : [];

  return {
    total,
    items: baris.map((p) => ({
      ...p,
      varian: semuaVarian
        .filter((v) => v.productId === p.id)
        .map(({ productId: _p, ...v }) => v)
        .sort((a, b) => bandingkanSize(a.size, b.size)),
    })),
  };
}

export async function opsiFilter(db: Db): Promise<{ brands: string[]; sizes: string[]; kategori: string[] }> {
  const [brandRows, sizeRows, kategoriRows] = await Promise.all([
    db.selectDistinct({ v: products.brand }).from(products).orderBy(asc(products.brand)),
    db.selectDistinct({ v: variants.size }).from(variants),
    db.selectDistinct({ v: products.kategori }).from(products).orderBy(asc(products.kategori)),
  ]);
  return {
    brands: brandRows.map((r) => r.v),
    sizes: sizeRows.map((r) => r.v).sort(bandingkanSize),
    kategori: kategoriRows.map((r) => r.v).filter((v): v is string => Boolean(v)),
  };
}

export type SizeHabis = { productId: string; brand: string; nama: string; size: string };

/** Size berstok 0 dari model yang tampil di katalog, untuk beranda admin. */
export async function daftarSizeHabis(db: Db, batas: number): Promise<{ items: SizeHabis[]; total: number }> {
  const where = and(eq(variants.stok, 0), eq(products.aktif, true));
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(variants).innerJoin(products, eq(variants.productId, products.id)).where(where),
    db
      .select({ productId: products.id, brand: products.brand, nama: products.nama, size: variants.size })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(where),
  ]);
  const items = rows
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.nama.localeCompare(b.nama) || bandingkanSize(a.size, b.size))
    .slice(0, batas);
  return { items, total };
}

export async function ambilProduk(db: Db, id: string) {
  const [produk] = await db.select().from(products).where(eq(products.id, id));
  if (!produk) return null;
  const varian = await db
    .select({ id: variants.id, sku: variants.sku, size: variants.size, stok: variants.stok })
    .from(variants)
    .where(eq(variants.productId, id));
  return { ...produk, varian: varian.sort((a, b) => bandingkanSize(a.size, b.size)) };
}

export async function dataUntukImport(db: Db): Promise<{ produk: ProdukAda[]; varian: VarianAda[] }> {
  const [produk, varian] = await Promise.all([
    db
      .select({
        id: products.id,
        nama: products.nama,
        brand: products.brand,
        kategori: products.kategori,
        harga: products.harga,
        hargaCoret: products.hargaCoret,
        feePerPasang: products.feePerPasang,
      })
      .from(products),
    db.select({ id: variants.id, productId: variants.productId, sku: variants.sku, size: variants.size, stok: variants.stok }).from(variants),
  ]);
  return { produk, varian };
}

/** Satu baris per size, kolom sama persis dengan format import katalog. */
export async function barisEkspor(db: Db) {
  const rows = await db
    .select({
      sku: variants.sku,
      brand: products.brand,
      nama: products.nama,
      kategori: products.kategori,
      harga: products.harga,
      hargaCoret: products.hargaCoret,
      feePerPasang: products.feePerPasang,
      size: variants.size,
      stok: variants.stok,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id));
  return rows.sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.nama.localeCompare(b.nama) || bandingkanSize(a.size, b.size),
  );
}
