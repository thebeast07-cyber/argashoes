import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { judulUsulan, ringkasNilai, ringkasRiwayat } from "@/lib/pengaturan/ringkasan";

describe("ringkasNilai", () => {
  it("per jenis, termasuk nilai kosong", () => {
    assert.equal(ringkasNilai("tier", []), "belum ada tier");
    assert.equal(ringkasNilai("tier", [{ hargaMin: 0, hargaMax: null, fee: 50_000 }]), "1 tier");
    assert.equal(ringkasNilai("fee_produk", null), "ikut tier");
    assert.equal(ringkasNilai("fee_produk", 60_000), "Rp 60.000");
    assert.equal(ringkasNilai("rekening", null), "belum diisi");
    assert.equal(ringkasNilai("rekening", { bank: "BCA", nomor: "123456", atasNama: "Arga" }), "BCA 123456 a.n. Arga");
  });

  it("judul fee produk menyebut produknya", () => {
    assert.equal(judulUsulan("fee_produk", { nama: "Samba", brand: "Adidas" }), "Fee khusus Adidas Samba");
    assert.equal(judulUsulan("rekening"), "Rekening tampil");
  });
});

describe("ringkasRiwayat", () => {
  it("tier: sumber perubahan dan daftar tier baru", () => {
    const r = ringkasRiwayat({
      aksi: "fee_tier.diubah",
      data: { dari: [], ke: [{ hargaMin: 0, hargaMax: null, fee: 50_000 }], usulanId: "u1" },
      produkNama: null,
    });
    assert.equal(r.judul, "Tier fee diganti");
    assert.deepEqual(r.detail, ["Lewat usulan yang disetujui", "Rp 0 ke atas: Rp 50.000"]);
  });

  it("fee produk dari form produk: nama produk dan dari → ke", () => {
    const r = ringkasRiwayat({ aksi: "produk.diubah", data: { feePerPasang: { dari: null, ke: 70_000 } }, produkNama: "Samba" });
    assert.equal(r.judul, "Fee khusus Samba diubah");
    assert.deepEqual(r.detail, ["Diubah langsung", "ikut tier → Rp 70.000"]);
  });

  it("pengaturan toko: hanya kolom yang berubah", () => {
    const r = ringkasRiwayat({ aksi: "pengaturan.diubah", data: { nomorWa: { dari: null, ke: "6281234567890" } }, produkNama: null });
    assert.deepEqual(r.detail, ["Nomor WhatsApp: kosong → +6281234567890"]);
  });

  it("keputusan usulan membawa catatan kalau ada", () => {
    assert.deepEqual(ringkasRiwayat({ aksi: "usulan.ditolak", data: { jenis: "rekening", catatan: "Nomor salah" }, produkNama: null }), {
      judul: "Usulan rekening ditolak",
      detail: ["Catatan: Nomor salah"],
    });
    assert.deepEqual(ringkasRiwayat({ aksi: "usulan.disetujui", data: { jenis: "tier", catatan: null }, produkNama: null }).detail, []);
  });
});

describe("ringkasRiwayat usulan fee produk", () => {
  it("menyebut produknya dari nama yang dicatat saat itu", () => {
    const r = ringkasRiwayat({ aksi: "usulan.diajukan", data: { jenis: "fee_produk", produk: "Adidas Samba OG", ke: 60_000 }, produkNama: null });
    assert.equal(r.judul, "Usulan fee khusus Adidas Samba OG diajukan");
  });
});
