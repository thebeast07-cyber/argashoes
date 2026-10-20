import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, variants } from "@/db/schema";
import { buatUser } from "@/lib/auth/session";
import { kodeArtikel, usulSku } from "@/lib/domain/sku";
import { ambilProduk, pemakaiSku } from "@/lib/produk/data";
import { buatProduk, tambahVarian, ubahSku } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;
let produkId: string;

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  produkId = await buatProduk(
    db,
    { nama: "Dunk Low", brand: "Nike", kategori: null, deskripsi: null, harga: 1_500_000, hargaCoret: null, feePerPasang: null, aktif: true },
    adminId,
  );
});
after(() => close());

describe("SKU size", () => {
  it("kasus owner: SKU size pertama tanpa size, size berikutnya diusulkan lengkap lalu SKU lama dibetulkan", async () => {
    assert.equal(await tambahVarian(db, produkId, { sku: "HM9451-600", size: "39", stok: 1 }, adminId), "ok");
    // Mengetik ulang kode artikel untuk size 40 bentrok dengan size 39.
    assert.equal(await tambahVarian(db, produkId, { sku: "HM9451-600", size: "40", stok: 1 }, adminId), "sku_dipakai");
    assert.deepEqual(await pemakaiSku(db, "HM9451-600"), { productId: produkId, nama: "Dunk Low", brand: "Nike", size: "39" });

    const produk = (await ambilProduk(db, produkId))!;
    const usulan = usulSku(kodeArtikel(produk.varian), "40");
    assert.equal(usulan, "HM9451-600-40");
    assert.equal(await tambahVarian(db, produkId, { sku: usulan, size: "40", stok: 1 }, adminId), "ok");

    const v39 = produk.varian.find((v) => v.size === "39")!;
    assert.equal(await ubahSku(db, v39.id, "HM9451-600-40", adminId), "sku_dipakai");
    assert.equal(await ubahSku(db, v39.id, "HM9451-600-39", adminId), "ok");
    assert.equal((await db.select({ sku: variants.sku }).from(variants).where(eq(variants.id, v39.id)))[0].sku, "HM9451-600-39");
    const [log] = await db.select({ data: auditLog.data }).from(auditLog).where(eq(auditLog.aksi, "varian.sku_diubah"));
    assert.deepEqual(log.data, { dari: "HM9451-600", ke: "HM9451-600-39" });
  });

  it("SKU yang sama dengan sebelumnya tidak dicatat, size yang tidak ada ditolak", async () => {
    const produk = (await ambilProduk(db, produkId))!;
    const v40 = produk.varian.find((v) => v.size === "40")!;
    assert.equal(await ubahSku(db, v40.id, v40.sku, adminId), "ok");
    assert.equal((await db.select().from(auditLog).where(eq(auditLog.aksi, "varian.sku_diubah"))).length, 1);
    assert.equal(await ubahSku(db, "00000000-0000-0000-0000-000000000000", "X-1", adminId), "tidak_ada");
  });
});
