import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, products, usulan } from "@/db/schema";
import { buatUser } from "@/lib/auth/session";
import type { FeeTier } from "@/lib/domain/fee";
import { daftarUsulan, getPengaturan, getRekening, getTiers, jumlahUsulanMenunggu, riwayatPengaturan } from "@/lib/pengaturan/data";
import {
  ajukanUsulan,
  batalkanUsulan,
  putuskanUsulan,
  simpanPengaturanToko,
  simpanRekening,
  simpanTier,
} from "@/lib/pengaturan/mutasi";
import { buatProduk, ubahProduk } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let tokoId: string;
let pemilikId: string;

const TIER_A: FeeTier[] = [
  { hargaMin: 0, hargaMax: 1_000_000, fee: 50_000 },
  { hargaMin: 1_000_000, hargaMax: null, fee: 75_000 },
];
const TIER_B: FeeTier[] = [
  { hargaMin: 0, hargaMax: 1_500_000, fee: 60_000 },
  { hargaMin: 1_500_000, hargaMax: null, fee: 90_000 },
];
const REK = { bank: "BCA", nomor: "1234567890", atasNama: "Toko Arga" };

before(async () => {
  ({ db, close } = await createPgliteDb());
  tokoId = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  pemilikId = (await buatUser(db, { nama: "Pemilik", email: "pemilik@contoh.com", peran: "pemilik", password: "password-pemilik-1" })).id;
});
after(() => close());

async function aksiAudit(aksi: string) {
  return db.select().from(auditLog).where(eq(auditLog.aksi, aksi));
}

describe("diubah langsung", () => {
  it("tier ditulis ulang seluruhnya dan tercatat dari → ke", async () => {
    await simpanTier(db, TIER_A, pemilikId);
    await simpanTier(db, TIER_A, pemilikId);
    assert.deepEqual(await getTiers(db), TIER_A);
    const audit = await aksiAudit("fee_tier.diubah");
    assert.equal(audit.length, 1, "simpan ulang tanpa perubahan tidak dicatat");
    assert.deepEqual(audit[0].data, { dari: [], ke: TIER_A });
  });

  it("nomor WA dan ambang stok: hanya yang berubah yang dicatat", async () => {
    await simpanPengaturanToko(db, { nomorWa: "6281234567890", ambang: { readyMin: 3 } }, tokoId);
    const p = await getPengaturan(db);
    assert.equal(p.nomorWa, "6281234567890");
    const [audit] = await aksiAudit("pengaturan.diubah");
    assert.deepEqual(audit.data, { nomorWa: { dari: null, ke: "6281234567890" } });

    await simpanPengaturanToko(db, { nomorWa: null, ambang: { readyMin: 5 } }, tokoId);
    const p2 = await getPengaturan(db);
    assert.equal(p2.nomorWa, null);
    assert.equal(p2.ambang.readyMin, 5);
  });
});

describe("usulan tier", () => {
  let id: string;

  it("diajukan tanpa mengubah tier yang berlaku", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "tier", isi: TIER_B, alasan: "Harga naik bulan ini" }, tokoId);
    assert.equal(hasil.status, "ok");
    id = (hasil as { id: string }).id;
    assert.deepEqual(await getTiers(db), TIER_A);
    assert.equal(await jumlahUsulanMenunggu(db), 1);
  });

  it("usulan kedua untuk sasaran yang sama ditolak selama yang pertama menunggu", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "tier", isi: TIER_B, alasan: null }, tokoId);
    assert.equal(hasil.status, "sudah_ada");
  });

  it("usulan yang sama persis dengan yang berlaku ditolak", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "rekening", isi: null, alasan: null }, tokoId);
    assert.equal(hasil.status, "tidak_berubah");
  });

  it("disetujui: tier baru berlaku, audit mencatat usulan asalnya", async () => {
    assert.equal(await putuskanUsulan(db, id, { setuju: true, catatan: "Oke" }, pemilikId), "ok");
    assert.deepEqual(await getTiers(db), TIER_B);
    const perubahan = (await aksiAudit("fee_tier.diubah")).find((a) => (a.data as { usulanId?: string }).usulanId === id);
    assert.ok(perubahan);
    assert.equal(perubahan.olehUserId, pemilikId);

    const [u] = await db.select().from(usulan).where(eq(usulan.id, id));
    assert.equal(u.status, "disetujui");
    assert.equal(u.catatanKeputusan, "Oke");
    assert.ok(u.diputuskanPada);
  });

  it("yang sudah diputuskan tidak bisa diputuskan atau dibatalkan lagi", async () => {
    assert.equal(await putuskanUsulan(db, id, { setuju: false, catatan: null }, pemilikId), "sudah_diputuskan");
    assert.equal(await batalkanUsulan(db, id, tokoId), "sudah_diputuskan");
  });

  it("setelah diputuskan, sasaran yang sama bisa diusulkan lagi", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "tier", isi: TIER_A, alasan: null }, tokoId);
    assert.equal(hasil.status, "ok");
    assert.equal(await batalkanUsulan(db, (hasil as { id: string }).id, pemilikId), "bukan_pengaju");
    assert.equal(await batalkanUsulan(db, (hasil as { id: string }).id, tokoId), "ok");
    assert.equal(await jumlahUsulanMenunggu(db), 0);
  });
});

