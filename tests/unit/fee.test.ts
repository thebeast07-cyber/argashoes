import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cariTier,
  feeItems,
  jumlahPasang,
  orderKenaFee,
  periodeFee,
  rekapFeeBulanan,
  tentukanFeePerPasang,
  validasiTier,
  type FeeTier,
  type OrderUntukRekap,
} from "@/lib/domain/fee";

const TIERS: FeeTier[] = [
  { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
  { hargaMin: 1_000_000, hargaMax: 2_000_000, fee: 75_000 },
  { hargaMin: 2_000_000, hargaMax: null, fee: 100_000 },
];

describe("tentukanFeePerPasang", () => {
  it("pakai tier sesuai rentang harga", () => {
    assert.equal(tentukanFeePerPasang({ harga: 899_000, feeProduk: null, tiers: TIERS }), 50_000);
    assert.equal(tentukanFeePerPasang({ harga: 1_500_000, feeProduk: null, tiers: TIERS }), 75_000);
    assert.equal(tentukanFeePerPasang({ harga: 3_200_000, feeProduk: null, tiers: TIERS }), 100_000);
  });

  it("batas bawah inklusif, batas atas eksklusif", () => {
    assert.equal(cariTier(1_000_000, TIERS)?.fee, 75_000);
    assert.equal(cariTier(999_999, TIERS)?.fee, 50_000);
    assert.equal(cariTier(2_000_000, TIERS)?.fee, 100_000);
  });

  it("fee per produk menimpa tier", () => {
    assert.equal(tentukanFeePerPasang({ harga: 899_000, feeProduk: 90_000, tiers: TIERS }), 90_000);
  });

  it("null kalau tidak ada tier yang cocok dan produk tanpa fee khusus", () => {
    assert.equal(tentukanFeePerPasang({ harga: 500_000, feeProduk: null, tiers: [] }), null);
    const tierCelah = [{ hargaMin: 1_000_000, hargaMax: null, fee: 60_000 }];
    assert.equal(tentukanFeePerPasang({ harga: 500_000, feeProduk: null, tiers: tierCelah }), null);
  });
});

describe("validasiTier", () => {
  it("tier valid tidak menghasilkan error", () => {
    assert.deepEqual(validasiTier(TIERS), []);
    assert.deepEqual(validasiTier([]), []);
  });

  it("menolak fee di luar Rp 50.000 sampai Rp 100.000", () => {
    assert.equal(validasiTier([{ hargaMin: 0, hargaMax: null, fee: 49_999 }]).length, 1);
    assert.equal(validasiTier([{ hargaMin: 0, hargaMax: null, fee: 100_001 }]).length, 1);
    assert.equal(validasiTier([{ hargaMin: 0, hargaMax: null, fee: 75_000.5 }]).length, 1);
  });

  it("menolak rentang terbalik", () => {
    assert.equal(validasiTier([{ hargaMin: 500, hargaMax: 500, fee: 50_000 }]).length, 1);
  });

  it("menolak rentang tumpang tindih, termasuk tier tanpa batas atas yang bukan terakhir", () => {
    assert.equal(
      validasiTier([
        { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
        { hargaMin: 900_000, hargaMax: null, fee: 75_000 },
      ]).length,
      1,
    );
    assert.equal(
      validasiTier([
        { hargaMin: 1_000_000, hargaMax: 2_000_000, fee: 75_000 },
        { hargaMin: 0, hargaMax: null, fee: 50_000 },
      ]).length,
      1,
    );
  });
});

describe("fee per order", () => {
  it("order dua pasang dihitung per pasang dengan fee masing-masing", () => {
    const items = [
      { feePerPasang: 50_000, jumlah: 1 },
      { feePerPasang: 100_000, jumlah: 2 },
    ];
    assert.equal(jumlahPasang(items), 3);
    assert.equal(feeItems(items), 250_000);
  });

  it("kena fee hanya untuk Dikirim/Selesai dengan resi terisi", () => {
    assert.equal(orderKenaFee({ status: "dikirim", resiNomor: "JNE123" }), true);
    assert.equal(orderKenaFee({ status: "selesai", resiNomor: "JNE123" }), true);
    assert.equal(orderKenaFee({ status: "dikirim", resiNomor: null }), false);
    assert.equal(orderKenaFee({ status: "dikirim", resiNomor: "   " }), false);
    for (const status of ["lead", "dikonfirmasi", "batal"] as const) {
      assert.equal(orderKenaFee({ status, resiNomor: "JNE123" }), false);
    }
  });
});

describe("periodeFee", () => {
  it("pakai bulan kalender WIB (UTC+7)", () => {
    // 31 Jan 17:00 UTC = 1 Feb 00:00 WIB
    assert.equal(periodeFee(new Date("2026-01-31T17:00:00Z")), "2026-02");
    assert.equal(periodeFee(new Date("2026-01-31T16:59:59Z")), "2026-01");
    // Pergantian tahun
    assert.equal(periodeFee(new Date("2026-12-31T17:30:00Z")), "2027-01");
  });
});

describe("rekapFeeBulanan", () => {
  const order = (o: Partial<OrderUntukRekap> & Pick<OrderUntukRekap, "kode">): OrderUntukRekap => ({
    id: o.kode,
    status: "dikirim",
    resiNomor: "RESI",
    dikirimPada: new Date("2026-10-10T05:00:00Z"),
    items: [{ feePerPasang: 50_000, jumlah: 1 }],
    ...o,
  });

  it("hanya menjumlah order yang memenuhi syarat di bulan itu", () => {
    const rekap = rekapFeeBulanan(
      [
        order({ kode: "WEB-0002", items: [{ feePerPasang: 75_000, jumlah: 2 }] }),
        order({ kode: "WEB-0001", status: "selesai" }),
        order({ kode: "WEB-0003", status: "batal", resiNomor: null, dikirimPada: null }),
        order({ kode: "WEB-0004", status: "dikonfirmasi", dikirimPada: null }),
        order({ kode: "WEB-0005", dikirimPada: new Date("2026-09-30T18:00:00Z") }), // 1 Okt WIB, ikut
        order({ kode: "WEB-0006", dikirimPada: new Date("2026-10-31T17:00:00Z") }), // 1 Nov WIB, tidak ikut
      ],
      "2026-10",
    );
    assert.equal(rekap.bulan, "2026-10");
    assert.deepEqual(
      rekap.orders.map((o) => o.kode),
      ["WEB-0001", "WEB-0002", "WEB-0005"],
    );
    assert.equal(rekap.jumlahPasang, 4);
    assert.equal(rekap.totalFee, 250_000);
  });

  it("bulan tanpa order menghasilkan nol", () => {
    assert.deepEqual(rekapFeeBulanan([], "2026-10"), { bulan: "2026-10", jumlahPasang: 0, totalFee: 0, orders: [] });
  });
});
