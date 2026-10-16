import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bandingkanSize, labelStok, nilaiSize, normalisasiSize, statusStok } from "@/lib/domain/stok";

describe("statusStok", () => {
  it("default PRD: Ready >= 3, Sisa sedikit 1-2, Habis 0", () => {
    assert.equal(statusStok(0), "habis");
    assert.equal(statusStok(1), "sisa_sedikit");
    assert.equal(statusStok(2), "sisa_sedikit");
    assert.equal(statusStok(3), "ready");
    assert.equal(statusStok(40), "ready");
  });

  it("ambang bisa diubah", () => {
    assert.equal(statusStok(4, { readyMin: 5 }), "sisa_sedikit");
    assert.equal(statusStok(5, { readyMin: 5 }), "ready");
  });

  it("label selalu berupa teks, bukan cuma warna", () => {
    assert.equal(labelStok(0), "Habis");
    assert.equal(labelStok(2), "Sisa 2");
    assert.equal(labelStok(9), "Ready");
  });
});

describe("size", () => {
  it("normalisasi koma desimal dan spasi", () => {
    assert.equal(normalisasiSize(" 42,5 "), "42.5");
    assert.equal(normalisasiSize("41  1/3"), "41 1/3");
    assert.equal(normalisasiSize("US 9"), "US 9");
  });

  it("nilai size termasuk pecahan ala Adidas", () => {
    assert.equal(nilaiSize("42"), 42);
    assert.equal(nilaiSize("42,5"), 42.5);
    assert.ok(Math.abs(nilaiSize("41 1/3")! - 41.333) < 0.001);
    assert.equal(nilaiSize("S"), null);
  });

  it("urut: angka sebagai angka, teks di belakang", () => {
    const urut = ["44", "40.5", "US 9", "41 2/3", "40", "41 1/3", "S"].sort(bandingkanSize);
    assert.deepEqual(urut, ["40", "40.5", "41 1/3", "41 2/3", "44", "S", "US 9"]);
  });
});
