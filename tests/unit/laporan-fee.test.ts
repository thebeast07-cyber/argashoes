import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geserBulan, isBulan, labelBulan, rentangBulanWib, ringkasPerBulan, statusBayar } from "@/lib/domain/laporan-fee";

describe("bulan", () => {
  it("validasi, label, geser lintas tahun", () => {
    assert.equal(isBulan("2026-10"), true);
    assert.equal(isBulan("2026-13"), false);
    assert.equal(isBulan("2026-1"), false);
    assert.equal(labelBulan("2026-10"), "Oktober 2026");
    assert.equal(geserBulan("2026-01", -1), "2025-12");
    assert.equal(geserBulan("2026-12", 1), "2027-01");
  });

  it("rentang bulan WIB dalam UTC: mulai 1 Okt 00.00 WIB, akhir 1 Nov 00.00 WIB", () => {
    const { mulai, akhir } = rentangBulanWib("2026-10");
    assert.equal(mulai.toISOString(), "2026-09-30T17:00:00.000Z");
    assert.equal(akhir.toISOString(), "2026-10-31T17:00:00.000Z");
  });
});

describe("ringkasPerBulan", () => {
  it("dikelompokkan per bulan WIB, terbaru dulu, bulan berjalan selalu ada", () => {
    const r = ringkasPerBulan(
      [
        { dikirimPada: new Date("2026-08-31T18:00:00Z"), pasang: 2, fee: 140_000 }, // 1 Sep WIB
        { dikirimPada: new Date("2026-09-10T03:00:00Z"), pasang: 1, fee: 50_000 },
        { dikirimPada: new Date("2026-08-31T16:00:00Z"), pasang: 1, fee: 60_000 }, // 31 Agu WIB
      ],
      new Date("2026-10-17T03:00:00Z"),
    );
    assert.deepEqual(r, [
      { bulan: "2026-10", order: 0, pasang: 0, fee: 0 },
      { bulan: "2026-09", order: 2, pasang: 3, fee: 190_000 },
      { bulan: "2026-08", order: 1, pasang: 1, fee: 60_000 },
    ]);
  });
});

describe("statusBayar", () => {
  const tgl = new Date("2026-11-03T03:00:00Z");
  it("belum, lunas, atau selisih kalau rekap berubah sesudah ditandai", () => {
    assert.deepEqual(statusBayar(null, 100_000), { jenis: "belum" });
    assert.deepEqual(statusBayar({ total: 100_000, dibayarPada: null }, 100_000), { jenis: "belum" });
    assert.deepEqual(statusBayar({ total: 100_000, dibayarPada: tgl }, 100_000), { jenis: "lunas", dibayarPada: tgl });
    assert.deepEqual(statusBayar({ total: 100_000, dibayarPada: tgl }, 150_000), { jenis: "selisih", dibayarPada: tgl, dibayar: 100_000, selisih: 50_000 });
  });
});

describe("tanggal pembayaran", () => {
  it("hari ini WIB, tanggal input jadi 12.00 WIB, tanggal mustahil ditolak", async () => {
    const { hariIniWib, tanggalWib, formatTanggalWib } = await import("@/lib/domain/laporan-fee");
    assert.equal(hariIniWib(new Date("2026-10-17T18:00:00Z")), "2026-10-18");
    assert.equal(tanggalWib("2026-10-05")?.toISOString(), "2026-10-05T05:00:00.000Z");
    assert.equal(tanggalWib("2026-02-30"), null);
    assert.equal(tanggalWib("5/10/2026"), null);
    assert.equal(formatTanggalWib(tanggalWib("2026-10-05")!), "5 Oktober 2026");
  });
});
