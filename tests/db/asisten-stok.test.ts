import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, variants } from "@/db/schema";
import { buatUser } from "@/lib/auth/session";
import { bacaPerintahStok, rencanaStokAsisten } from "@/lib/domain/asisten-aksi";
import { dataStokAsisten } from "@/lib/produk/data";
import { buatProduk, tambahVarian, ubahFotoProduk, ubahStok, ubahStokLewatAsisten } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  const af1 = await buatProduk(
    db,
    { nama: "Air Force 1 White", brand: "Nike", kategori: null, deskripsi: "Putih bersih.", harga: 1_599_000, hargaCoret: null, feePerPasang: null, aktif: true },
    adminId,
  );
  await tambahVarian(db, af1, { sku: "CW2288-111-42", size: "42", stok: 2 }, adminId);
  await tambahVarian(db, af1, { sku: "CW2288-111-43", size: "43", stok: 1 }, adminId);
  await ubahFotoProduk(db, af1, { jenis: "tambah", url: "/foto/a.jpg" }, adminId);
  await buatProduk(
    db,
    { nama: "Samba OG", brand: "Adidas", kategori: null, deskripsi: "  ", harga: 1_800_000, hargaCoret: null, feePerPasang: null, aktif: true },
    adminId,
  );
});
after(() => close());

async function stok(sku: string) {
  return (await db.select({ stok: variants.stok }).from(variants).where(eq(variants.sku, sku)))[0].stok;
}

describe("ubah stok lewat asisten", () => {
  it("data asisten membawa jumlah foto dan ada tidaknya deskripsi", async () => {
    const { model } = await dataStokAsisten(db);
    assert.deepEqual(
      model.map((m) => [m.nama, m.jumlahFoto, m.adaDeskripsi]),
      [
        ["Samba OG", 0, false],
        ["Air Force 1 White", 1, true],
      ],
    );
  });

  it("perintah AI → rencana → simpan: stok berubah dan tercatat dengan sumber asisten", async () => {
    const { model, varian } = await dataStokAsisten(db);
    const nomor = model.findIndex((m) => m.nama === "Air Force 1 White") + 1;
    const rencana = rencanaStokAsisten(
      bacaPerintahStok([
        { nomorModel: nomor, size: "42", cara: "tambah", jumlah: 3 },
        { nomorModel: nomor, size: "43", cara: "jadi", jumlah: 0 },
      ]),
      model,
      varian,
    );
    assert.equal(rencana?.baris.length, 2);
    const hasil = await ubahStokLewatAsisten(db, rencana!.baris, adminId);
    assert.equal(hasil, "ok");
    assert.equal(await stok("CW2288-111-42"), 5);
    assert.equal(await stok("CW2288-111-43"), 0);
    const log = await db.select().from(auditLog).where(eq(auditLog.aksi, "stok.diubah"));
    assert.deepEqual(
      log.map((l) => l.data),
      [
        { sku: "CW2288-111-42", dari: 2, ke: 5, sumber: "asisten" },
        { sku: "CW2288-111-43", dari: 1, ke: 0, sumber: "asisten" },
      ],
    );
  });

  it("kalau stok diubah orang lain sebelum Simpan, tidak ada yang disimpan", async () => {
    const [v42] = await db.select().from(variants).where(eq(variants.sku, "CW2288-111-42"));
    const [v43] = await db.select().from(variants).where(eq(variants.sku, "CW2288-111-43"));
    const kartu = [
      { variantId: v42.id, dari: 5, ke: 6 },
      { variantId: v43.id, dari: 0, ke: 2 },
    ];
    await ubahStok(db, v43.id, 1, adminId);
    assert.equal(await ubahStokLewatAsisten(db, kartu, adminId), "berubah");
    assert.equal(await stok("CW2288-111-42"), 5);
    assert.equal(await ubahStokLewatAsisten(db, [{ variantId: "00000000-0000-4000-8000-000000000000", dari: 0, ke: 1 }], adminId), "tidak_ada");
  });
});