describe("usulan basi", () => {
  it("tidak bisa disetujui kalau pemilik sudah mengubah nilainya; tetap menunggu sampai ditolak", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "rekening", isi: REK, alasan: "Rekening toko" }, tokoId);
    assert.equal(hasil.status, "ok");
    const id = (hasil as { id: string }).id;

    await simpanRekening(db, { ...REK, nomor: "9999999999" }, pemilikId);
    assert.equal(await putuskanUsulan(db, id, { setuju: true, catatan: null }, pemilikId), "basi");
    assert.equal((await getRekening(db))?.nomor, "9999999999", "rekening pemilik tidak tertimpa");

    const [u] = await db.select().from(usulan).where(eq(usulan.id, id));
    assert.equal(u.status, "menunggu");
    assert.equal(await putuskanUsulan(db, id, { setuju: false, catatan: "Basi" }, pemilikId), "ok");
  });
});

describe("usulan fee produk", () => {
  let produkId: string;

  before(async () => {
    produkId = await buatProduk(
      db,
      { nama: "Samba", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_400_000, hargaCoret: null, feePerPasang: null, aktif: true },
      tokoId,
    );
  });

  it("produk yang tidak ada ditolak", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "fee_produk", productId: "00000000-0000-0000-0000-000000000000", isi: 60_000, alasan: null }, tokoId);
    assert.equal(hasil.status, "tidak_ada");
  });

  it("disetujui: fee produk berubah dan masuk riwayat bersama nama produknya", async () => {
    const hasil = await ajukanUsulan(db, { jenis: "fee_produk", productId: produkId, isi: 60_000, alasan: "Margin tipis" }, tokoId);
    assert.equal(hasil.status, "ok");
    const id = (hasil as { id: string }).id;
    assert.equal(await putuskanUsulan(db, id, { setuju: true, catatan: null }, pemilikId), "ok");

    const [p] = await db.select().from(products).where(eq(products.id, produkId));
    assert.equal(p.feePerPasang, 60_000);

    const riwayat = await riwayatPengaturan(db, 50);
    const baris = riwayat.find((r) => r.aksi === "produk.diubah" && r.entitasId === produkId);
    assert.equal(baris?.produkNama, "Samba");
  });

  it("perubahan fee langsung dari form produk ikut riwayat; perubahan harga saja tidak", async () => {
    const data = { nama: "Samba", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_400_000, hargaCoret: null, aktif: true };
    await ubahProduk(db, produkId, { ...data, feePerPasang: 70_000 }, pemilikId, { bolehUbahFee: true });
    await ubahProduk(db, produkId, { ...data, harga: 1_450_000, feePerPasang: 70_000 }, pemilikId, { bolehUbahFee: true });
    const riwayat = await riwayatPengaturan(db, 50);
    const produkDiubah = riwayat.filter((r) => r.aksi === "produk.diubah" && r.entitasId === produkId);
    assert.equal(produkDiubah.length, 2, "usulan yang disetujui + ubah fee langsung; ubah harga tidak masuk");
  });

  it("daftar: yang menunggu dipisah dari riwayat", async () => {
    await ajukanUsulan(db, { jenis: "fee_produk", productId: produkId, isi: null, alasan: "Ikut tier saja" }, tokoId);
    const { menunggu, riwayat } = await daftarUsulan(db, { batasRiwayat: 10 });
    assert.equal(menunggu.length, 1);
    assert.equal(menunggu[0].produkNama, "Samba");
    assert.equal(menunggu[0].diajukanOleh, "Toko");
    assert.deepEqual(menunggu[0].isi, { nilai: null });
    assert.ok(riwayat.every((u) => u.status !== "menunggu"));
  });
});
