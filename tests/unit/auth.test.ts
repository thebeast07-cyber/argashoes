import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { IZIN, punyaIzin } from "@/lib/auth/roles";

describe("punyaIzin", () => {
  it("pemilik punya semua izin", () => {
    for (const izin of IZIN) assert.equal(punyaIzin("pemilik", izin), true, izin);
  });

  it("admin toko: produk, order, pelanggan, pengaturan toko, dan mengajukan usulan", () => {
    for (const izin of ["produk.kelola", "order.kelola", "pelanggan.lihat", "pengaturan.ubah", "usulan.ajukan"] as const) {
      assert.equal(punyaIzin("admin_toko", izin), true, izin);
    }
  });

  it("admin toko tidak bisa mengubah fee atau rekening langsung, dan tidak bisa memutuskan usulan", () => {
    for (const izin of ["fee.atur", "rekening.atur", "usulan.putuskan", "fee.laporan", "akun.kelola", "analitik.lihat"] as const) {
      assert.equal(punyaIzin("admin_toko", izin), false, izin);
    }
  });
});

describe("password", () => {
  it("hash bisa diverifikasi dan berbeda tiap kali (salt acak)", async () => {
    const a = await hashPassword("rahasia-panjang-1");
    const b = await hashPassword("rahasia-panjang-1");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("rahasia-panjang-1", a), true);
    assert.equal(await verifyPassword("rahasia-panjang-2", a), false);
  });

  it("hash yang rusak dianggap gagal", async () => {
    assert.equal(await verifyPassword("apa saja", "bukan-hash"), false);
  });
});
