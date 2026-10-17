import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv } from "@/lib/csv";
import { rencanakanImportKatalog, rencanakanImportStok, type ProdukAda, type VarianAda } from "@/lib/domain/import";

const PRODUK: ProdukAda[] = [
  { id: "p1", nama: "Air Max 90", brand: "Nike", kategori: "Lifestyle", harga: 1_899_000, hargaCoret: null, feePerPasang: null },
  { id: "p2", nama: "Samba OG", brand: "Adidas", kategori: null, harga: 1_700_000, hargaCoret: 2_000_000, feePerPasang: 80_000 },
];
const VARIAN: VarianAda[] = [
  { id: "v1", productId: "p1", sku: "NK-AM90-42", size: "42", stok: 3 },
  { id: "v2", productId: "p1", sku: "NK-AM90-43", size: "43", stok: 0 },
  { id: "v3", productId: "p2", sku: "AD-SMB-41-1/3", size: "41 1/3", stok: 2 },
];

describe("rencanakanImportStok", () => {
  it("hanya baris yang berubah masuk perubahan", () => {
    const r = rencanakanImportStok(parseCsv("sku,size,stok\nnk-am90-42,42,3\nNK-AM90-43,43,5\nAD-SMB-41-1/3,41 1/3,0\n"), VARIAN);
    assert.deepEqual(r.error, []);
    assert.equal(r.tidakBerubah, 1);
    assert.deepEqual(r.perubahan, [
      { variantId: "v2", sku: "NK-AM90-43", size: "43", dari: 0, ke: 5 },
      { variantId: "v3", sku: "AD-SMB-41-1/3", size: "41 1/3", dari: 2, ke: 0 },
    ]);
  });

  it("titik koma ala Excel Indonesia dan size pakai koma desimal", () => {
    const varian: VarianAda[] = [{ id: "v9", productId: "p1", sku: "X1", size: "42.5", stok: 1 }];
    const r = rencanakanImportStok(parseCsv("SKU;Size;Stok\nX1;42,5;4\n"), varian);
    assert.deepEqual(r.error, []);
    assert.equal(r.perubahan[0].ke, 4);
  });

  it("error per baris: SKU tak dikenal, size beda, stok salah, SKU dobel", () => {
    const r = rencanakanImportStok(
      parseCsv("sku,size,stok\nTIDAK-ADA,40,1\nNK-AM90-43,44,1\nAD-SMB-41-1/3,41 1/3,-2\nNK-AM90-42,42,1\nNK-AM90-42,42,2\n"),
      VARIAN,
    );
    assert.deepEqual(
      r.error.map((e) => e.baris),
      [2, 3, 4, 6],
    );
    assert.match(r.error[0].pesan, /belum ada di katalog/);
    assert.match(r.error[1].pesan, /tercatat size 43/);
    assert.match(r.error[3].pesan, /sudah muncul di baris 5/);
    assert.equal(r.perubahan.length, 1);
  });

  it("kolom wajib hilang", () => {
    const r = rencanakanImportStok(parseCsv("sku,stok\nA,1\n"), VARIAN);
    assert.deepEqual(r.error, [{ baris: 1, pesan: "Kolom wajib tidak ada: size." }]);
  });
});

const HEADER = "sku,brand,nama,kategori,harga,harga_coret,fee_per_pasang,size,stok";

