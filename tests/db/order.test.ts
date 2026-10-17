import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { customers, orderEvents, orderItems, orders } from "@/db/schema";
import type { DataPembeli } from "@/lib/domain/checkout";
import type { DataProduk } from "@/lib/domain/produk";
import { buatUser } from "@/lib/auth/session";
import { buatOrder, catatKlikWa, orderPublik } from "@/lib/orders/buat-order";
import { buatProduk, tambahVarian } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let samba: string;
let gazelle: string;

const PRODUK: DataProduk = { nama: "Samba OG", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_399_000, hargaCoret: null, feePerPasang: 80_000, aktif: true };
const BUDI: DataPembeli = { nama: "Budi", noWa: "6281234567890", alamat: "Jl. Mawar 1, Kota B 12345", catatan: null };
const TIER = [{ hargaMin: 0, hargaMax: null, fee: 60_000 }];
const byte = (n: number) => () => new Uint8Array([n, n, n, n]);

before(async () => {
  ({ db, close } = await createPgliteDb());
  const admin = (await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" })).id;
  samba = await buatProduk(db, PRODUK, admin);
  gazelle = await buatProduk(db, { ...PRODUK, nama: "Gazelle", harga: 1_299_000, feePerPasang: null }, admin);
  await tambahVarian(db, samba, { sku: "AD-SMB-43", size: "43", stok: 2 }, admin);
  await tambahVarian(db, gazelle, { sku: "AD-GZL-40", size: "40", stok: 0 }, admin);
  await tambahVarian(db, gazelle, { sku: "AD-GZL-41", size: "41", stok: 4 }, admin);
});
after(() => close());

describe("buatOrder", () => {
  it("order Lead tercatat lengkap: pelanggan, item dengan harga dan fee dari database, event lead", async () => {
    const r = await buatOrder(db, {
      pembeli: BUDI,
      diminta: [{ productId: samba, size: "43", jumlah: 2 }, { productId: gazelle, size: "41", jumlah: 1 }],
      tiers: TIER,
      utmSource: "instagram",
      acak: byte(0),
    });
    assert.deepEqual(r, { ok: true, kode: "WEB-2222" });

    const [o] = await db.select().from(orders).where(eq(orders.kode, "WEB-2222"));
    assert.equal(o.status, "lead");
    assert.equal(o.total, 2 * 1_399_000 + 1_299_000);
    assert.equal(o.utmSource, "instagram");
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    assert.deepEqual(items.map((i) => [i.namaProduk, i.jumlah, i.feePerPasang]).sort(), [["Adidas Gazelle", 1, 60_000], ["Adidas Samba OG", 2, 80_000]]);
    const ev = await db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id));
    assert.deepEqual(ev.map((e) => [e.dariStatus, e.keStatus, e.olehUserId]), [[null, "lead", null]]);
  });

  it("kode bentrok diulang dengan kode baru; pelanggan yang sama diperbarui, bukan dobel", async () => {
    let n = 0;
    const r = await buatOrder(db, {
      pembeli: { ...BUDI, nama: "Budi S", alamat: "Jl. Melati 2, Kota C 99999" },
      diminta: [{ productId: gazelle, size: "41", jumlah: 1 }],
      tiers: TIER,
      utmSource: null,
      acak: () => new Uint8Array(n++ === 0 ? [0, 0, 0, 0] : [1, 1, 1, 1]),
    });
    assert.deepEqual(r, { ok: true, kode: "WEB-3333" });
    const semua = await db.select().from(customers);
    assert.equal(semua.length, 1);
    assert.equal(semua[0].nama, "Budi S");
    assert.equal(semua[0].alamatTerakhir, "Jl. Melati 2, Kota C 99999");
  });

  it("size habis, kurang stok, atau model nonaktif ditolak tanpa menyimpan apa pun", async () => {
    const sebelum = (await db.select().from(orders)).length;
    const r = await buatOrder(db, {
      pembeli: { ...BUDI, noWa: "6289999999999" },
      diminta: [{ productId: gazelle, size: "40", jumlah: 1 }, { productId: samba, size: "43", jumlah: 3 }],
      tiers: TIER,
      utmSource: null,
      acak: byte(5),
    });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.alasan === "item" && r.masalah.length, 2);
    assert.equal((await db.select().from(orders)).length, sebelum);
  });

  it("lebih dari 3 order per nomor dalam 1 jam ditolak", async () => {
    const r = await buatOrder(db, { pembeli: BUDI, diminta: [{ productId: gazelle, size: "41", jumlah: 1 }], tiers: TIER, utmSource: null, acak: byte(9) });
    assert.equal(r.ok, true);
    const r2 = await buatOrder(db, { pembeli: BUDI, diminta: [{ productId: gazelle, size: "41", jumlah: 1 }], tiers: TIER, utmSource: null, acak: byte(10) });
    assert.deepEqual(r2, { ok: false, alasan: "batas" });
  });
});

describe("konfirmasi dan klik WhatsApp", () => {
  it("halaman konfirmasi membaca item; klik WA hanya dicatat sekali", async () => {
    const o = await orderPublik(db, "WEB-2222");
    assert.equal(o?.items.length, 2);
    assert.equal(await orderPublik(db, "WEB-ZZZZ"), null);

    await catatKlikWa(db, "WEB-2222", new Date("2026-10-17T10:00:00Z"));
    await catatKlikWa(db, "WEB-2222", new Date("2026-10-17T11:00:00Z"));
    const [row] = await db.select({ w: orders.waClickedAt }).from(orders).where(eq(orders.kode, "WEB-2222"));
    assert.equal(row.w?.toISOString(), "2026-10-17T10:00:00.000Z");
  });
});
