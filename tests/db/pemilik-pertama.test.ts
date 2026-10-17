import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { auditLog, users } from "@/db/schema";
import { adaAkun, buatPemilikPertama, cekLogin } from "@/lib/auth/session";

let db: Db;
let close: () => Promise<void>;

before(async () => {
  ({ db, close } = await createPgliteDb());
});
after(() => close());

const SANDI = "sandi-awal-uji-1";

describe("pemilik pertama lewat login", () => {
  it("ditolak kalau sandi beda, env kosong, atau env terlalu pendek", async () => {
    assert.equal(await buatPemilikPertama(db, { email: "a@contoh.com", password: "salah-sekali-1", sandiAwal: SANDI }), null);
    assert.equal(await buatPemilikPertama(db, { email: "a@contoh.com", password: SANDI, sandiAwal: undefined }), null);
    assert.equal(await buatPemilikPertama(db, { email: "a@contoh.com", password: "pendek", sandiAwal: "pendek" }), null);
    assert.equal(await buatPemilikPertama(db, { email: "bukan-email", password: SANDI, sandiAwal: SANDI }), null);
    assert.equal(await adaAkun(db), false);
  });

  it("tabel kosong + sandi cocok: akun pemilik dibuat, tercatat, dan bisa login biasa", async () => {
    const user = await buatPemilikPertama(db, { email: " Najah@Contoh.com ", password: SANDI, sandiAwal: SANDI });
    assert.deepEqual({ nama: user?.nama, email: user?.email, peran: user?.peran }, { nama: "najah", email: "najah@contoh.com", peran: "pemilik" });
    const [log] = await db.select().from(auditLog).where(eq(auditLog.aksi, "akun.dibuat"));
    assert.deepEqual(log.data, { email: "najah@contoh.com", peran: "pemilik", sumber: "login_pertama" });
    assert.equal((await cekLogin(db, "najah@contoh.com", SANDI))?.id, user?.id);
  });

  it("setelah ada akun, jalur ini tertutup walau sandinya benar", async () => {
    assert.equal(await buatPemilikPertama(db, { email: "lain@contoh.com", password: SANDI, sandiAwal: SANDI }), null);
    assert.equal((await db.select().from(users)).length, 1);
  });
});

describe("login pertama bersamaan", () => {
  it("hanya satu pemilik yang dibuat", async () => {
    const { db: dbBaru, close: tutup } = await createPgliteDb();
    try {
      const hasil = await Promise.all(
        ["x@contoh.com", "y@contoh.com", "z@contoh.com"].map((email) => buatPemilikPertama(dbBaru, { email, password: SANDI, sandiAwal: SANDI })),
      );
      assert.equal(hasil.filter(Boolean).length, 1);
      assert.equal((await dbBaru.select().from(users)).length, 1);
    } finally {
      await tutup();
    }
  });
});
