import { eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { auditLog, products, variants } from "@/db/schema";
import { terapkanAksiFoto, type AksiFoto, type HasilFoto } from "@/lib/domain/foto";
import type { RencanaKatalog, RencanaStok } from "@/lib/domain/import";
import type { DataProduk, DataVarian } from "@/lib/domain/produk";

// Semua perubahan produk dan stok ditulis bersama audit log-nya dalam satu transaksi (PRD).

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Audit = { aksi: string; entitas: "products" | "variants" | "import"; entitasId?: string; data?: unknown };

async function catat(tx: Tx, olehUserId: string, entri: Audit | Audit[]) {
  const daftar = Array.isArray(entri) ? entri : [entri];
  if (daftar.length === 0) return;
  await tx.insert(auditLog).values(daftar.map((e) => ({ olehUserId, ...e, data: e.data ?? null })));
}

export async function buatProduk(db: Db, data: DataProduk, olehUserId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [p] = await tx.insert(products).values(data).returning({ id: products.id });
    await catat(tx, olehUserId, { aksi: "produk.dibuat", entitas: "products", entitasId: p.id, data });
    return p.id;
  });
}

/** Tanpa izin fee, nilai fee lama dipertahankan apa pun isi form. */
export async function ubahProduk(
  db: Db,
  id: string,
  data: DataProduk,
  olehUserId: string,
  opsi: { bolehUbahFee: boolean },
): Promise<"ok" | "tidak_ada"> {
  return db.transaction(async (tx) => {
    const [lama] = await tx.select().from(products).where(eq(products.id, id)).for("update");
    if (!lama) return "tidak_ada";
    const baru = { ...data, feePerPasang: opsi.bolehUbahFee ? data.feePerPasang : lama.feePerPasang };
    const berubah = (Object.keys(baru) as (keyof DataProduk)[]).filter((k) => baru[k] !== lama[k]);
    if (berubah.length === 0) return "ok";

    await tx.update(products).set(baru).where(eq(products.id, id));
    await catat(tx, olehUserId, {
      aksi: "produk.diubah",
      entitas: "products",
      entitasId: id,
      data: Object.fromEntries(berubah.map((k) => [k, { dari: lama[k], ke: baru[k] }])),
    });
    return "ok";
  });
}

export type HasilVarian = "ok" | "sku_dipakai" | "size_dipakai" | "tidak_ada";

export async function tambahVarian(db: Db, productId: string, data: DataVarian, olehUserId: string): Promise<HasilVarian> {
  try {
    return await db.transaction(async (tx) => {
      const [v] = await tx.insert(variants).values({ productId, ...data }).returning({ id: variants.id });
      await catat(tx, olehUserId, { aksi: "varian.dibuat", entitas: "variants", entitasId: v.id, data: { productId, ...data } });
      return "ok" as const;
    });
  } catch (e) {
    if (isUniqueViolation(e, "variants_sku_unique")) return "sku_dipakai";
    if (isUniqueViolation(e, "variants_product_size_uq")) return "size_dipakai";
    throw e;
  }
}

export async function ubahStok(
  db: Db,
  variantId: string,
  stok: number,
  olehUserId: string,
  aksi: "stok.diubah" | "stok.tandai_habis" = "stok.diubah",
): Promise<"ok" | "tidak_ada"> {
  return db.transaction(async (tx) => {
    const [lama] = await tx.select({ stok: variants.stok, sku: variants.sku }).from(variants).where(eq(variants.id, variantId)).for("update");
    if (!lama) return "tidak_ada";
    if (lama.stok === stok) return "ok";
    await tx.update(variants).set({ stok }).where(eq(variants.id, variantId));
    await catat(tx, olehUserId, { aksi, entitas: "variants", entitasId: variantId, data: { sku: lama.sku, dari: lama.stok, ke: stok } });
    return "ok";
  });
}

/** SKU boleh dibetulkan (mis. lupa menambah size di belakang kode artikel). Riwayat order menyimpan nama dan size, bukan SKU. */
export async function ubahSku(db: Db, variantId: string, sku: string, olehUserId: string): Promise<"ok" | "sku_dipakai" | "tidak_ada"> {
  try {
    return await db.transaction(async (tx) => {
      const [lama] = await tx.select({ sku: variants.sku }).from(variants).where(eq(variants.id, variantId)).for("update");
      if (!lama) return "tidak_ada" as const;
      if (lama.sku === sku) return "ok" as const;
      await tx.update(variants).set({ sku }).where(eq(variants.id, variantId));
      await catat(tx, olehUserId, { aksi: "varian.sku_diubah", entitas: "variants", entitasId: variantId, data: { dari: lama.sku, ke: sku } });
      return "ok" as const;
    });
  } catch (e) {
    if (isUniqueViolation(e, "variants_sku_unique")) return "sku_dipakai";
    throw e;
  }
}

