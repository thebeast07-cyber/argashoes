import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cekBatasLogin, pesanBatasLogin } from "@/lib/domain/batas-login";

const SEKARANG = new Date("2026-10-20T10:00:00Z");
const menitLalu = (...m: number[]) => m.map((x) => new Date(SEKARANG.getTime() - x * 60_000));

describe("cekBatasLogin", () => {
  it("di bawah batas boleh login", () => {
    assert.deepEqual(cekBatasLogin({ email: menitLalu(1, 2, 3, 4), ip: menitLalu(1, 2, 3, 4) }, SEKARANG), { boleh: true });
  });

  it("5 gagal untuk satu email dalam 15 menit: diblokir sampai yang tertua keluar jendela", () => {
    assert.deepEqual(cekBatasLogin({ email: menitLalu(10, 1, 2, 3, 4), ip: [] }, SEKARANG), { boleh: false, tungguMenit: 5 });
  });

  it("gagal yang lebih dari 15 menit lalu tidak dihitung", () => {
    assert.deepEqual(cekBatasLogin({ email: menitLalu(15, 16, 30, 1, 2), ip: [] }, SEKARANG), { boleh: true });
  });

  it("lebih dari batas: lepas saat jumlahnya turun di bawah batas, bukan saat semua habis", () => {
    // 6 gagal: 14,12,10,3,2,1 menit lalu. Perlu 2 keluar jendela, jadi lepas saat yang 12 menit lalu keluar (3 menit lagi).
    assert.deepEqual(cekBatasLogin({ email: menitLalu(14, 12, 10, 3, 2, 1), ip: [] }, SEKARANG), { boleh: false, tungguMenit: 3 });
  });

  it("20 gagal dari satu IP (email berbeda-beda) juga diblokir; tunggu minimal 1 menit", () => {
    const ip = menitLalu(...Array.from({ length: 20 }, (_, i) => 14.99 - i * 0.5));
    assert.deepEqual(cekBatasLogin({ email: [], ip }, SEKARANG), { boleh: false, tungguMenit: 1 });
    assert.deepEqual(cekBatasLogin({ email: [], ip: ip.slice(1) }, SEKARANG), { boleh: true });
  });

  it("pesan menyebut menit", () => {
    assert.equal(pesanBatasLogin(7), "Terlalu banyak percobaan login yang salah. Coba lagi dalam 7 menit.");
  });
});
