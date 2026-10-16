import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deteksiPemisah, keCsv, parseCsv, tabelKeObjek } from "@/lib/csv";

describe("parseCsv", () => {
  it("koma, kutip, koma di dalam kutip, CRLF, BOM, baris kosong", () => {
    const teks = '\uFEFFsku,nama\r\nA1,"Air Max, ""90"""\r\n\r\nB2,Samba\n';
    assert.deepEqual(parseCsv(teks), [
      ["sku", "nama"],
      ["A1", 'Air Max, "90"'],
      ["B2", "Samba"],
    ]);
  });

  it("deteksi titik koma dari Excel Indonesia", () => {
    const teks = "sku;size;stok\nA1;42;3\n";
    assert.equal(deteksiPemisah(teks), ";");
    assert.deepEqual(parseCsv(teks), [["sku", "size", "stok"], ["A1", "42", "3"]]);
  });

  it("baris baru di dalam kutip tetap satu sel", () => {
    assert.deepEqual(parseCsv('a,b\n"x\ny",2'), [["a", "b"], ["x\ny", "2"]]);
  });
});

describe("keCsv", () => {
  it("bolak-balik dengan parseCsv", () => {
    const tabel = [["sku", "nama"], ["A1", 'Air "Max", 90'], ["B2", "baris\nbaru"]];
    assert.deepEqual(parseCsv(keCsv(tabel)), tabel);
  });

  it("sel yang diawali = + - @ diberi tanda kutip tunggal (anti formula injection)", () => {
    assert.equal(keCsv([["=HYPERLINK(1)", "-x", 5]]), "'=HYPERLINK(1),'-x,5\r\n");
  });
});

describe("tabelKeObjek", () => {
  it("header dinormalisasi dan nomor baris mengikuti file", () => {
    const { header, data } = tabelKeObjek([["SKU", "Harga Coret"], [" a1 ", "1"]]);
    assert.deepEqual(header, ["sku", "harga_coret"]);
    assert.deepEqual(data, [{ baris: 2, nilai: { sku: "a1", harga_coret: "1" } }]);
  });
});
