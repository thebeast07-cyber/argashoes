import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, banner } from "@/db/schema";
import { buatUser, type UserSesi } from "@/lib/auth/session";
import { ambilBanner, bannerBeranda } from "@/lib/banner/data";
import { aturAktifBanner, buatBanner, hapusBanner, ubahBanner } from "@/lib/banner/mutasi";

let db: Db;
let close: () => Promise<void>;
let admin: UserSesi;

const promo = {
  judul: "Promo 11.11",
  keterangan: "Harga coret semua Samba",
  tautan: "/?q=samba",
  teksTombol: "Lihat Samba",
  mulai: new Date("2026-11-10T17:00:00Z"),
  selesai: new Date("2026-11-11T17:00:00Z"),
};

before(async () => {
  ({ db, close } = await createPgliteDb());
  admin = await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "sandi-admin-toko" });
});
after(() => close());

describe("banner", () => {
  it("tampil di beranda hanya selama jadwalnya dan saat aktif, semua perubahan tercatat", async () => {
    const id = await buatBanner(db, { ...promo, gambarUrl: "/foto/lama.jpg" }, admin.id);
    assert.equal(await bannerBeranda(db, new Date("2026-11-10T16:59:00Z")), null);
    assert.equal((await bannerBeranda(db, new Date("2026-11-11T05:00:00Z")))?.id, id);
    assert.equal(await bannerBeranda(db, new Date("2026-11-11T17:00:00Z")), null);

    assert.equal(await aturAktifBanner(db, id, false, admin.id), true);
    assert.equal(await bannerBeranda(db, new Date("2026-11-11T05:00:00Z")), null);

    const ubah = await ubahBanner(db, id, { ...promo, judul: "Promo 11.11 diperpanjang", gambarUrl: "/foto/baru.jpg" }, admin.id);
    assert.deepEqual(ubah, { ok: true, gambarLama: "/foto/lama.jpg" });
    const tetap = await ubahBanner(db, id, { ...promo }, admin.id);
    assert.deepEqual(tetap, { ok: true, gambarLama: null });
    assert.equal((await ambilBanner(db, id))?.gambarUrl, "/foto/baru.jpg");

    assert.deepEqual(await hapusBanner(db, id, admin.id), { gambarUrl: "/foto/baru.jpg" });
    assert.equal(await ambilBanner(db, id), null);

    const log = await db.select({ aksi: auditLog.aksi }).from(auditLog).where(eq(auditLog.entitasId, id));
    assert.deepEqual(log.map((l) => l.aksi).sort(), ["banner.buat", "banner.hapus", "banner.matikan", "banner.ubah", "banner.ubah"]);
  });

  it("database menolak jadwal terbalik dan tombol tanpa tujuan", async () => {
    await assert.rejects(db.insert(banner).values({ ...promo, mulai: promo.selesai, selesai: promo.mulai }));
    await assert.rejects(db.insert(banner).values({ ...promo, tautan: null }));
  });

  it("banner yang tidak ada", async () => {
    const kosong = "00000000-0000-0000-0000-000000000000";
    assert.deepEqual(await ubahBanner(db, kosong, promo, admin.id), { ok: false });
    assert.equal(await aturAktifBanner(db, kosong, true, admin.id), false);
    assert.equal(await hapusBanner(db, kosong, admin.id), false);
  });
});
