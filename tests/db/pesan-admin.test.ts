import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createPgliteDb, type Db } from "@/db";
import { ubahAktif } from "@/lib/auth/akun";
import { buatUser } from "@/lib/auth/session";
import { bukaPesanBaru, daftarAkunPesan, jumlahPesanBaru, kirimPesan } from "@/lib/pesan/data";

let db: Db;
let close: () => Promise<void>;
let pemilik: string;
let owner: string;
let lain: string;

before(async () => {
  ({ db, close } = await createPgliteDb());
  pemilik = (await buatUser(db, { nama: "Najah", email: "najah@contoh.com", peran: "pemilik", password: "password-uji-1" })).id;
  owner = (await buatUser(db, { nama: "Arga", email: "arga@contoh.com", peran: "admin_toko", password: "password-uji-1" })).id;
  lain = (await buatUser(db, { nama: "Bima", email: "bima@contoh.com", peran: "admin_toko", password: "password-uji-1" })).id;
});
after(() => close());

describe("pesan antar akun admin", () => {
  it("pesan masuk terhitung, dibuka terlama dulu, lalu tidak terhitung lagi", async () => {
    assert.equal(await kirimPesan(db, pemilik, owner, "Tolong isi nomor WA ya."), "ok");
    assert.equal(await kirimPesan(db, pemilik, owner, "Rekening juga."), "ok");
    assert.equal(await jumlahPesanBaru(db, owner), 2);
    assert.equal(await jumlahPesanBaru(db, pemilik), 0);

    const dibuka = await bukaPesanBaru(db, owner);
    assert.deepEqual(
      dibuka.map((p) => [p.dariNama, p.isi]),
      [
        ["Najah", "Tolong isi nomor WA ya."],
        ["Najah", "Rekening juga."],
      ],
    );
    assert.equal(await jumlahPesanBaru(db, owner), 0);
    assert.deepEqual(await bukaPesanBaru(db, owner), []);
  });

  it("balasan ke pengirim; ke diri sendiri atau akun nonaktif ditolak", async () => {
    assert.equal(await kirimPesan(db, owner, pemilik, "Oke siap."), "ok");
    assert.equal(await jumlahPesanBaru(db, pemilik), 1);
    assert.equal(await kirimPesan(db, owner, owner, "halo"), "tidak_ada");
    await ubahAktif(db, { pelakuId: pemilik, userId: lain, aktif: false });
    assert.equal(await kirimPesan(db, owner, lain, "halo"), "tidak_ada");
    assert.deepEqual(
      (await daftarAkunPesan(db)).map((a) => a.nama),
      ["Arga", "Najah"],
    );
  });
});
