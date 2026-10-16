import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, products, settings, variants } from "@/db/schema";
import { parseCsv } from "@/lib/csv";
import { rencanakanImportKatalog, rencanakanImportStok } from "@/lib/domain/import";
import type { DataProduk } from "@/lib/domain/produk";
import { buatUser } from "@/lib/auth/session";
import { ambilProduk, barisEkspor, daftarProduk, dataUntukImport, getAmbangStok, opsiFilter } from "@/lib/produk/data";
import { buatProduk, hapusVarian, tambahVarian, terapkanImportKatalog, terapkanImportStok, ubahProduk, ubahStok } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;

const AIR_MAX: DataProduk = {
  nama: "Air Max 90",
  brand: "Nike",
  kategori: "Lifestyle",
  deskripsi: null,
  harga: 1_899_000,
  hargaCoret: null,
  feePerPasang: 70_000,
  aktif: true,
};

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
});
after(() => close());

async function jumlahAudit(aksi: string) {
  return (await db.select().from(auditLog).where(eq(auditLog.aksi, aksi))).length;
}

describe("produk dan varian", () => {
  let produkId: string;

  it("buat produk + varian, tercatat di audit log", async () => {
    produkId = await buatProduk(db, AIR_MAX, adminId);
    assert.equal(await tambahVarian(db, produkId, { sku: "NK-AM90-42", size: "42", stok: 3 }, adminId), "ok");
    assert.equal(await tambahVarian(db, produkId, { sku: "NK-AM90-40", size: "40", stok: 0 }, adminId), "ok");
    assert.equal(await jumlahAudit("produk.dibuat"), 1);
    assert.equal(await jumlahAudit("varian.dibuat"), 2);

    const p = await ambilProduk(db, produkId);
    assert.deepEqual(p?.varian.map((v) => v.size), ["40", "42"]);
  });

  it("SKU dobel dan size dobel di produk yang sama ditolak dengan kode yang jelas", async () => {
    assert.equal(await tambahVarian(db, produkId, { sku: "NK-AM90-42", size: "43", stok: 1 }, adminId), "sku_dipakai");
    assert.equal(await tambahVarian(db, produkId, { sku: "NK-AM90-42B", size: "42", stok: 1 }, adminId), "size_dipakai");
  });

  it("admin toko tidak bisa mengubah fee lewat form produk", async () => {
    await ubahProduk(db, produkId, { ...AIR_MAX, harga: 1_799_000, feePerPasang: 100_000 }, adminId, { bolehUbahFee: false });
    const [p] = await db.select().from(products).where(eq(products.id, produkId));
    assert.equal(p.harga, 1_799_000);
    assert.equal(p.feePerPasang, 70_000);
    const [log] = await db.select().from(auditLog).where(eq(auditLog.aksi, "produk.diubah"));
    assert.deepEqual(log.data, { harga: { dari: 1_899_000, ke: 1_799_000 } });
  });

  it("ubah stok dan tandai habis tercatat dari-ke", async () => {
    const p = await ambilProduk(db, produkId);
    const v42 = p!.varian.find((v) => v.size === "42")!;
    await ubahStok(db, v42.id, 0, adminId, "stok.tandai_habis");
    const [log] = await db.select().from(auditLog).where(eq(auditLog.aksi, "stok.tandai_habis"));
    assert.deepEqual(log.data, { sku: "NK-AM90-42", dari: 3, ke: 0 });
    // Stok sama: tidak ada log baru.
    await ubahStok(db, v42.id, 0, adminId);
    assert.equal(await jumlahAudit("stok.diubah"), 0);
  });

  it("daftar: cari nama/brand/SKU, filter brand dan size", async () => {
    const samba = await buatProduk(db, { ...AIR_MAX, nama: "Samba OG", brand: "Adidas", feePerPasang: null }, adminId);
    await tambahVarian(db, samba, { sku: "AD-SMB-41", size: "41 1/3", stok: 5 }, adminId);

    assert.equal((await daftarProduk(db, {})).total, 2);
    assert.deepEqual((await daftarProduk(db, { q: "samba" })).items.map((p) => p.nama), ["Samba OG"]);
    assert.deepEqual((await daftarProduk(db, { q: "am90-40" })).items.map((p) => p.nama), ["Air Max 90"]);
    assert.deepEqual((await daftarProduk(db, { brand: "Nike" })).items.map((p) => p.nama), ["Air Max 90"]);
    assert.deepEqual((await daftarProduk(db, { size: "41 1/3" })).items.map((p) => p.nama), ["Samba OG"]);
    assert.equal((await daftarProduk(db, { q: "100%_" })).total, 0);

    const opsi = await opsiFilter(db);
    assert.deepEqual(opsi.brands, ["Adidas", "Nike"]);
    assert.deepEqual(opsi.sizes, ["40", "41 1/3", "42"]);
  });

  it("hapus varian tercatat", async () => {
    const p = await ambilProduk(db, produkId);
    assert.equal(await hapusVarian(db, p!.varian[0].id, adminId), "ok");
    assert.equal(await jumlahAudit("varian.dihapus"), 1);
  });
});

