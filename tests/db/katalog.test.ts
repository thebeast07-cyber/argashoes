import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPgliteDb, type Db } from "@/db";
import type { DataProduk } from "@/lib/domain/produk";
import { buatUser } from "@/lib/auth/session";
import { produkPublik, semuaProdukAktif } from "@/lib/katalog/data";
import { buatProduk, tambahVarian, ubahFotoProduk } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;

const DASAR: DataProduk = { nama: "Samba OG", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_399_000, hargaCoret: null, feePerPasang: null, aktif: true };

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
});
after(() => close());

describe("katalog publik", () => {
  it("hanya model aktif; sampul = foto pertama; size urut sebagai angka", async () => {
    const aktif = await buatProduk(db, DASAR, adminId);
    const nonaktif = await buatProduk(db, { ...DASAR, nama: "Rahasia", aktif: false }, adminId);
    await tambahVarian(db, aktif, { sku: "AD-1-43", size: "43", stok: 2 }, adminId);
    await tambahVarian(db, aktif, { sku: "AD-1-41", size: "41 1/3", stok: 0 }, adminId);
    await ubahFotoProduk(db, aktif, { jenis: "tambah", url: "/foto/a.jpg" }, adminId);
    await ubahFotoProduk(db, aktif, { jenis: "tambah", url: "/foto/b.jpg" }, adminId);

    const semua = await semuaProdukAktif(db);
    assert.deepEqual(semua.map((p) => p.nama), ["Samba OG"]);
    assert.equal(semua[0].sampul, "/foto/a.jpg");
    assert.equal(semua[0].varian.length, 2);

    const p = await produkPublik(db, aktif);
    assert.deepEqual(p?.varian.map((v) => v.size), ["41 1/3", "43"]);
    assert.deepEqual(p?.foto, ["/foto/a.jpg", "/foto/b.jpg"]);
    assert.equal(await produkPublik(db, nonaktif), null);
  });
});
