import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bannerTayang,
  galatGambarBanner,
  inputWaktuWib,
  JEDA_TAMPIL_ULANG_MS,
  parseWaktuWib,
  perluTampilOverlay,
  statusBanner,
  tautanSah,
  urutBannerAdmin,
  validasiBanner,
} from "@/lib/domain/banner";

const input = { judul: "Promo 11.11", tautan: "", mulai: "2026-11-11T00:00", selesai: "2026-11-12T00:00" };

describe("waktu banner (WIB)", () => {
  it("isian dibaca sebagai WIB dan bisa dikembalikan ke isian", () => {
    const d = parseWaktuWib("2026-11-11T00:00")!;
    assert.equal(d.toISOString(), "2026-11-10T17:00:00.000Z");
    assert.equal(inputWaktuWib(d), "2026-11-11T00:00");
  });

  it("tanggal yang tidak ada atau format salah ditolak", () => {
    for (const t of ["2026-11-31T10:00", "2026-11-11", "11/11/2026 00:00", "2026-11-11T24:00", ""]) assert.equal(parseWaktuWib(t), null, t);
  });
});

describe("validasiBanner", () => {
  it("data dirapikan, jadwal dibaca WIB", () => {
    const r = validasiBanner({ ...input, judul: "  Promo   11.11 ", tautan: " /?kategori=Lifestyle " });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.data.judul, "Promo 11.11");
    assert.equal(r.data.tautan, "/?kategori=Lifestyle");
    assert.equal(r.data.mulai.toISOString(), "2026-11-10T17:00:00.000Z");
  });

  it("tanpa tujuan berarti gambar tidak bisa diketuk", () => {
    const r = validasiBanner(input);
    assert.ok(r.ok && r.data.tautan === null);
  });

  it("menolak judul kosong, jadwal terbalik, tautan asing", () => {
    const r = validasiBanner({ ...input, judul: " ", selesai: "2026-11-10T23:00", tautan: "//jahat.com" });
    assert.ok(!r.ok);
    if (r.ok) return;
    assert.deepEqual(Object.keys(r.error).sort(), ["judul", "selesai", "tautan"]);
    assert.ok(!validasiBanner({ ...input, tautan: "javascript:alert(1)" }).ok);
  });

  it("tautan sah: path web ini atau https", () => {
    for (const t of ["/", "/produk/abc", "https://instagram.com/argashoes"]) assert.ok(tautanSah(t), t);
    for (const t of ["//jahat.com", "http://contoh.com", "javascript:alert(1)", "produk/abc", "/ada spasi"]) assert.ok(!tautanSah(t), t);
  });
});

describe("gambar dan overlay", () => {
  it("dua gambar wajib", () => {
    assert.deepEqual(Object.keys(galatGambarBanner({ potret: false, lanskap: true })), ["gambarPotret"]);
    assert.deepEqual(Object.keys(galatGambarBanner({ potret: true, lanskap: false })), ["gambarLanskap"]);
    assert.deepEqual(galatGambarBanner({ potret: true, lanskap: true }), {});
  });

  it("overlay yang ditutup baru muncul lagi setelah 24 jam", () => {
    const t = 1_000_000_000;
    assert.ok(perluTampilOverlay(null, t));
    assert.ok(!perluTampilOverlay(t, t + JEDA_TAMPIL_ULANG_MS - 1));
    assert.ok(perluTampilOverlay(t, t + JEDA_TAMPIL_ULANG_MS));
    assert.ok(perluTampilOverlay(Number.NaN, t), "isi localStorage rusak");
    assert.ok(perluTampilOverlay(t + 5000, t), "jam perangkat mundur");
  });
});

describe("jadwal tayang", () => {
  const mulai = new Date("2026-11-10T17:00:00Z");
  const selesai = new Date("2026-11-11T17:00:00Z");
  const b = { aktif: true, mulai, selesai };

  it("status mengikuti waktu, batas selesai eksklusif", () => {
    assert.equal(statusBanner(b, new Date("2026-11-10T16:59:59Z")), "dijadwalkan");
    assert.equal(statusBanner(b, mulai), "tayang");
    assert.equal(statusBanner(b, selesai), "selesai");
    assert.equal(statusBanner({ ...b, aktif: false }, mulai), "nonaktif");
  });

  it("beranda menampilkan satu banner tayang yang mulainya paling baru", () => {
    const lama = { id: "lama", aktif: true, mulai: new Date("2026-11-01T00:00:00Z"), selesai: new Date("2026-11-30T00:00:00Z") };
    const baru = { id: "baru", ...b };
    const mati = { id: "mati", ...b, aktif: false, mulai: new Date("2026-11-11T00:00:00Z") };
    assert.equal(bannerTayang([lama, baru, mati], new Date("2026-11-11T00:00:00Z"))?.id, "baru");
    assert.equal(bannerTayang([lama, baru], new Date("2026-12-01T00:00:00Z")), null);
  });

  it("urutan admin: tayang, terjadwal terdekat, dimatikan, sudah lewat", () => {
    const sekarang = new Date("2026-11-11T00:00:00Z");
    const daftar = [
      { id: "lewat", aktif: true, mulai: new Date("2026-10-01Z"), selesai: new Date("2026-10-02Z") },
      { id: "1212", aktif: true, mulai: new Date("2026-12-11T17:00Z"), selesai: new Date("2026-12-12T17:00Z") },
      { id: "mati", aktif: false, mulai: new Date("2026-11-01Z"), selesai: new Date("2026-11-30Z") },
      { id: "tayang", aktif: true, mulai: new Date("2026-11-10T17:00Z"), selesai: new Date("2026-11-11T17:00Z") },
      { id: "1111b", aktif: true, mulai: new Date("2026-11-20Z"), selesai: new Date("2026-11-21Z") },
    ];
    assert.deepEqual(
      urutBannerAdmin(daftar, sekarang).map((x) => x.id),
      ["tayang", "1111b", "1212", "mati", "lewat"],
    );
  });
});
