import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog } from "@/db/schema";
import { buatUser } from "@/lib/auth/session";
import { rekapBulan, ringkasanSemuaBulan } from "@/lib/fee/data";
import { batalkanTandaDibayar, tandaiFeeDibayar } from "@/lib/fee/mutasi";
import { buatOrder } from "@/lib/orders/buat-order";
import { ambilOrder } from "@/lib/orders/data";
import { ubahStatusOrder } from "@/lib/orders/ubah-status";
import { buatProduk, tambahVarian } from "@/lib/produk/mutasi";

let db: Db;
let close: () => Promise<void>;
let pemilik: string;
let samba: string;
let n = 0;

/** Order 1-2 pasang, lalu dibawa ke status tujuan dengan waktu Dikirim tertentu. */
async function order(jumlah: number, tujuan: "lead" | "dikirim" | "selesai" | "batal", dikirimPada?: Date) {
  n += 1;
  const r = await buatOrder(db, {
    pembeli: { nama: `Pembeli ${n}`, noWa: `62812000000${String(n).padStart(2, "0")}`, alamat: "Jl. Mawar 1, Kota B 12345", catatan: null },
    diminta: [{ productId: samba, size: "42", jumlah }],
    tiers: [],
    utmSource: null,
    acak: () => new Uint8Array([n, n, n, n]),
  });
  assert.equal(r.ok, true);
  const kode = r.ok ? r.kode : "";
  const { id } = (await ambilOrder(db, kode))!;
  if (tujuan === "batal") {
    await ubahStatusOrder(db, { orderId: id, ke: "batal", alasanBatal: "Pembeli batal", olehUserId: pemilik });
  } else if (tujuan !== "lead") {
    await ubahStatusOrder(db, { orderId: id, ke: "dikonfirmasi", olehUserId: pemilik });
    await ubahStatusOrder(db, { orderId: id, ke: "dikirim", resiNomor: `RESI${n}`, olehUserId: pemilik, waktu: dikirimPada });
    if (tujuan === "selesai") await ubahStatusOrder(db, { orderId: id, ke: "selesai", olehUserId: pemilik });
  }
  return kode;
}

before(async () => {
  ({ db, close } = await createPgliteDb());
  pemilik = (await buatUser(db, { nama: "Najah", email: "najah@contoh.com", peran: "pemilik", password: "password-pemilik-1" })).id;
  // Fee khusus 80.000 per pasang.
  samba = await buatProduk(db, { nama: "Samba OG", brand: "Adidas", kategori: null, deskripsi: null, harga: 1_399_000, hargaCoret: null, feePerPasang: 80_000, aktif: true }, pemilik);
  await tambahVarian(db, samba, { sku: "AD-SMB-42", size: "42", stok: 100 }, pemilik);
});
after(() => close());

describe("laporan fee", () => {
  it("rekap per bulan WIB: hanya Dikirim/Selesai, batas bulan memakai WIB", async () => {
    const sep = await order(2, "dikirim", new Date("2026-09-10T03:00:00Z"));
    const awalOkt = await order(1, "selesai", new Date("2026-09-30T17:30:00Z")); // 1 Okt 00.30 WIB
    await order(1, "batal");
    await order(3, "lead");

    const s = await rekapBulan(db, "2026-09");
    assert.deepEqual([s.jumlahPasang, s.totalFee, s.orders.map((o) => o.kode)], [2, 160_000, [sep]]);
    const o = await rekapBulan(db, "2026-10");
    assert.deepEqual([o.jumlahPasang, o.totalFee, o.orders.map((x) => x.kode)], [1, 80_000, [awalOkt]]);
    assert.equal(o.orders[0].nama, "Pembeli 2");

    const semua = await ringkasanSemuaBulan(db, new Date("2026-11-02T03:00:00Z"));
    assert.deepEqual(
      semua.map((b) => [b.bulan, b.order, b.pasang, b.fee]),
      [["2026-11", 0, 0, 0], ["2026-10", 1, 1, 80_000], ["2026-09", 1, 2, 160_000]],
    );
  });

  it("tandai dibayar menyimpan total saat itu; bisa dibatalkan; semua tercatat", async () => {
    await tandaiFeeDibayar(db, { bulan: "2026-09", total: 160_000, dibayarPada: new Date("2026-10-05T03:00:00Z"), catatan: "Transfer BCA" }, pemilik);
    let r = await rekapBulan(db, "2026-09");
    assert.equal(r.pembayaran?.total, 160_000);
    assert.equal(r.pembayaran?.catatan, "Transfer BCA");

    await batalkanTandaDibayar(db, "2026-09", pemilik);
    r = await rekapBulan(db, "2026-09");
    assert.equal(r.pembayaran?.dibayarPada, null);

    await tandaiFeeDibayar(db, { bulan: "2026-09", total: 160_000, dibayarPada: new Date("2026-10-06T03:00:00Z"), catatan: null }, pemilik);
    const log = await db.select().from(auditLog).where(eq(auditLog.entitas, "fee_payments"));
    assert.deepEqual(log.map((l) => l.aksi).sort(), ["fee.dibayar", "fee.dibayar", "fee.dibayar_dibatalkan"]);
    const semua = await ringkasanSemuaBulan(db, new Date("2026-11-02T03:00:00Z"));
    assert.equal(semua.find((b) => b.bulan === "2026-09")?.pembayaran?.total, 160_000);
  });
});
