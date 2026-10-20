import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bacaKonfirmasiStok,
  bacaPerintahStok,
  cekStokMasihSama,
  rencanaStokAsisten,
  samakanSize,
  type VarianAksi,
} from "@/lib/domain/asisten-aksi";
import type { ModelStok } from "@/lib/domain/asisten-stok";

const M = (id: string, nama: string): ModelStok => ({
  id,
  brand: "Nike",
  nama,
  kategori: null,
  harga: 1_500_000,
  hargaCoret: null,
  aktif: true,
  jumlahFoto: 1,
  adaDeskripsi: true,
});
const MODEL = [M("af1", "Air Force 1 White"), M("dunk", "Dunk Low Panda")];
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const VARIAN: VarianAksi[] = [
  { id: id(1), productId: "af1", size: "42", stok: 2 },
  { id: id(2), productId: "af1", size: "43", stok: 1 },
  { id: id(3), productId: "af1", size: "42.5", stok: 0 },
  { id: id(4), productId: "dunk", size: "42", stok: 5 },
];

describe("bacaPerintahStok", () => {
  it("bentuk yang salah dibuang", () => {
    const mentah = [
      { nomorModel: 1, size: " 42 ", cara: "tambah", jumlah: 3 },
      { nomorModel: 1, size: "43", cara: "hapus", jumlah: 1 },
      { nomorModel: 1, size: "43", cara: "jadi", jumlah: -1 },
      { nomorModel: 1, size: "43", cara: "jadi", jumlah: 1.5 },
      { nomorModel: "1", size: "43", cara: "jadi", jumlah: 1 },
      { nomorModel: 1, size: "", cara: "jadi", jumlah: 1 },
      null,
    ];
    assert.deepEqual(bacaPerintahStok(mentah), [{ nomorModel: 1, size: "42", cara: "tambah", jumlah: 3 }]);
    assert.deepEqual(bacaPerintahStok(undefined), []);
  });
});

describe("samakanSize", () => {
  it("koma, awalan EU, dan spasi tidak membedakan size", () => {
    assert.equal(samakanSize(" EU 42,5 "), "42.5");
    assert.equal(samakanSize("41  1/3"), "41 1/3");
  });
});

describe("rencanaStokAsisten", () => {
  it("tambah, jadi, dan habis untuk banyak size; size dikenali walau ditulis beda", () => {
    const r = rencanaStokAsisten(
      [
        { nomorModel: 1, size: "42", cara: "tambah", jumlah: 3 },
        { nomorModel: 1, size: "43", cara: "jadi", jumlah: 0 },
        { nomorModel: 1, size: "42,5", cara: "jadi", jumlah: 4 },
      ],
      MODEL,
      VARIAN,
    );
    assert.deepEqual(r, {
      baris: [
        { variantId: id(1), productId: "af1", model: "Nike Air Force 1 White", size: "42", dari: 2, ke: 5 },
        { variantId: id(2), productId: "af1", model: "Nike Air Force 1 White", size: "43", dari: 1, ke: 0 },
        { variantId: id(3), productId: "af1", model: "Nike Air Force 1 White", size: "42.5", dari: 0, ke: 4 },
      ],
      masalah: [],
    });
  });

  it("dua perintah untuk size yang sama dijalankan berurutan jadi satu baris", () => {
    const r = rencanaStokAsisten(
      [
        { nomorModel: 2, size: "42", cara: "kurangi", jumlah: 2 },
        { nomorModel: 2, size: "42", cara: "tambah", jumlah: 10 },
      ],
      MODEL,
      VARIAN,
    );
    assert.deepEqual(r?.baris.map((b) => [b.dari, b.ke]), [[5, 13]]);
  });

  it("stok minus, size belum ada, dan model salah jadi masalah; baris yang benar tetap ada", () => {
    const r = rencanaStokAsisten(
      [
        { nomorModel: 1, size: "43", cara: "kurangi", jumlah: 3 },
        { nomorModel: 1, size: "44", cara: "tambah", jumlah: 1 },
        { nomorModel: 9, size: "42", cara: "tambah", jumlah: 1 },
        { nomorModel: 2, size: "42", cara: "kurangi", jumlah: 1 },
      ],
      MODEL,
      VARIAN,
    );
    assert.deepEqual(r?.masalah, [
      "Nike Air Force 1 White size 43 tinggal 1, tidak bisa dikurangi 3.",
      "Nike Air Force 1 White: size 44 belum ada. Tambahkan dulu lewat Tambah size di halaman produknya.",
      "Ada model yang tidak ditemukan di katalog.",
    ]);
    assert.deepEqual(r?.baris.map((b) => [b.size, b.ke]), [["42", 4]]);
  });

  it("tidak ada perintah → null; stok sudah sama → pesan, tanpa baris", () => {
    assert.equal(rencanaStokAsisten([], MODEL, VARIAN), null);
    assert.deepEqual(rencanaStokAsisten([{ nomorModel: 1, size: "42", cara: "jadi", jumlah: 2 }], MODEL, VARIAN), {
      baris: [],
      masalah: ["Stoknya sudah sama dengan yang diminta, tidak ada yang berubah."],
    });
  });
});

describe("bacaKonfirmasiStok dan cekStokMasihSama", () => {
  it("isi kartu dari browser dicek bentuknya; size ganda ditolak", () => {
    assert.deepEqual(bacaKonfirmasiStok([{ variantId: id(1), dari: 2, ke: 5, lain: "x" }]), [{ variantId: id(1), dari: 2, ke: 5 }]);
    for (const mentah of [
      [],
      "x",
      [{ variantId: "bukan-uuid", dari: 2, ke: 5 }],
      [{ variantId: id(1), dari: 2, ke: -1 }],
      [
        { variantId: id(1), dari: 2, ke: 5 },
        { variantId: id(1), dari: 2, ke: 6 },
      ],
    ]) {
      assert.equal(bacaKonfirmasiStok(mentah), null);
    }
  });

  it("stok yang sudah berubah atau size yang hilang membatalkan semuanya", () => {
    const kini = new Map([
      [id(1), 2],
      [id(2), 1],
    ]);
    assert.equal(cekStokMasihSama([{ variantId: id(1), dari: 2, ke: 5 }], kini), "ok");
    assert.equal(cekStokMasihSama([{ variantId: id(1), dari: 3, ke: 5 }], kini), "berubah");
    assert.equal(cekStokMasihSama([{ variantId: id(9), dari: 0, ke: 5 }], kini), "tidak_ada");
  });
});