describe("import", () => {
  it("import stok mengubah ratusan baris dalam satu transaksi", async () => {
    const pid = await buatProduk(db, { ...AIR_MAX, nama: "Massal", feePerPasang: null }, adminId);
    const sizes = Array.from({ length: 200 }, (_, i) => i + 1);
    await db.insert(variants).values(sizes.map((n) => ({ productId: pid, sku: `M-${n}`, size: String(n), stok: 1 })));

    const csv = "sku,size,stok\n" + sizes.map((n) => `M-${n},${n},${n % 4}`).join("\n");
    const { varian } = await dataUntukImport(db);
    const rencana = rencanakanImportStok(parseCsv(csv), varian);
    assert.deepEqual(rencana.error, []);
    await terapkanImportStok(db, rencana, adminId, "stok.csv");

    const hasil = await db.select({ sku: variants.sku, stok: variants.stok }).from(variants).where(eq(variants.productId, pid));
    for (const v of hasil) assert.equal(v.stok, Number(v.sku.slice(2)) % 4, v.sku);
    assert.equal(await jumlahAudit("import.stok"), 1);
    assert.equal(await jumlahAudit("stok.diubah"), rencana.perubahan.length);
  });

  it("ekspor lalu import katalog = tidak ada perubahan; import baru membuat produk", async () => {
    const ekspor = await barisEkspor(db);
    const tabel = [
      ["sku", "brand", "nama", "kategori", "harga", "harga_coret", "fee_per_pasang", "size", "stok"],
      ...ekspor.map((r) => [r.sku, r.brand, r.nama, r.kategori ?? "", String(r.harga), String(r.hargaCoret ?? ""), String(r.feePerPasang ?? ""), r.size, String(r.stok)]),
    ];
    const { produk, varian } = await dataUntukImport(db);
    const kosong = rencanakanImportKatalog(tabel, produk, varian, { bolehUbahFee: true });
    assert.deepEqual(kosong, { produkBaru: [], produkDiubah: [], varianBaru: [], stokDiubah: [], error: [], peringatan: [] });

    tabel.push(["AD-GZL-40", "Adidas", "Gazelle", "", "1500000", "", "", "40", "2"], ["AD-GZL-41", "Adidas", "Gazelle", "", "1500000", "", "", "41", "0"]);
    const rencana = rencanakanImportKatalog(tabel, produk, varian, { bolehUbahFee: true });
    await terapkanImportKatalog(db, rencana, adminId, "katalog.csv");
    const { items } = await daftarProduk(db, { q: "gazelle" });
    assert.deepEqual(items[0].varian.map((v) => [v.size, v.stok]), [["40", 2], ["41", 0]]);
  });
});

describe("ambang stok", () => {
  it("default 3, bisa dari settings, nilai rusak diabaikan", async () => {
    assert.deepEqual(await getAmbangStok(db), { readyMin: 3 });
    await db.insert(settings).values({ kunci: "ambang_stok", nilai: { readyMin: 5 } });
    assert.deepEqual(await getAmbangStok(db), { readyMin: 5 });
    await db.update(settings).set({ nilai: { readyMin: "x" } }).where(eq(settings.kunci, "ambang_stok"));
    assert.deepEqual(await getAmbangStok(db), { readyMin: 3 });
  });
});
