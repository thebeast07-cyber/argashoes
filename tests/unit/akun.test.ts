import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cekSandiBaru, cekUbahAktif } from "@/lib/domain/akun";

const pemilik = { id: "p1", peran: "pemilik" as const, aktif: true };
const admin = { id: "a1", peran: "admin_toko" as const, aktif: true };

describe("cekSandiBaru", () => {
  it("menolak sandi di bawah 10 karakter", () => {
    assert.match(cekSandiBaru("pendek") ?? "", /minimal 10/);
    assert.equal(cekSandiBaru("cukup-panjang"), null);
  });
});

describe("cekUbahAktif", () => {
  it("pemilik bisa menonaktifkan admin toko", () => {
    assert.equal(cekUbahAktif({ pelakuId: "p1", sasaran: admin, aktifBaru: false, jumlahPemilikAktif: 1 }), null);
  });

  it("tidak bisa menonaktifkan akun sendiri", () => {
    assert.match(cekUbahAktif({ pelakuId: "p1", sasaran: pemilik, aktifBaru: false, jumlahPemilikAktif: 2 }) ?? "", /sendiri/);
  });

  it("pemilik aktif terakhir tidak bisa dinonaktifkan", () => {
    assert.match(cekUbahAktif({ pelakuId: "p2", sasaran: pemilik, aktifBaru: false, jumlahPemilikAktif: 1 }) ?? "", /minimal satu pemilik/);
    assert.equal(cekUbahAktif({ pelakuId: "p2", sasaran: pemilik, aktifBaru: false, jumlahPemilikAktif: 2 }), null);
  });

  it("mengaktifkan lagi selalu boleh, tapi status yang sama ditolak", () => {
    assert.equal(cekUbahAktif({ pelakuId: "p1", sasaran: { ...admin, aktif: false }, aktifBaru: true, jumlahPemilikAktif: 1 }), null);
    assert.match(cekUbahAktif({ pelakuId: "p1", sasaran: admin, aktifBaru: true, jumlahPemilikAktif: 1 }) ?? "", /sudah aktif/);
  });
});
