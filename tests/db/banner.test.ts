import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { createPgliteDb, MIGRATIONS_FOLDER, type Db } from "@/db";
import { auditLog, banner } from "@/db/schema";
import { buatUser, type UserSesi } from "@/lib/auth/session";
import { ambilBanner, bannerBeranda } from "@/lib/banner/data";
import { aturAktifBanner, buatBanner, hapusBanner, ubahBanner } from "@/lib/banner/mutasi";

let db: Db;
let close: () => Promise<void>;
let admin: UserSesi;

const promo = {
  judul: "Promo 11.11",
  tautan: "/?q=samba",
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
    const id = await buatBanner(db, { ...promo, gambarPotret: "/foto/p1.jpg", gambarLanskap: "/foto/l1.jpg" }, admin.id);
    assert.equal(await bannerBeranda(db, new Date("2026-11-10T16:59:00Z")), null);
    assert.equal((await bannerBeranda(db, new Date("2026-11-11T05:00:00Z")))?.id, id);
    assert.equal(await bannerBeranda(db, new Date("2026-11-11T17:00:00Z")), null);

    assert.equal(await aturAktifBanner(db, id, false, admin.id), true);
    assert.equal(await bannerBeranda(db, new Date("2026-11-11T05:00:00Z")), null);

    // Ganti potret saja: hanya potret lama yang dibuang.
    assert.deepEqual(await ubahBanner(db, id, { ...promo, gambarPotret: "/foto/p2.jpg" }, admin.id), { ok: true, gambarLama: ["/foto/p1.jpg"] });
    assert.deepEqual(await ubahBanner(db, id, promo, admin.id), { ok: true, gambarLama: [] });
    const b = await ambilBanner(db, id);
    assert.deepEqual([b?.gambarPotret, b?.gambarLanskap], ["/foto/p2.jpg", "/foto/l1.jpg"]);

    assert.deepEqual(await hapusBanner(db, id, admin.id), { gambar: ["/foto/p2.jpg", "/foto/l1.jpg"] });
    assert.equal(await ambilBanner(db, id), null);

    const log = await db.select({ aksi: auditLog.aksi }).from(auditLog).where(eq(auditLog.entitasId, id));
    assert.deepEqual(log.map((l) => l.aksi).sort(), ["banner.buat", "banner.hapus", "banner.matikan", "banner.ubah", "banner.ubah"]);
  });

  it("database menolak jadwal terbalik dan banner aktif tanpa dua gambar", async () => {
    await assert.rejects(db.insert(banner).values({ ...promo, mulai: promo.selesai, selesai: promo.mulai, gambarPotret: "/a", gambarLanskap: "/b" }));
    await assert.rejects(db.insert(banner).values({ ...promo, gambarPotret: "/a" }));
    await db.insert(banner).values({ ...promo, aktif: false });
  });

  it("banner yang tidak ada", async () => {
    const kosong = "00000000-0000-0000-0000-000000000000";
    assert.deepEqual(await ubahBanner(db, kosong, promo, admin.id), { ok: false });
    assert.equal(await aturAktifBanner(db, kosong, true, admin.id), false);
    assert.equal(await hapusBanner(db, kosong, admin.id), false);
  });
});

describe("migrasi 0005_banner_overlay", () => {
  it("banner versi lama: gambar dipakai untuk dua ukuran, yang tanpa gambar dimatikan", async () => {
    // Database berhenti di 0004 (banner versi strip teks), lalu 0005 dan 0006 dijalankan apa adanya.
    const folder = mkdtempSync(path.join(tmpdir(), "migrasi-"));
    cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
    const jurnal = JSON.parse(readFileSync(path.join(folder, "meta/_journal.json"), "utf8"));
    jurnal.entries = jurnal.entries.filter((e: { tag: string }) => e.tag <= "0004_banner");
    writeFileSync(path.join(folder, "meta/_journal.json"), JSON.stringify(jurnal));
    const client = new PGlite();
    const lama = drizzle({ client });
    try {
      await migrate(lama, { migrationsFolder: folder });
      await lama.execute(sql`insert into banner (judul, gambar_url, mulai, selesai) values
        ('ada gambar', '/foto/x.jpg', now(), now() + interval '1 day'),
        ('teks saja', null, now(), now() + interval '1 day')`);
      for (const nama of ["0005_banner_overlay", "0006_banner_buang_kolom_lama"]) {
        for (const perintah of readFileSync(path.join(MIGRATIONS_FOLDER, `${nama}.sql`), "utf8").split("--> statement-breakpoint")) await lama.execute(sql.raw(perintah));
      }
      const r = (await lama.execute(sql`select judul, gambar_potret, gambar_lanskap, aktif from banner order by judul`)) as unknown as {
        rows: { judul: string; gambar_potret: string | null; gambar_lanskap: string | null; aktif: boolean }[];
      };
      assert.deepEqual(r.rows, [
        { judul: "ada gambar", gambar_potret: "/foto/x.jpg", gambar_lanskap: "/foto/x.jpg", aktif: true },
        { judul: "teks saja", gambar_potret: null, gambar_lanskap: null, aktif: false },
      ]);
    } finally {
      await client.close();
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