describe("rencanakanImportKatalog", () => {
  it("produk baru, varian baru di produk lama, stok berubah, field produk berubah", () => {
    const csv = [
      HEADER,
      "NK-AM90-42,Nike,Air Max 90,Lifestyle,1.799.000,,,42,3",
      "NK-AM90-44,Nike,Air Max 90,Lifestyle,1.799.000,,,44,1",
      "NK-AM90-43,Nike,Air Max 90,Lifestyle,1.799.000,,,43,2",
      "AD-GZL-40,Adidas,Gazelle,,1.500.000,1.800.000,60.000,40,4",
      "AD-GZL-41,Adidas,Gazelle,,1.500.000,1.800.000,60.000,41,0",
    ].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: true });

    assert.deepEqual(r.error, []);
    assert.deepEqual(r.produkDiubah, [{ productId: "p1", nama: "Air Max 90", perubahan: { harga: 1_799_000 } }]);
    assert.deepEqual(r.varianBaru, [{ productId: "p1", nama: "Air Max 90", sku: "NK-AM90-44", size: "44", stok: 1 }]);
    assert.deepEqual(r.stokDiubah, [{ variantId: "v2", sku: "NK-AM90-43", size: "43", dari: 0, ke: 2 }]);
    assert.equal(r.produkBaru.length, 1);
    assert.deepEqual(r.produkBaru[0].data, {
      nama: "Gazelle",
      brand: "Adidas",
      kategori: null,
      harga: 1_500_000,
      hargaCoret: 1_800_000,
      feePerPasang: 60_000,
    });
    assert.deepEqual(
      r.produkBaru[0].varian.map((v) => v.sku),
      ["AD-GZL-40", "AD-GZL-41"],
    );
  });

  it("beda huruf besar/kecil nama model di file yang sama ditolak, bukan dipilih diam-diam", () => {
    const csv = [HEADER, "AD-GZL-40,Adidas,Gazelle,,1500000,,,40,1", "AD-GZL-41,Adidas,GAZELLE,,1500000,,,41,1"].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: true });
    assert.deepEqual(r.error.map((e) => e.baris), [3]);
    assert.match(r.error[0].pesan, /\(nama\)/);
  });

  it("ekspor lalu import tanpa perubahan = rencana kosong", () => {
    const csv = [
      HEADER,
      "NK-AM90-42,Nike,Air Max 90,Lifestyle,1899000,,,42,3",
      "NK-AM90-43,Nike,Air Max 90,Lifestyle,1899000,,,43,0",
      "AD-SMB-41-1/3,Adidas,Samba OG,,1700000,2000000,80000,41 1/3,2",
    ].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: true });
    assert.deepEqual(r, { produkBaru: [], produkDiubah: [], varianBaru: [], stokDiubah: [], error: [], peringatan: [] });
  });

  it("admin toko: kolom fee diabaikan dengan peringatan, fee lama tidak berubah", () => {
    const csv = [HEADER, "AD-SMB-41-1/3,Adidas,Samba OG,,1700000,2000000,95000,41 1/3,2", "AD-NEW-40,Adidas,Campus,,1200000,,90000,40,1"].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: false });
    assert.deepEqual(r.error, []);
    assert.deepEqual(r.produkDiubah, []);
    assert.equal(r.produkBaru[0].data.feePerPasang, null);
    assert.equal(r.peringatan.length, 1);
  });

  it("pemilik: sel fee kosong berarti ikut tier, tanpa kolom fee berarti fee tidak disentuh", () => {
    const kosong = rencanakanImportKatalog(parseCsv([HEADER, "AD-SMB-41-1/3,Adidas,Samba OG,,1700000,2000000,,41 1/3,2"].join("\n")), PRODUK, VARIAN, {
      bolehUbahFee: true,
    });
    assert.deepEqual(kosong.produkDiubah, [{ productId: "p2", nama: "Samba OG", perubahan: { feePerPasang: null } }]);

    const tanpaKolom = rencanakanImportKatalog(
      parseCsv("sku,brand,nama,harga,harga_coret,size,stok\nAD-SMB-41-1/3,Adidas,Samba OG,1700000,2000000,41 1/3,2"),
      PRODUK,
      VARIAN,
      { bolehUbahFee: true },
    );
    assert.deepEqual(tanpaKolom.produkDiubah, []);
  });

  it("error: data model tidak konsisten, size dobel, size SKU lama diubah, size sudah dipakai SKU lain", () => {
    const csv = [
      HEADER,
      "AD-GZL-40,Adidas,Gazelle,,1500000,,,40,1",
      "AD-GZL-41,Adidas,Gazelle,,1600000,,,41,1",
      "AD-GZL-40B,Adidas,Gazelle,,1500000,,,40,1",
      "NK-AM90-42,Nike,Air Max 90,Lifestyle,1899000,,,42.5,1",
      "NK-AM90-X,Nike,Air Max 90,Lifestyle,1899000,,,43,1",
      "BAD,Nike,X,,abc,,,40,x",
      "AD GZL 42,Adidas,Gazelle,,1500000,,,42,1",
    ].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: true });
    assert.deepEqual(
      r.error.map((e) => e.baris),
      [3, 4, 5, 6, 7, 8],
    );
    assert.match(r.error[0].pesan, /beda dengan baris 2/);
    assert.match(r.error[1].pesan, /Size 40 untuk model ini sudah ada di baris 2/);
    assert.match(r.error[2].pesan, /Ubah size lewat halaman produk/);
    assert.match(r.error[3].pesan, /sudah punya size 43 dengan SKU NK-AM90-43/);
    assert.match(r.error[4].pesan, /harga "abc".*stok "x"/);
    assert.match(r.error[5].pesan, /tanpa spasi/);
  });
});

describe("ejaan brand saat import", () => {
  it("brand yang sudah ada dipakai ejaannya; brand baru pakai ejaan pertama di file", () => {
    const csv = [
      HEADER,
      "NK-AM90-42,NIKE,Air Max 90,Lifestyle,1.899.000,,,42,3",
      "AD-GZL-40, adidas ,Gazelle,,1.500.000,,,40,4",
      "NB-550-41,New Balance,550,,1.600.000,,,41,2",
      "NB-990-42,new  balance,990,,2.600.000,,,42,1",
    ].join("\n");
    const r = rencanakanImportKatalog(parseCsv(csv), PRODUK, VARIAN, { bolehUbahFee: true });
    assert.deepEqual(r.error, []);
    // "NIKE" untuk Air Max yang sudah ada tidak dihitung sebagai perubahan brand.
    assert.deepEqual(r.produkDiubah, []);
    assert.deepEqual(r.produkBaru.map((p) => p.data.brand), ["Adidas", "New Balance", "New Balance"]);
  });
});
