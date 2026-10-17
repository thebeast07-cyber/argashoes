import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt, lte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, sessions, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { PASSWORD_MIN } from "./password-rules";
import type { Peran } from "./roles";

// Logika akun dan sesi yang tidak bergantung pada Next (bisa dites dengan PGlite).

export { SESSION_COOKIE } from "./cookie";
export const SESSION_HARI = 14;

export type UserSesi = {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalisasiEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function buatUser(
  db: Db,
  input: { nama: string; email: string; peran: Peran; password: string },
): Promise<UserSesi> {
  if (input.password.length < PASSWORD_MIN) {
    throw new Error(`Password minimal ${PASSWORD_MIN} karakter.`);
  }
  const [user] = await db
    .insert(users)
    .values({
      nama: input.nama.trim(),
      email: normalisasiEmail(input.email),
      peran: input.peran,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id, nama: users.nama, email: users.email, peran: users.peran });
  return user;
}

export async function adaAkun(db: Db): Promise<boolean> {
  const [{ jumlah }] = await db.select({ jumlah: count() }).from(users);
  return jumlah > 0;
}

/** Bandingkan lewat sha256 supaya panjang sama dan waktu perbandingan tidak membocorkan isi sandi. */
function sandiSama(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * Akun pemilik pertama dibuat lewat form login, tanpa terminal: hanya selama tabel users masih kosong,
 * dan hanya kalau sandinya sama dengan env ADMIN_PASSWORD. Setelah ada satu akun, jalur ini tertutup.
 */
export async function buatPemilikPertama(
  db: Db,
  input: { email: string; password: string; sandiAwal: string | undefined },
): Promise<UserSesi | null> {
  const { sandiAwal } = input;
  const email = normalisasiEmail(input.email);
  if (!sandiAwal || sandiAwal.length < PASSWORD_MIN || !email.includes("@")) return null;
  if (!sandiSama(input.password, sandiAwal)) return null;

  return db.transaction(async (tx) => {
    // Dua login pertama yang bersamaan tidak boleh sama-sama membuat pemilik.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('pemilik_pertama'))`);
    const [{ jumlah }] = await tx.select({ jumlah: count() }).from(users);
    if (jumlah > 0) return null;
    const [user] = await tx
      .insert(users)
      .values({ nama: email.split("@")[0], email, peran: "pemilik", passwordHash: await hashPassword(input.password) })
      .returning({ id: users.id, nama: users.nama, email: users.email, peran: users.peran });
    await tx.insert(auditLog).values({
      olehUserId: user.id,
      aksi: "akun.dibuat",
      entitas: "users",
      entitasId: user.id,
      data: { email: user.email, peran: user.peran, sumber: "login_pertama" },
    });
    return user;
  });
}

// Hash dummy supaya waktu respons email-tidak-ada sama dengan password-salah.
let hashDummy: Promise<string> | undefined;

export async function cekLogin(db: Db, email: string, password: string): Promise<UserSesi | null> {
  const [user] = await db.select().from(users).where(eq(users.email, normalisasiEmail(email))).limit(1);
  if (!user || !user.aktif) {
    hashDummy ??= hashPassword("dummy-password-untuk-timing");
    await verifyPassword(password, await hashDummy);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, nama: user.nama, email: user.email, peran: user.peran };
}

export async function buatSesi(db: Db, userId: string, sekarang = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const kedaluwarsa = new Date(sekarang.getTime() + SESSION_HARI * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: hashToken(token), userId, kedaluwarsa });
  return { token, kedaluwarsa };
}

export async function validasiSesi(db: Db, token: string, sekarang = new Date()): Promise<UserSesi | null> {
  const [row] = await db
    .select({ id: users.id, nama: users.nama, email: users.email, peran: users.peran })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.kedaluwarsa, sekarang), eq(users.aktif, true)))
    .limit(1);
  return row ?? null;
}

export async function hapusSesi(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function hapusSesiKedaluwarsa(db: Db, sekarang = new Date()): Promise<void> {
  await db.delete(sessions).where(lte(sessions.kedaluwarsa, sekarang));
}
