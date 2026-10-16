import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FeeTier } from "@/lib/domain/fee";
import { dampakTier, kunciUsulan, samaNilai, usulanBasi, type ProdukUntukDampak } from "@/lib/domain/usulan";

const LAMA: FeeTier[] = [
  { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
  { hargaMin: 1_000_000, hargaMax: null, fee: 75_000 },
];

describe("kunciUsulan", () => {
  it("tier dan rekening satu kunci global, fee produk per produk", () => {
    assert.equal(kunciUsulan("tier"), "tier");
    assert.equal(kunciUsulan("rekening"), "rekening");
    assert.equal(kunciUsulan("fee_produk", "abc"), "fee_produk:abc");
    assert.throws(() => kunciUsulan("fee_produk"));
  });
});

describe("samaNilai dan usulanBasi", () => {
  it("urutan tier tidak membuat beda", () => {
    assert.equal(samaNilai("tier", LAMA, [...LAMA].reverse()), true);
    assert.equal(samaNilai("tier", LAMA, [{ ...LAMA[0], fee: 55_000 }, LAMA[1]]), false);
  });

  it("rekening dibandingkan per kolom, null juga nilai", () => {
    const r = { bank: "BCA", nomor: "123456", atasNama: "Arga" };
    assert.equal(samaNilai("rekening", r, { atasNama: "Arga", nomor: "123456", bank: "BCA" }), true);
    assert.equal(samaNilai("rekening", r, { ...r, nomor: "123457" }), false);
    assert.equal(samaNilai("rekening", null, null), true);
    assert.equal(samaNilai("rekening", null, r), false);
  });

  it("fee produk: null (ikut tier) beda dengan angka", () => {
    assert.equal(samaNilai("fee_produk", null, null), true);
    assert.equal(samaNilai("fee_produk", null, 60_000), false);
  });

  it("basi kalau nilai sekarang sudah beda dari dasar usulan", () => {
    assert.equal(usulanBasi("fee_produk", 70_000, 70_000), false);
    assert.equal(usulanBasi("fee_produk", 70_000, 80_000), true);
  });
});

describe("dampakTier", () => {
  const produk: ProdukUntukDampak[] = [
    { id: "a", nama: "Samba", brand: "Adidas", harga: 1_400_000, feePerPasang: null },
    { id: "b", nama: "Court", brand: "Nike", harga: 899_000, feePerPasang: null },
    { id: "c", nama: "Air Max 90", brand: "Nike", harga: 1_899_000, feePerPasang: 90_000 },
    { id: "d", nama: "Gazelle", brand: "Adidas", harga: 2_300_000, feePerPasang: null },
  ];

  it("hanya produk tanpa fee khusus yang terdampak; naik dan turun dihitung", () => {
    const baru: FeeTier[] = [
      { hargaMin: 0, hargaMax: 1_500_000, fee: 60_000 },
      { hargaMin: 1_500_000, hargaMax: null, fee: 100_000 },
    ];
    const d = dampakTier(produk, LAMA, baru);
    assert.equal(d.feeKhusus, 1);
    assert.deepEqual(
      d.berubah.map((p) => [p.id, p.dari, p.ke]),
      [
        ["b", 50_000, 60_000],
        ["a", 75_000, 60_000],
        ["d", 75_000, 100_000],
      ],
    );
    assert.equal(d.naik, 2);
    assert.equal(d.turun, 1);
  });

  it("produk yang jatuh di luar semua tier dihitung turun ke kosong", () => {
    const d = dampakTier(produk, LAMA, [{ hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 }]);
    assert.deepEqual(d.berubah.map((p) => [p.id, p.ke]), [["a", null], ["d", null]]);
    assert.equal(d.turun, 2);
  });

  it("dari belum ada tier sama sekali", () => {
    const d = dampakTier(produk, [], LAMA);
    assert.equal(d.berubah.length, 3);
    assert.equal(d.naik, 3);
  });
});
