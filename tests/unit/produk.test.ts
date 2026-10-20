import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRibuanSaatKetik, formatRupiah, parseRupiah, samakanMerek, validasiProduk, validasiVarian, type InputProduk } from "@/lib/domain/produk";

const input = (o: Partial<InputProduk> = {}): InputProduk => ({
  nama: "Air Max 90",
  brand: "Nike",
  kategori: "",
  deskripsi: "",
  harga: "1.899.000",
  hargaCoret: "",
  feePerPasang: "",
  aktif: true,
  ...o,
});

describe("parseRupiah", () => {
  it("format umum Indonesia", () => {
    assert.equal(parseRupiah("1500000"), 1_500_000);
    assert.equal(parseRupiah("1.500.000"), 1_500_000);
    assert.equal(parseRupiah("Rp 1.500.000"), 1_500_000);
    assert.equal(parseRupiah("rp1,500,000"), 1_500_000);
  });

  it("desimal dan teks ditolak", () => {
    assert.equal(parseRupiah("1500000,50"), null);
    assert.equal(parseRupiah("1.50"), null);
    assert.equal(parseRupiah("satu juta"), null);
    assert.equal(parseRupiah(""), null);
  });

  it("format tampilan", () => {
    assert.equal(formatRupiah(1_899_000), "Rp 1.899.000");
  });
});

describe("validasiProduk", () => {
  it("input valid dirapikan", () => {
    const hasil = validasiProduk(input({ nama: "  Air Max 90 ", kategori: " Running " }));
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.data, {
      nama: "Air Max 90",
      brand: "Nike",
      kategori: "Running",
      deskripsi: null,
      harga: 1_899_000,
      hargaCoret: null,
      feePerPasang: null,
      aktif: true,
    });
  });

  it("wajib nama, brand, harga", () => {
    const hasil = validasiProduk(input({ nama: " ", brand: "", harga: "0" }));
    assert.ok(!hasil.ok);
    assert.deepEqual(Object.keys(hasil.error).sort(), ["brand", "harga", "nama"]);
  });

  it("harga coret harus lebih tinggi dari harga", () => {
    const hasil = validasiProduk(input({ hargaCoret: "1.899.000" }));
    assert.ok(!hasil.ok);
    assert.ok(hasil.error.hargaCoret);
    assert.ok(validasiProduk(input({ hargaCoret: "2.199.000" })).ok);
  });

  it("fee per pasang 50rb sampai 100rb atau kosong", () => {
    assert.ok(!validasiProduk(input({ feePerPasang: "40.000" })).ok);
    assert.ok(!validasiProduk(input({ feePerPasang: "150000" })).ok);
    const hasil = validasiProduk(input({ feePerPasang: "75.000" }));
    assert.ok(hasil.ok);
    assert.equal(hasil.data.feePerPasang, 75_000);
  });
});

describe("validasiVarian", () => {
  it("SKU jadi huruf besar, size dinormalisasi", () => {
    assert.deepEqual(validasiVarian({ sku: " nk-am90-42 ", size: "42,5", stok: "3" }), {
      ok: true,
      data: { sku: "NK-AM90-42", size: "42.5", stok: 3 },
    });
  });

  it("stok negatif, desimal, atau kosong ditolak", () => {
    for (const stok of ["-1", "1.5", ""]) assert.ok(!validasiVarian({ sku: "A", size: "40", stok }).ok, stok);
  });

  it("SKU dengan spasi atau simbol aneh ditolak", () => {
    assert.ok(!validasiVarian({ sku: "AB CD", size: "40", stok: "1" }).ok);
  });
});

describe("samakanMerek", () => {
  it("ejaan brand yang sudah ada dipakai, brand baru hanya dirapikan spasinya", () => {
    const ada = ["Nike", "Adidas", "New Balance"];
    assert.equal(samakanMerek("nike", ada), "Nike");
    assert.equal(samakanMerek("  NEW   balance ", ada), "New Balance");
    assert.equal(samakanMerek(" Puma  King ", ada), "Puma King");
    assert.equal(samakanMerek("Puma", []), "Puma");
  });
});

describe("formatRibuanSaatKetik", () => {
  it("titik ribuan muncul saat diketik dan tetap terbaca parseRupiah", () => {
    const kasus: [string, string][] = [
      ["1599000", "1.599.000"],
      ["1.5990.00", "1.599.000"],
      ["Rp 50000", "50.000"],
      ["0050000", "50.000"],
      ["0", "0"],
      ["", ""],
      ["abc", ""],
      ["999", "999"],
      ["1000", "1.000"],
    ];
    for (const [ketik, tampil] of kasus) assert.equal(formatRibuanSaatKetik(ketik), tampil, ketik);
    assert.equal(parseRupiah(formatRibuanSaatKetik("1599000")), 1_599_000);
    assert.equal(formatRibuanSaatKetik("1".repeat(20)).replace(/\./g, "").length, 12);
  });
});
