import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createPgliteDb, type Db } from "@/db";
import { customers, orderEvents, orders, products } from "@/db/schema";
import { buatSesi, buatUser, cekLogin, hapusSesi, validasiSesi } from "@/lib/auth/session";
import { ubahStatusOrder } from "@/lib/orders/ubah-status";

// Test integrasi dengan PGlite in-memory: migrasi asli, constraint asli.
let db: Db;
let close: () => Promise<void>;

before(async () => {
  ({ db, close } = await createPgliteDb());
});
after(() => close());

async function buatOrder(kode: string) {
  const [c] = await db
    .insert(customers)
    .values({ nama: "Budi", noWa: `62812${kode.replace(/\D/g, "")}` })
    .returning();
  const [o] = await db
    .insert(orders)
    .values({ kode, customerId: c.id, total: 1_000_000, nama: "Budi", noWa: c.noWa, alamat: "Jl. Mawar 1" })
    .returning();
  return o;
}

describe("akun dan sesi", () => {
  it("login, sesi valid, logout", async () => {
    const user = await buatUser(db, { nama: "Najah", email: " Najah@Contoh.com ", peran: "pemilik", password: "password-kuat-123" });
    assert.equal(user.email, "najah@contoh.com");

    assert.equal(await cekLogin(db, "najah@contoh.com", "salah-password"), null);
    assert.equal(await cekLogin(db, "tidak@ada.com", "password-kuat-123"), null);
    const masuk = await cekLogin(db, "NAJAH@contoh.com", "password-kuat-123");
    assert.equal(masuk?.peran, "pemilik");

    const { token } = await buatSesi(db, user.id);
    assert.equal((await validasiSesi(db, token))?.id, user.id);
    assert.equal(await validasiSesi(db, "token-palsu"), null);

    // Sesi kedaluwarsa ditolak
    const besok = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    assert.equal(await validasiSesi(db, token, besok), null);

    await hapusSesi(db, token);
    assert.equal(await validasiSesi(db, token), null);
  });

  it("password terlalu pendek ditolak, email unik", async () => {
    await assert.rejects(buatUser(db, { nama: "A", email: "a@b.com", peran: "admin_toko", password: "pendek" }));
    await buatUser(db, { nama: "A", email: "a@b.com", peran: "admin_toko", password: "cukup-panjang" });
    await assert.rejects(buatUser(db, { nama: "A2", email: "A@B.com", peran: "admin_toko", password: "cukup-panjang" }));
  });
});

describe("constraint skema", () => {
  it("fee_per_pasang produk harus 50rb sampai 100rb atau kosong", async () => {
    await db.insert(products).values({ nama: "Air Max", brand: "Nike", harga: 1_500_000 });
    await db.insert(products).values({ nama: "Samba", brand: "Adidas", harga: 1_600_000, feePerPasang: 80_000 });
    await assert.rejects(db.insert(products).values({ nama: "X", brand: "Nike", harga: 1, feePerPasang: 10_000 }));
  });

  it("order tidak bisa berstatus Dikirim tanpa resi, walau lewat SQL langsung", async () => {
    const o = await buatOrder("WEB-9001");
    await assert.rejects(db.update(orders).set({ status: "dikirim" }).where(eq(orders.id, o.id)));
  });
});

describe("ubahStatusOrder", () => {
  it("menyimpan status, resi, dan event audit", async () => {
    const admin = await buatUser(db, { nama: "Toko", email: "toko@contoh.com", peran: "admin_toko", password: "password-toko-1" });
    const o = await buatOrder("WEB-0001");

    assert.deepEqual(await ubahStatusOrder(db, { orderId: o.id, ke: "dikirim", resiNomor: "X", olehUserId: admin.id }), {
      ok: false,
      error: "TRANSISI_TIDAK_VALID",
    });
    assert.deepEqual(await ubahStatusOrder(db, { orderId: o.id, ke: "dikonfirmasi", olehUserId: admin.id }), { ok: true });
    assert.deepEqual(await ubahStatusOrder(db, { orderId: o.id, ke: "dikirim", olehUserId: admin.id }), {
      ok: false,
      error: "RESI_WAJIB",
    });
    const waktu = new Date("2026-10-16T03:00:00Z");
    assert.deepEqual(
      await ubahStatusOrder(db, { orderId: o.id, ke: "dikirim", resiNomor: "JNE123", olehUserId: admin.id, waktu }),
      { ok: true },
    );

    const [simpan] = await db.select().from(orders).where(eq(orders.id, o.id));
    assert.equal(simpan.status, "dikirim");
    assert.equal(simpan.resiNomor, "JNE123");
    assert.equal(simpan.dikirimPada?.toISOString(), waktu.toISOString());

    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id));
    assert.deepEqual(
      events.map((e) => [e.dariStatus, e.keStatus, e.olehUserId]),
      [
        ["lead", "dikonfirmasi", admin.id],
        ["dikonfirmasi", "dikirim", admin.id],
      ],
    );
  });

  it("order yang tidak ada", async () => {
    const admin = await buatUser(db, { nama: "B", email: "b@contoh.com", peran: "admin_toko", password: "password-b-123" });
    assert.deepEqual(
      await ubahStatusOrder(db, { orderId: "00000000-0000-0000-0000-000000000000", ke: "batal", olehUserId: admin.id }),
      { ok: false, error: "ORDER_TIDAK_ADA" },
    );
  });

  it("log event tidak bisa diubah atau dihapus", async () => {
    // Drizzle membungkus error Postgres; pesan trigger ada di `cause`.
    const dariTrigger = (e: unknown) => /hanya bisa ditambah/.test(String((e as { cause?: Error }).cause?.message));
    const [event] = await db.select().from(orderEvents).limit(1);
    await assert.rejects(db.update(orderEvents).set({ keStatus: "batal" }).where(eq(orderEvents.id, event.id)), dariTrigger);
    await assert.rejects(db.delete(orderEvents).where(eq(orderEvents.id, event.id)), dariTrigger);
  });
});
