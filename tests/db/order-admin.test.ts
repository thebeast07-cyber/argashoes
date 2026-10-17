import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, orders } from "@/db/schema";
import { buatUser } from "@/lib/auth/session";
import type { DataPembeli } from "@/lib/domain/checkout";
import { buatOrder } from "@/lib/orders/buat-order";
import { ambilOrder, ambilPelanggan, daftarOrder, daftarPelanggan, emailPemilik, hitungPerStatus, ringkasanBerandaOrder, semuaPelangganUntukEkspor } from "@/lib/orders/data";
import { simpanCatatanInternal, simpanFotoResi } from "@/lib/orders/mutasi";
import { ubahStatusOrder } from "@/lib/orders/ubah-status";
import { buatProduk, tambahVarian } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let adminId: string;
let produk: string;
// Jam asli, karena perubahan status dicatat dengan jam asli dan riwayat diurutkan menurut waktu.
const SEKARANG = new Date();
const jamLalu = (j: number) => new Date(SEKARANG.getTime() - j * 60 * 60_000);
const BUDI: DataPembeli = { nama: "Budi Santoso", noWa: "6281234567890", alamat: "Jl. Mawar 1, Kota B 12345", catatan: null };
const SITI: DataPembeli = { nama: "Siti", noWa: "6285700000000", alamat: "Jl. Melati 2, Kota C 99999", catatan: null };

async function order(pembeli: DataPembeli, byte: number, waktu: Date) {
  const r = await buatOrder(db, { pembeli, diminta: [{ productId: produk, size: "42", jumlah: 1 }], tiers: [], utmSource: null, sekarang: waktu, acak: () => new Uint8Array([byte, byte, byte, byte]) });
  assert.equal(r.ok, true);
  return r.ok ? r.kode : "";
}

before(async () => {
  ({ db, close } = await createPgliteDb());
  adminId = (await buatUser(db, { nama: "Rina", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  await buatUser(db, { nama: "Najah", email: "najah@contoh.com", peran: "pemilik", password: "password-pemilik-1" });
  produk = await buatProduk(db, { nama: "Samba OG", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_399_000, hargaCoret: null, feePerPasang: null, aktif: true }, adminId);
  await tambahVarian(db, produk, { sku: "AD-SMB-42", size: "42", stok: 50 }, adminId);
});
after(() => close());

describe("status order dari admin", () => {
  it("batal wajib alasan; alasan tersimpan di order dan di riwayat", async () => {
    const kode = await order(BUDI, 0, jamLalu(1));
    const o = (await ambilOrder(db, kode))!;
    assert.deepEqual(await ubahStatusOrder(db, { orderId: o.id, ke: "batal", olehUserId: adminId }), { ok: false, error: "ALASAN_WAJIB" });
    assert.deepEqual(await ubahStatusOrder(db, { orderId: o.id, ke: "batal", alasanBatal: "Stok habis", olehUserId: adminId }), { ok: true });
    const baru = (await ambilOrder(db, kode))!;
    assert.equal(baru.alasanBatal, "Stok habis");
    assert.deepEqual(baru.riwayat.map((r) => [r.dari, r.ke, r.oleh, r.catatan]), [[null, "lead", null, null], ["lead", "batal", "Rina", "Stok habis"]]);
  });

  it("database juga menolak Batal tanpa alasan", async () => {
    const kode = await order(BUDI, 1, jamLalu(1));
    await assert.rejects(db.update(orders).set({ status: "batal" }).where(eq(orders.kode, kode)));
  });
});

describe("daftar, pencarian, beranda", () => {
  it("cari dengan kode, nama, atau nomor WA format 08; jumlah per status", async () => {
    const lama = await order(SITI, 2, jamLalu(30));
    await order(SITI, 3, jamLalu(2));
    assert.deepEqual((await daftarOrder(db, { q: lama, halaman: 1 })).items.map((o) => o.kode), [lama]);
    assert.equal((await daftarOrder(db, { q: "siti", halaman: 1 })).total, 2);
    assert.equal((await daftarOrder(db, { q: "0857", halaman: 1 })).total, 2);
    const semua = await daftarOrder(db, { halaman: 1 });
    assert.equal(semua.items[0].barang[0].namaProduk, "Adidas Samba OG");
    const per = await hitungPerStatus(db);
    assert.deepEqual([per.lead, per.batal], [3, 1]);
    assert.equal((await hitungPerStatus(db, "siti")).lead, 2);

    // "Hari ini" disimulasikan mulai 10 jam lalu: order 30 jam lalu tidak terhitung.
    const beranda = await ringkasanBerandaOrder(db, jamLalu(10), SEKARANG);
    assert.equal(beranda.hariIni, 3);
    assert.deepEqual(beranda.terbengkalai.map((o) => o.kode), [lama]);
  });
});

describe("catatan internal dan foto resi", () => {
  it("tercatat di audit log; foto lama dikembalikan untuk dihapus", async () => {
    const kode = await order(BUDI, 4, jamLalu(1));
    const { id } = (await ambilOrder(db, kode))!;
    assert.equal(await simpanCatatanInternal(db, id, "  Ongkir 25rb  ", adminId), "ok");
    assert.equal((await ambilOrder(db, kode))!.catatanInternal, "Ongkir 25rb");
    assert.deepEqual(await simpanFotoResi(db, id, "/foto/a.jpg", adminId), { ok: true, lama: null });
    assert.deepEqual(await simpanFotoResi(db, id, "/foto/b.jpg", adminId), { ok: true, lama: "/foto/a.jpg" });
    const log = await db.select().from(auditLog).where(eq(auditLog.entitasId, id));
    assert.deepEqual(log.map((l) => l.aksi).sort(), ["order.catatan", "order.foto_resi", "order.foto_resi"]);
  });
});

describe("pelanggan dan penerima email", () => {
  it("statistik per pelanggan, riwayat, ekspor; email hanya pemilik aktif", async () => {
    const { items } = await daftarPelanggan(db, { halaman: 1 });
    const budi = items.find((p) => p.nama === "Budi Santoso")!;
    assert.equal(budi.jumlahOrder, 3);
    assert.equal(budi.orderDikirim, 0);
    assert.equal((await daftarPelanggan(db, { q: "0812", halaman: 1 })).total, 1);
    assert.equal((await ambilPelanggan(db, budi.id))!.riwayat.length, 3);
    assert.equal((await semuaPelangganUntukEkspor(db)).length, 2);
    assert.deepEqual(await emailPemilik(db), ["najah@contoh.com"]);
  });
});
