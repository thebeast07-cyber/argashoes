import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { skuValid } from "@/lib/domain/produk";
import { akhiranSize, kodeArtikel, pesanSkuDipakai, usulSku } from "@/lib/domain/sku";

describe("kodeArtikel", () => {
  it("SKU berakhiran size: bagian depannya kode artikel", () => {
    assert.equal(kodeArtikel([{ sku: "HM9451-600-39", size: "39" }]), "HM9451-600");
    assert.equal(kodeArtikel([{ sku: "b75806-40-2/3", size: "40 2/3" }]), "B75806");
  });

  it("SKU tanpa akhiran size dianggap kode artikel utuh", () => {
    assert.equal(kodeArtikel([{ sku: "HM9451-600", size: "39" }]), "HM9451-600");
  });

  it("kode yang paling sering dipakai menang", () => {
    const varian = [
      { sku: "NK-AF1-40", size: "40" },
      { sku: "CW2288-111-41", size: "41" },
      { sku: "CW2288-111-42", size: "42" },
    ];
    assert.equal(kodeArtikel(varian), "CW2288-111");
  });

  it("belum ada size berarti belum ada kode", () => {
    assert.equal(kodeArtikel([]), null);
  });

  it("SKU yang isinya cuma size tidak menghasilkan kode kosong", () => {
    assert.equal(kodeArtikel([{ sku: "40", size: "40" }]), "40");
  });
});

describe("usulSku", () => {
  it("kode artikel + strip + size, huruf besar, spasi jadi strip", () => {
    assert.equal(usulSku("HM9451-600", "40"), "HM9451-600-40");
    assert.equal(usulSku("HM9451-600", "42,5"), "HM9451-600-42.5");
    assert.equal(usulSku("b75806", " 40 2/3 "), "B75806-40-2/3");
    assert.equal(akhiranSize("us 9"), "US-9");
  });

  it("kosong kalau kode atau size belum ada", () => {
    assert.equal(usulSku(null, "40"), "");
    assert.equal(usulSku("HM9451-600", "  "), "");
  });

  it("hasilnya lolos aturan SKU", () => {
    for (const [kode, size] of [["HM9451-600", "40"], ["B75806", "40 2/3"], ["CW2288-111", "42.5"]]) {
      assert.ok(skuValid(usulSku(kode, size)), `${kode} ${size}`);
    }
  });
});

describe("pesanSkuDipakai", () => {
  it("menyebut size pemakai, dan nama model kalau model lain", () => {
    const pemakai = { productId: "p1", nama: "Air Force 1 '07 White", brand: "Nike", size: "39" };
    assert.equal(
      pesanSkuDipakai("HM9451-600", pemakai, "p1"),
      "SKU HM9451-600 sudah dipakai size 39. Satu SKU hanya untuk satu size: tambahkan strip dan size di belakang kode artikel.",
    );
    assert.match(pesanSkuDipakai("HM9451-600", pemakai, "p2"), /size 39 di Nike Air Force 1 '07 White\./);
    assert.match(pesanSkuDipakai("X", null, "p1"), /sudah dipakai\. Satu SKU/);
  });
});
