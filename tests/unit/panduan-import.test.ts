import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTOH_KATALOG, CONTOH_STOK } from "@/app/admin/(panel)/produk/import/contoh";
import { KOLOM_KATALOG_WAJIB, KOLOM_TEMPLATE, rencanakanImportKatalog, rencanakanImportStok } from "@/lib/domain/import";
import { skuValid } from "@/lib/domain/produk";
import { normalisasiSku } from "@/lib/domain/stok";

describe("panduan import", () => {
  it("contoh katalog lolos aturan dan jadi satu model dengan tiga size", () => {
    const r = rencanakanImportKatalog(CONTOH_KATALOG, [], [], { bolehUbahFee: false });
    assert.deepEqual(r.error, []);
    assert.equal(r.produkBaru.length, 1);
    assert.equal(r.produkBaru[0].varian.length, 3);
  });

  it("contoh stok lolos untuk SKU yang sudah ada", () => {
    const varian = CONTOH_KATALOG.slice(1).map(([sku, , , , size], i) => ({ id: `v${i}`, productId: "p1", sku, size, stok: 0 }));
    assert.deepEqual(rencanakanImportStok(CONTOH_STOK, varian).error, []);
  });

  it("template memuat semua kolom wajib dan tidak memuat kolom fee", () => {
    for (const k of KOLOM_KATALOG_WAJIB) assert.ok(KOLOM_TEMPLATE.includes(k), k);
    assert.ok(!(KOLOM_TEMPLATE as readonly string[]).includes("fee_per_pasang"));
  });

  it("SKU yang disebut di panduan sah", () => {
    for (const sku of ["CW2288-111-41", "NK-AF1-PUTIH-41", "B75806-40-2/3", "cw2288-111-42.5"]) assert.ok(skuValid(normalisasiSku(sku)), sku);
  });
});
