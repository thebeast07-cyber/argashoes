import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPgliteDb, type Db } from "@/db";
import { buatUser } from "@/lib/auth/session";
import { dataKelengkapan } from "@/lib/pengaturan/data";
import { ajukanUsulan, simpanPengaturanToko, simpanRekening, simpanTier } from "@/lib/pengaturan/mutasi";
import { buatProduk, ubahFotoProduk } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let tokoId: string;

before(async () => {
  ({ db, close } = await createPgliteDb());
  tokoId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
});
after(() => close());

const produk = (nama: string, aktif = true) =>
  buatProduk(db, { nama, brand: "Nike", kategori: null, deskripsi: null, harga: 1_500_000, hargaCoret: null, feePerPasang: null, aktif }, tokoId);

describe("dataKelengkapan", () => {
  it("database baru: semua kosong; hanya model aktif tanpa foto yang dihitung", async () => {
    const dunk = await produk("Dunk");
    await produk("Lama", false);
    const af1 = await produk("AF1");
    await ubahFotoProduk(db, af1, { jenis: "tambah", url: "/foto/a.jpg" }, tokoId);
    assert.deepEqual(await dataKelengkapan(db), {
      adaNomorWa: false,
      adaRekening: false,
      rekeningMenunggu: false,
      adaTier: false,
      modelTanpaFoto: { total: 1, contoh: [{ id: dunk, nama: "Nike Dunk" }] },
    });
  });

  it("rekening yang diajukan admin toko terbaca menunggu; setelah semua diisi, lengkap", async () => {
    await ajukanUsulan(db, { jenis: "rekening", isi: { bank: "BCA", nomor: "1234567890", atasNama: "Arga" }, alasan: null }, tokoId);
    assert.equal((await dataKelengkapan(db)).rekeningMenunggu, true);

    await simpanPengaturanToko(db, { nomorWa: "6281200000000", ambang: { readyMin: 3 } }, tokoId);
    await simpanRekening(db, { bank: "BCA", nomor: "1234567890", atasNama: "Arga" }, tokoId);
    await simpanTier(db, [{ hargaMin: 0, hargaMax: null, fee: 50_000 }], tokoId);
    const d = await dataKelengkapan(db);
    assert.deepEqual([d.adaNomorWa, d.adaRekening, d.adaTier], [true, true, true]);
  });
});
