import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validasiTier, type FeeTier } from "@/lib/domain/fee";
import {
  barisDariTier,
  labelRentang,
  normalisasiNomorWa,
  tierRapat,
  validasiAmbang,
  validasiBarisTier,
  validasiRekening,
} from "@/lib/domain/pengaturan";
import { formatWaktuWib } from "@/lib/domain/waktu";

describe("validasiBarisTier", () => {
  it("batas jadi rentang yang menyambung, mulai Rp 0, tier terakhir ke atas", () => {
    const hasil = validasiBarisTier([
      { batasAtas: "1.000.000", fee: "50.000" },
      { batasAtas: "Rp 2.000.000", fee: "75000" },
      { batasAtas: "diabaikan", fee: "100.000" },
    ]);
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.data, [
      { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
      { hargaMin: 1_000_000, hargaMax: 2_000_000, fee: 75_000 },
      { hargaMin: 2_000_000, hargaMax: null, fee: 100_000 },
    ]);
    assert.deepEqual(validasiTier(hasil.data), []);
    assert.equal(tierRapat(hasil.data), true);
  });

  it("satu baris = satu tier untuk semua harga", () => {
    const hasil = validasiBarisTier([{ batasAtas: "", fee: "60.000" }]);
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.data, [{ hargaMin: 0, hargaMax: null, fee: 60_000 }]);
  });

  it("fee di luar Rp 50.000 sampai Rp 100.000 ditolak per baris", () => {
    const hasil = validasiBarisTier([
      { batasAtas: "1.000.000", fee: "45.000" },
      { batasAtas: "", fee: "120.000" },
    ]);
    assert.equal(hasil.ok, false);
    assert.ok(!hasil.ok && hasil.error["fee.0"] && hasil.error["fee.1"]);
  });

  it("batas harus naik; baris berikutnya dicek dari batas valid terakhir", () => {
    const hasil = validasiBarisTier([
      { batasAtas: "1.000.000", fee: "50.000" },
      { batasAtas: "800.000", fee: "75.000" },
      { batasAtas: "1.500.000", fee: "80.000" },
      { batasAtas: "", fee: "100.000" },
    ]);
    assert.equal(hasil.ok, false);
    assert.ok(!hasil.ok);
    assert.match(hasil.error["batas.1"], /Rp 1\.000\.000/);
    assert.equal(hasil.error["batas.2"], undefined);
  });

  it("batas kosong atau desimal di baris tengah ditolak", () => {
    const hasil = validasiBarisTier([
      { batasAtas: "", fee: "50.000" },
      { batasAtas: "", fee: "75.000" },
    ]);
    assert.ok(!hasil.ok && hasil.error["batas.0"]);
    assert.ok(!validasiBarisTier([{ batasAtas: "1000000,5", fee: "50000" }, { batasAtas: "", fee: "60000" }]).ok);
  });

  it("tanpa baris ditolak", () => {
    const hasil = validasiBarisTier([]);
    assert.ok(!hasil.ok && hasil.error.umum);
  });
});

describe("tierRapat dan barisDariTier", () => {
  const RAPAT: FeeTier[] = [
    { hargaMin: 1_000_000, hargaMax: null, fee: 75_000 },
    { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
  ];

  it("urutan simpan tidak penting", () => {
    assert.equal(tierRapat(RAPAT), true);
    assert.deepEqual(barisDariTier(RAPAT), [
      { batasAtas: "1.000.000", fee: "50.000" },
      { batasAtas: "", fee: "75.000" },
    ]);
  });

  it("bolong, tidak mulai dari 0, atau ada batas atas di tier terakhir = tidak rapat", () => {
    assert.equal(tierRapat([{ hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 }, { hargaMin: 1_500_000, hargaMax: null, fee: 75_000 }]), false);
    assert.equal(tierRapat([{ hargaMin: 500_000, hargaMax: null, fee: 50_000 }]), false);
    assert.equal(tierRapat([{ hargaMin: 0, hargaMax: 3_000_000, fee: 50_000 }]), false);
    assert.equal(tierRapat([]), false);
  });

  it("tanpa tier, editor mulai dengan satu baris kosong", () => {
    assert.deepEqual(barisDariTier([]), [{ batasAtas: "", fee: "" }]);
  });

  it("label rentang menyebut batas atas sebagai eksklusif", () => {
    assert.equal(labelRentang({ hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 }), "Rp 0 sampai di bawah Rp 1.000.000");
    assert.equal(labelRentang({ hargaMin: 2_000_000, hargaMax: null, fee: 100_000 }), "Rp 2.000.000 ke atas");
  });
});

describe("normalisasiNomorWa", () => {
  it("format umum Indonesia jadi 62...", () => {
    for (const teks of ["0812-3456-7890", "+62 812 3456 7890", "6281234567890", "812 3456 7890", "(0812) 3456.7890"]) {
      assert.equal(normalisasiNomorWa(teks), "6281234567890", teks);
    }
  });

  it("huruf, terlalu pendek, terlalu panjang, atau bukan +62 ditolak", () => {
    for (const teks of ["", "0812abc", "08123", "08123456789012345", "+1 415 555 0100"]) {
      assert.equal(normalisasiNomorWa(teks), null, teks);
    }
  });
});

describe("validasiRekening", () => {
  it("spasi dan tanda pemisah di nomor dibuang, spasi ganda di nama dirapikan", () => {
    const hasil = validasiRekening({ bank: "  BCA ", nomor: "123-456 7890", atasNama: "Toko  Sepatu  Arga" });
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.data, { bank: "BCA", nomor: "1234567890", atasNama: "Toko Sepatu Arga" });
  });

  it("isian kosong dan nomor bukan angka ditolak per kolom", () => {
    const hasil = validasiRekening({ bank: "", nomor: "12AB", atasNama: " " });
    assert.ok(!hasil.ok);
    assert.deepEqual(Object.keys(hasil.error).sort(), ["atasNama", "bank", "nomor"]);
  });
});

describe("validasiAmbang", () => {
  it("2 sampai 50", () => {
    assert.deepEqual(validasiAmbang(" 3 "), { ok: true, data: { readyMin: 3 } });
    for (const teks of ["1", "51", "2.5", "", "tiga"]) assert.equal(validasiAmbang(teks).ok, false, teks);
  });
});

describe("formatWaktuWib", () => {
  it("UTC 23.30 tanggal 31 jadi 1 hari berikutnya di WIB", () => {
    assert.equal(formatWaktuWib(new Date("2026-10-31T17:30:00Z")), "1 Nov 2026, 00.30 WIB");
  });
});