export async function hapusVarian(db: Db, variantId: string, olehUserId: string): Promise<"ok" | "tidak_ada"> {
  return db.transaction(async (tx) => {
    const [lama] = await tx.delete(variants).where(eq(variants.id, variantId)).returning();
    if (!lama) return "tidak_ada";
    await catat(tx, olehUserId, { aksi: "varian.dihapus", entitas: "variants", entitasId: variantId, data: lama });
    return "ok";
  });
}

/** Urutan foto ditulis ulang utuh di dalam kunci baris, supaya dua admin yang mengatur bersamaan tidak saling menimpa. */
export type HasilUbahFoto = HasilFoto | { ok: false; error: "produk_tidak_ada" };

export async function ubahFotoProduk(db: Db, productId: string, aksi: AksiFoto, olehUserId: string): Promise<HasilUbahFoto> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select({ foto: products.foto }).from(products).where(eq(products.id, productId)).for("update");
    if (!p) return { ok: false, error: "produk_tidak_ada" } as const;
    const hasil = terapkanAksiFoto(p.foto, aksi);
    if (!hasil.ok) return hasil;
    await tx.update(products).set({ foto: hasil.foto }).where(eq(products.id, productId));
    await catat(tx, olehUserId, { aksi: `foto.${aksi.jenis}`, entitas: "products", entitasId: productId, data: { url: aksi.url, urutan: hasil.foto } });
    return hasil;
  });
}

function auditStok(perubahan: RencanaStok["perubahan"]): Audit[] {
  return perubahan.map((p) => ({
    aksi: "stok.diubah",
    entitas: "variants",
    entitasId: p.variantId,
    data: { sku: p.sku, dari: p.dari, ke: p.ke, sumber: "import" },
  }));
}

async function updateStokMassal(tx: Tx, perubahan: RencanaStok["perubahan"]) {
  if (perubahan.length === 0) return;
  // Satu UPDATE untuk ratusan baris: CASE per id.
  const kasus = sql.join(
    perubahan.map((p) => sql`when ${variants.id} = ${p.variantId} then ${p.ke}::integer`),
    sql` `,
  );
  await tx
    .update(variants)
    .set({ stok: sql`case ${kasus} end` })
    .where(inArray(variants.id, perubahan.map((p) => p.variantId)));
}

export async function terapkanImportStok(db: Db, rencana: RencanaStok, olehUserId: string, namaFile: string) {
  await db.transaction(async (tx) => {
    await updateStokMassal(tx, rencana.perubahan);
    await catat(tx, olehUserId, [
      { aksi: "import.stok", entitas: "import", data: { namaFile, diubah: rencana.perubahan.length, tidakBerubah: rencana.tidakBerubah } },
      ...auditStok(rencana.perubahan),
    ]);
  });
}

export async function terapkanImportKatalog(db: Db, rencana: RencanaKatalog, olehUserId: string, namaFile: string) {
  await db.transaction(async (tx) => {
    const audit: Audit[] = [];

    for (const p of rencana.produkBaru) {
      const [baru] = await tx.insert(products).values(p.data).returning({ id: products.id });
      audit.push({ aksi: "produk.dibuat", entitas: "products", entitasId: baru.id, data: { ...p.data, sumber: "import" } });
      const vs = await tx
        .insert(variants)
        .values(p.varian.map((v) => ({ productId: baru.id, ...v })))
        .returning({ id: variants.id, sku: variants.sku, size: variants.size, stok: variants.stok });
      for (const v of vs) audit.push({ aksi: "varian.dibuat", entitas: "variants", entitasId: v.id, data: { productId: baru.id, ...v, sumber: "import" } });
    }

    for (const p of rencana.produkDiubah) {
      await tx.update(products).set(p.perubahan).where(eq(products.id, p.productId));
      audit.push({ aksi: "produk.diubah", entitas: "products", entitasId: p.productId, data: { ...p.perubahan, sumber: "import" } });
    }

    if (rencana.varianBaru.length > 0) {
      const vs = await tx
        .insert(variants)
        .values(rencana.varianBaru.map(({ nama: _n, ...v }) => v))
        .returning({ id: variants.id, productId: variants.productId, sku: variants.sku, size: variants.size, stok: variants.stok });
      for (const v of vs) audit.push({ aksi: "varian.dibuat", entitas: "variants", entitasId: v.id, data: { ...v, sumber: "import" } });
    }

    await updateStokMassal(tx, rencana.stokDiubah);
    audit.push(...auditStok(rencana.stokDiubah));
    audit.unshift({
      aksi: "import.katalog",
      entitas: "import",
      data: {
        namaFile,
        produkBaru: rencana.produkBaru.length,
        produkDiubah: rencana.produkDiubah.length,
        varianBaru: rencana.varianBaru.length + rencana.produkBaru.reduce((n, p) => n + p.varian.length, 0),
        stokDiubah: rencana.stokDiubah.length,
      },
    });
    await catat(tx, olehUserId, audit);
  });
}
