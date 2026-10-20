import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPgliteDb, type Db } from "@/db";
import { buatUser } from "@/lib/auth/session";
import { produkPublik, semuaProdukAktif } from "@/lib/katalog/data";
import { daftarFotoBelumKecil } from "@/lib/produk/data";
import { buatProduk, simpanFotoKecil, tambahVarian, ubahFotoProduk } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;
let id: string;

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  id = await buatProduk(
    db,
    { nama: "Air Force 1", brand: "Nike", kategori: null, deskripsi: null, harga: 1_599_000, hargaCoret: null, feePerPasang: null, aktif: true },
    adminId,
  );
  await tambahVarian(db, id, { sku: "CW2288-111-42", size: "42", stok: 2 }, adminId);
});
after(() => close());

describe("versi kecil foto produk", () => {
  it("foto baru dengan versi kecil: kartu katalog dan keranjang memakai versi kecil, halaman produk tetap foto asli", async () => {
    assert.equal((await ubahFotoProduk(db, id, { jenis: "tambah", url: "/foto/a.jpg" }, adminId, "/foto/a-k.jpg")).ok, true);
    const [kartu] = await semuaProdukAktif(db);
    assert.equal(kartu.sampul, "/foto/a-k.jpg");
    const p = await produkPublik(db, id);
    assert.deepEqual([p?.foto, p?.sampulKecil], [["/foto/a.jpg"], "/foto/a-k.jpg"]);
  });

  it("foto lama tanpa versi kecil masuk antrean, lalu dilengkapi", async () => {
    await ubahFotoProduk(db, id, { jenis: "tambah", url: "/foto/lama.jpg" }, adminId);
    await ubahFotoProduk(db, id, { jenis: "sampul", url: "/foto/lama.jpg" }, adminId);
    assert.equal((await semuaProdukAktif(db))[0].sampul, "/foto/lama.jpg");
    assert.deepEqual(await daftarFotoBelumKecil(db), [{ productId: id, url: "/foto/lama.jpg" }]);

    assert.equal(await simpanFotoKecil(db, id, "/foto/lama.jpg", "/foto/lama-k.jpg"), true);
    assert.equal(await simpanFotoKecil(db, id, "/foto/lama.jpg", "/foto/dobel.jpg"), false);
    assert.equal(await simpanFotoKecil(db, id, "/foto/tidak-ada.jpg", "/foto/x.jpg"), false);
    assert.deepEqual(await daftarFotoBelumKecil(db), []);
    assert.equal((await semuaProdukAktif(db))[0].sampul, "/foto/lama-k.jpg");
  });

  it("hapus foto ikut membuang versi kecilnya", async () => {
    const hasil = await ubahFotoProduk(db, id, { jenis: "hapus", url: "/foto/a.jpg" }, adminId);
    assert.deepEqual(hasil.ok && hasil.kecilDibuang, ["/foto/a-k.jpg"]);
    const p = await produkPublik(db, id);
    assert.deepEqual(p?.foto, ["/foto/lama.jpg"]);
  });
});
