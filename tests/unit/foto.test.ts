import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOTO_MAKS, FOTO_UKURAN_MAKS, parseAksiFoto, terapkanAksiFoto, ukuranKecil, validasiFileFoto } from "@/lib/domain/foto";

const ABC = ["a", "b", "c"];

describe("terapkanAksiFoto", () => {
  it("tambah ke belakang, foto pertama tetap sampul", () => {
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "tambah", url: "d" }), { ok: true, foto: ["a", "b", "c", "d"] });
    assert.deepEqual(terapkanAksiFoto([], { jenis: "tambah", url: "a" }), { ok: true, foto: ["a"] });
  });

  it("tambah ditolak kalau sudah penuh atau url dobel", () => {
    const penuh = Array.from({ length: FOTO_MAKS }, (_, i) => `f${i}`);
    assert.deepEqual(terapkanAksiFoto(penuh, { jenis: "tambah", url: "baru" }), { ok: false, error: "penuh" });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "tambah", url: "b" }), { ok: false, error: "sudah_ada" });
  });

  it("jadikan sampul memindah foto ke depan tanpa mengacak sisanya", () => {
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "sampul", url: "c" }), { ok: true, foto: ["c", "a", "b"] });
  });

  it("geser menukar dengan tetangga, di ujung tidak berubah", () => {
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "geser", url: "b", arah: -1 }), { ok: true, foto: ["b", "a", "c"] });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "geser", url: "b", arah: 1 }), { ok: true, foto: ["a", "c", "b"] });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "geser", url: "a", arah: -1 }), { ok: true, foto: ABC });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "geser", url: "c", arah: 1 }), { ok: true, foto: ABC });
  });

  it("hapus, dan foto yang tidak ada ditolak", () => {
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "hapus", url: "a" }), { ok: true, foto: ["b", "c"] });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "hapus", url: "x" }), { ok: false, error: "tidak_ada" });
    assert.deepEqual(terapkanAksiFoto(ABC, { jenis: "sampul", url: "x" }), { ok: false, error: "tidak_ada" });
  });

  it("tidak mengubah daftar asli", () => {
    const asli = [...ABC];
    terapkanAksiFoto(asli, { jenis: "sampul", url: "c" });
    assert.deepEqual(asli, ABC);
  });
});

describe("parseAksiFoto", () => {
  it("menerima sampul, hapus, geser kiri/kanan", () => {
    assert.deepEqual(parseAksiFoto({ jenis: "sampul", url: "a" }), { jenis: "sampul", url: "a" });
    assert.deepEqual(parseAksiFoto({ jenis: "geser", url: "a", arah: 1 }), { jenis: "geser", url: "a", arah: 1 });
  });

  it("menolak tambah dari browser dan bentuk yang salah", () => {
    assert.equal(parseAksiFoto({ jenis: "tambah", url: "a" }), null);
    assert.equal(parseAksiFoto({ jenis: "geser", url: "a", arah: 2 }), null);
    assert.equal(parseAksiFoto({ jenis: "hapus" }), null);
    assert.equal(parseAksiFoto(null), null);
  });
});

describe("validasiFileFoto", () => {
  it("hanya JPG, PNG, WebP dengan ukuran wajar", () => {
    assert.equal(validasiFileFoto({ tipe: "image/jpeg", ukuran: 300_000 }), null);
    assert.equal(validasiFileFoto({ tipe: "image/webp", ukuran: 1 }), null);
    assert.match(validasiFileFoto({ tipe: "image/heic", ukuran: 300_000 })!, /JPG, PNG, atau WebP/);
    assert.match(validasiFileFoto({ tipe: "image/svg+xml", ukuran: 300 })!, /JPG, PNG, atau WebP/);
    assert.match(validasiFileFoto({ tipe: "image/jpeg", ukuran: 0 })!, /kosong/);
    assert.match(validasiFileFoto({ tipe: "image/jpeg", ukuran: FOTO_UKURAN_MAKS + 1 })!, /terlalu besar/);
  });
});

describe("ukuranKecil", () => {
  it("sisi terpanjang jadi 1600, rasio tetap, foto kecil tidak diperbesar", () => {
    assert.deepEqual(ukuranKecil(4032, 3024), { lebar: 1600, tinggi: 1200 });
    assert.deepEqual(ukuranKecil(3024, 4032), { lebar: 1200, tinggi: 1600 });
    assert.deepEqual(ukuranKecil(800, 600), { lebar: 800, tinggi: 600 });
  });
});
