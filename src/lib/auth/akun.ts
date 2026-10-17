import { and, count, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, sessions, users } from "@/db/schema";
import { cekSandiBaru, cekUbahAktif } from "@/lib/domain/akun";
import { hashPassword } from "./password";

// Reset sandi dan aktif/nonaktif akun oleh pemilik. Tanpa Next, supaya bisa dites dengan PGlite.

export type HasilAkun = { ok: true; email: string } | { ok: false; error: string };

/** Sandi lama langsung tidak berlaku: semua sesi akun itu dihapus, termasuk sesi pelaku kalau mereset sandinya sendiri. */
export async function resetSandi(db: Db, input: { pelakuId: string; userId: string; password: string }): Promise<HasilAkun> {
  const galat = cekSandiBaru(input.password);
  if (galat) return { ok: false, error: galat };
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, input.userId))
      .returning({ id: users.id, email: users.email });
    if (!user) return { ok: false, error: "Akun tidak ditemukan." };
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.insert(auditLog).values({
      olehUserId: input.pelakuId,
      aksi: "akun.sandi_direset",
      entitas: "users",
      entitasId: user.id,
      data: { email: user.email },
    });
    return { ok: true, email: user.email };
  });
}

export async function ubahAktif(db: Db, input: { pelakuId: string; userId: string; aktif: boolean }): Promise<HasilAkun> {
  return db.transaction(async (tx) => {
    // Dua pemilik yang saling menonaktifkan bersamaan tidak boleh membuat pemilik aktif habis.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('akun_aktif'))`);
    const [sasaran] = await tx
      .select({ id: users.id, email: users.email, peran: users.peran, aktif: users.aktif })
      .from(users)
      .where(eq(users.id, input.userId));
    if (!sasaran) return { ok: false, error: "Akun tidak ditemukan." };
    const [{ jumlah }] = await tx
      .select({ jumlah: count() })
      .from(users)
      .where(and(eq(users.peran, "pemilik"), eq(users.aktif, true)));

    const galat = cekUbahAktif({ pelakuId: input.pelakuId, sasaran, aktifBaru: input.aktif, jumlahPemilikAktif: jumlah });
    if (galat) return { ok: false, error: galat };

    await tx.update(users).set({ aktif: input.aktif }).where(eq(users.id, sasaran.id));
    if (!input.aktif) await tx.delete(sessions).where(eq(sessions.userId, sasaran.id));
    await tx.insert(auditLog).values({
      olehUserId: input.pelakuId,
      aksi: input.aktif ? "akun.diaktifkan" : "akun.dinonaktifkan",
      entitas: "users",
      entitasId: sasaran.id,
      data: { email: sasaran.email },
    });
    return { ok: true, email: sasaran.email };
  });
}
