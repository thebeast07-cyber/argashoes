import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPgliteDb, type Db } from "@/db";
import { percobaanLogin } from "@/db/schema";
import { catatGagalLogin, cekBlokirLogin, hapusGagalLogin } from "@/lib/auth/batas-login";

let db: Db;
let close: () => Promise<void>;

before(async () => {
  ({ db, close } = await createPgliteDb());
});
after(() => close());

const SEKARANG = new Date("2026-10-20T10:00:00Z");

describe("batas login di database", () => {
  it("5 gagal untuk satu email memblokir email itu (tanpa melihat huruf besar), email lain tetap boleh", async () => {
    for (let i = 0; i < 5; i++) await catatGagalLogin(db, i % 2 ? " Owner@Contoh.com" : "owner@contoh.com", `10.0.0.${i}`, SEKARANG);
    assert.deepEqual(await cekBlokirLogin(db, "OWNER@contoh.com", "10.9.9.9", SEKARANG), { boleh: false, tungguMenit: 15 });
    assert.deepEqual(await cekBlokirLogin(db, "lain@contoh.com", "10.9.9.9", SEKARANG), { boleh: true });
  });

  it("login berhasil menghapus hitungan email itu", async () => {
    await hapusGagalLogin(db, "Owner@contoh.com");
    assert.deepEqual(await cekBlokirLogin(db, "owner@contoh.com", "10.9.9.9", SEKARANG), { boleh: true });
  });

  it("20 gagal dari satu IP memblokir IP itu untuk email apa pun", async () => {
    for (let i = 0; i < 20; i++) await catatGagalLogin(db, `tebak${i}@contoh.com`, "10.1.1.1", SEKARANG);
    assert.equal((await cekBlokirLogin(db, "owner@contoh.com", "10.1.1.1", SEKARANG)).boleh, false);
    assert.equal((await cekBlokirLogin(db, "owner@contoh.com", "10.2.2.2", SEKARANG)).boleh, true);
  });

  it("catatan lebih dari sehari dibuang saat ada gagal baru", async () => {
    const besok = new Date(SEKARANG.getTime() + 25 * 60 * 60_000);
    await catatGagalLogin(db, "baru@contoh.com", "10.3.3.3", besok);
    const sisa = await db.select().from(percobaanLogin);
    assert.deepEqual(
      sisa.map((s) => s.email),
      ["baru@contoh.com"],
    );
  });
});
