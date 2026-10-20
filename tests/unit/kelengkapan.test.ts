import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { punyaIzin, type Peran } from "@/lib/auth/roles";
import { daftarBelumLengkap, type DataKelengkapan } from "@/lib/domain/kelengkapan";

const KOSONG: DataKelengkapan = {
  adaNomorWa: false,
  adaRekening: false,
  rekeningMenunggu: false,
  adaTier: false,
  modelTanpaFoto: { total: 7, contoh: [{ id: "a", nama: "Nike Dunk" }] },
};
const LENGKAP: DataKelengkapan = { adaNomorWa: true, adaRekening: true, rekeningMenunggu: false, adaTier: true, modelTanpaFoto: { total: 0, contoh: [] } };
const untuk = (peran: Peran) => (izin: Parameters<typeof punyaIzin>[1]) => punyaIzin(peran, izin);
const kunci = (d: DataKelengkapan, peran: Peran) => daftarBelumLengkap(d, untuk(peran)).map((b) => b.kunci);

describe("daftarBelumLengkap", () => {
  it("semua kosong: yang menghambat pembeli di atas; tier fee hanya untuk pemilik web", () => {
    assert.deepEqual(kunci(KOSONG, "pemilik"), ["nomor_wa", "rekening", "tier", "foto"]);
    assert.deepEqual(kunci(KOSONG, "admin_toko"), ["nomor_wa", "rekening", "foto"]);
  });

  it("rekening: pemilik mengisi langsung, admin toko mengajukan", () => {
    const [pemilik] = daftarBelumLengkap({ ...LENGKAP, adaRekening: false }, untuk("pemilik"));
    const [toko] = daftarBelumLengkap({ ...LENGKAP, adaRekening: false }, untuk("admin_toko"));
    assert.deepEqual([pemilik.aksi?.label, toko.aksi?.label], ["Isi rekening", "Ajukan rekening"]);
  });

  it("rekening sudah diajukan: admin toko diberi tahu menunggu, pemilik tidak didobel (sudah ada kotak usulan)", () => {
    const d = { ...LENGKAP, adaRekening: false, rekeningMenunggu: true };
    assert.deepEqual(kunci(d, "pemilik"), []);
    const [toko] = daftarBelumLengkap(d, untuk("admin_toko"));
    assert.deepEqual([toko.penting, toko.aksi], [false, null]);
  });

  it("model tanpa foto membawa daftar contoh; semua lengkap → kosong", () => {
    const foto = daftarBelumLengkap(KOSONG, untuk("admin_toko")).find((b) => b.kunci === "foto");
    assert.equal(foto?.teks, "7 model yang tampil di katalog belum ada fotonya.");
    assert.deepEqual(foto?.model, [{ id: "a", nama: "Nike Dunk" }]);
    assert.equal(foto?.modelLain, 6);
    assert.deepEqual(kunci(LENGKAP, "pemilik"), []);
  });
});
