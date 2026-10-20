import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bacaPerintahPesan, idAkunSah, penerimaPesan, rapikanIsiPesan, ringkasanAkunUntukAi, type AkunPesan } from "@/lib/domain/pesan-admin";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const AKUN: AkunPesan[] = [
  { id: id(1), nama: "Najah", peran: "pemilik" },
  { id: id(2), nama: "Arga", peran: "admin_toko" },
  { id: id(3), nama: "Bima", peran: "admin_toko" },
];

describe("pesan antar akun", () => {
  it("penerima = semua akun kecuali diri sendiri; ringkasan untuk Gemini tanpa email", () => {
    const p = penerimaPesan(AKUN, id(1));
    assert.deepEqual(
      p.map((a) => a.nama),
      ["Arga", "Bima"],
    );
    assert.equal(ringkasanAkunUntukAi(p), "1. Arga (Admin toko)\n2. Bima (Admin toko)");
    assert.equal(ringkasanAkunUntukAi([]), "Belum ada akun lain.");
  });

  it("isi pesan dirapikan; kosong atau terlalu panjang ditolak", () => {
    assert.equal(rapikanIsiPesan("  Tolong isi WA ya\r\n\r\n\r\n\r\nmakasih  "), "Tolong isi WA ya\n\nmakasih");
    for (const isi of ["   ", "", 5, null, "x".repeat(1001)]) assert.equal(rapikanIsiPesan(isi), null);
  });

  it("kirimPesan dari Gemini dipetakan ke akun; nomor salah dan isi kosong jadi masalah; tanpa kirimPesan → null", () => {
    const p = penerimaPesan(AKUN, id(1));
    assert.deepEqual(bacaPerintahPesan({ nomorAkun: 1, isi: " Tolong isi nomor WhatsApp ya. " }, p), {
      rencana: { keId: id(2), keNama: "Arga", kePeran: "Admin toko", isi: "Tolong isi nomor WhatsApp ya." },
    });
    assert.ok("masalah" in bacaPerintahPesan({ nomorAkun: 9, isi: "halo" }, p)!);
    assert.ok("masalah" in bacaPerintahPesan({ nomorAkun: 1, isi: "  " }, p)!);
    assert.equal(bacaPerintahPesan(undefined, p), null);
    assert.equal(bacaPerintahPesan({}, p), null);
  });

  it("id penerima dari browser harus uuid", () => {
    assert.equal(idAkunSah(id(2)), true);
    for (const x of ["", "1", "'; drop table users;--", 5, null]) assert.equal(idAkunSah(x), false);
  });
});
