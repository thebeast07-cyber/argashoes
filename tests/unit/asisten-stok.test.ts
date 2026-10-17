import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bacaMaksud,
  cekBatasTanya,
  daftarUntukAi,
  jawabStok,
  sizeSama,
  type ModelStok,
  type VarianStok,
} from "@/lib/domain/asisten-stok";

const MODEL: ModelStok[] = [
  { id: "af1", brand: "Nike", nama: "Air Force 1 '07 White", aktif: true },
  { id: "samba", brand: "Adidas", nama: "Samba OG Black", aktif: true },
  { id: "lama", brand: "Nike", nama: "Air Max 90", aktif: false },
];
const VARIAN: VarianStok[] = [
  { productId: "af1", size: "42", stok: 0 },
  { productId: "af1", size: "40", stok: 3 },
  { productId: "af1", size: "41", stok: 5 },
  { productId: "samba", size: "41 1/3", stok: 2 },
  { productId: "samba", size: "42", stok: 4 },
  { productId: "lama", size: "42", stok: 1 },
];
const AMBANG = { readyMin: 3 };

describe("bacaMaksud", () => {
  it("nomor model dipetakan ke id, nomor di luar daftar dan duplikat dibuang", () => {
    assert.deepEqual(bacaMaksud({ jenis: "sisa_model", nomorModel: [1, 1, 9, 0, 2.5], size: "" }, MODEL), {
      jenis: "sisa_model",
      model: ["af1"],
      size: null,
    });
    assert.deepEqual(bacaMaksud({ jenis: "cari_size", nomorModel: [], size: " 42,5 " }, MODEL), { jenis: "cari_size", model: [], size: "42.5" });
  });

  it("balasan rusak atau jenis asing jadi tidak paham", () => {
    for (const mentah of [null, "teks", { jenis: "hapus_semua" }, { jenis: "cari_size", size: "" }]) {
      assert.equal(bacaMaksud(mentah, MODEL).jenis, "tidak_paham");
    }
  });

  it("daftar untuk AI memakai nomor urut, bukan id", () => {
    assert.equal(daftarUntukAi(MODEL.slice(0, 2)), "1. Nike Air Force 1 '07 White\n2. Adidas Samba OG Black");
  });
});

describe("jawabStok", () => {
  it("sisa satu model: size urut, total dari DB", () => {
    const j = jawabStok({ jenis: "sisa_model", model: ["af1"], size: null }, MODEL, VARIAN, AMBANG);
    assert.equal(j.jenis, "model");
    if (j.jenis !== "model") return;
    assert.deepEqual(
      j.baris[0].size.map((s) => [s.size, s.stok, s.status]),
      [
        ["40", 3, "ready"],
        ["41", 5, "ready"],
        ["42", 0, "habis"],
      ],
    );
    assert.equal(j.baris[0].total, 8);
  });

  it("sisa model untuk satu size saja", () => {
    const j = jawabStok({ jenis: "sisa_model", model: ["samba"], size: "41 1/3" }, MODEL, VARIAN, AMBANG);
    assert.ok(j.jenis === "model" && j.baris[0].size.length === 1 && j.baris[0].size[0].stok === 2);
  });

  it("model tidak disebut AI berarti tidak ketemu", () => {
    assert.equal(jawabStok({ jenis: "sisa_model", model: [], size: null }, MODEL, VARIAN, AMBANG).jenis, "tidak_ketemu");
  });

  it("cari size: hanya yang ada stoknya, aktif di atas nonaktif", () => {
    const j = jawabStok({ jenis: "cari_size", model: [], size: "42" }, MODEL, VARIAN, AMBANG);
    assert.ok(j.jenis === "size");
    if (j.jenis !== "size") return;
    assert.deepEqual(
      j.baris.map((b) => [b.model.id, b.stok]),
      [
        ["samba", 4],
        ["lama", 1],
      ],
    );
  });

  it("mau habis: hanya size Sisa sedikit dan Habis", () => {
    const j = jawabStok({ jenis: "mau_habis", model: [], size: null }, MODEL, VARIAN, AMBANG);
    assert.ok(j.jenis === "mau_habis");
    if (j.jenis !== "mau_habis") return;
    assert.deepEqual(
      j.baris.map((b) => [b.model.id, b.size.map((s) => s.size)]),
      [
        ["samba", ["41 1/3"]],
        ["af1", ["42"]],
        ["lama", ["42"]],
      ],
    );
  });
});

describe("sizeSama", () => {
  it("angka dibandingkan sebagai angka, teks tanpa beda huruf", () => {
    assert.ok(sizeSama("42", "42.0"));
    assert.ok(sizeSama("42,5", "42.5"));
    assert.ok(!sizeSama("42", "42.5"));
    assert.ok(sizeSama("us 9", "US 9"));
  });
});

describe("cekBatasTanya", () => {
  it("menolak pertanyaan ke-11 dalam satu menit, lalu boleh lagi", () => {
    let riwayat: number[] = [];
    for (let i = 0; i < 10; i++) riwayat = cekBatasTanya(riwayat, 1000 + i)!;
    assert.equal(cekBatasTanya(riwayat, 2000), null);
    assert.ok(cekBatasTanya(riwayat, 61_001));
  });
});
