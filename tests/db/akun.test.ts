import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, sessions } from "@/db/schema";
import { resetSandi, ubahAktif } from "@/lib/auth/akun";
import { buatSesi, buatUser, cekLogin, validasiSesi, type UserSesi } from "@/lib/auth/session";

let db: Db;
let close: () => Promise<void>;
let pemilik: UserSesi;
let admin: UserSesi;

before(async () => {
  ({ db, close } = await createPgliteDb());
  pemilik = await buatUser(db, { nama: "Najah", email: "najah@contoh.com", peran: "pemilik", password: "sandi-pemilik-1" });
  admin = await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "sandi-salah-ketik" });
});
after(() => close());

describe("resetSandi", () => {
  it("sandi lama tidak berlaku, sandi baru bisa login, sesi lama dihapus, tercatat", async () => {
    const { token } = await buatSesi(db, admin.id);
    const hasil = await resetSandi(db, { pelakuId: pemilik.id, userId: admin.id, password: "sandi-baru-toko" });
    assert.deepEqual(hasil, { ok: true, email: "toko@contoh.com" });
    assert.equal(await cekLogin(db, "toko@contoh.com", "sandi-salah-ketik"), null);
    assert.equal((await cekLogin(db, "toko@contoh.com", "sandi-baru-toko"))?.id, admin.id);
    assert.equal(await validasiSesi(db, token), null);
    const [log] = await db.select().from(auditLog).where(eq(auditLog.aksi, "akun.sandi_direset"));
    assert.equal(log.olehUserId, pemilik.id);
    assert.equal(log.entitasId, admin.id);
  });

  it("sandi pendek ditolak tanpa mengubah apa pun", async () => {
    const hasil = await resetSandi(db, { pelakuId: pemilik.id, userId: admin.id, password: "pendek" });
    assert.equal(hasil.ok, false);
    assert.equal((await cekLogin(db, "toko@contoh.com", "sandi-baru-toko"))?.id, admin.id);
  });
});

describe("ubahAktif", () => {
  it("menonaktifkan admin toko: tidak bisa login, sesinya hilang; bisa diaktifkan lagi", async () => {
    await buatSesi(db, admin.id);
    assert.equal((await ubahAktif(db, { pelakuId: pemilik.id, userId: admin.id, aktif: false })).ok, true);
    assert.equal(await cekLogin(db, "toko@contoh.com", "sandi-baru-toko"), null);
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, admin.id))).length, 0);

    assert.equal((await ubahAktif(db, { pelakuId: pemilik.id, userId: admin.id, aktif: true })).ok, true);
    assert.equal((await cekLogin(db, "toko@contoh.com", "sandi-baru-toko"))?.id, admin.id);
    const aksi = (await db.select().from(auditLog).where(eq(auditLog.entitasId, admin.id))).map((l) => l.aksi);
    assert.ok(aksi.includes("akun.dinonaktifkan") && aksi.includes("akun.diaktifkan"));
  });

  it("pemilik aktif terakhir tetap aktif walau dinonaktifkan oleh siapa pun", async () => {
    const hasil = await ubahAktif(db, { pelakuId: admin.id, userId: pemilik.id, aktif: false });
    assert.equal(hasil.ok, false);
    assert.equal((await cekLogin(db, "najah@contoh.com", "sandi-pemilik-1"))?.id, pemilik.id);
  });
});
