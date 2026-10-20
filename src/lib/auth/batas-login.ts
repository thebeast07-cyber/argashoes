import { and, eq, gt, lt, or } from "drizzle-orm";
import type { Db } from "@/db";
import { percobaanLogin } from "@/db/schema";
import { BATAS_LOGIN, cekBatasLogin, type HasilBatasLogin } from "@/lib/domain/batas-login";
import { normalisasiEmail } from "./session";

export async function cekBlokirLogin(db: Db, email: string, ip: string, sekarang = new Date()): Promise<HasilBatasLogin> {
  const e = normalisasiEmail(email);
  const sejak = new Date(sekarang.getTime() - BATAS_LOGIN.jendelaMenit * 60_000);
  const baris = await db
    .select({ email: percobaanLogin.email, ip: percobaanLogin.ip, waktu: percobaanLogin.waktu })
    .from(percobaanLogin)
    .where(and(gt(percobaanLogin.waktu, sejak), or(eq(percobaanLogin.email, e), eq(percobaanLogin.ip, ip))));
  return cekBatasLogin(
    { email: baris.filter((b) => b.email === e).map((b) => b.waktu), ip: baris.filter((b) => b.ip === ip).map((b) => b.waktu) },
    sekarang,
  );
}

export async function catatGagalLogin(db: Db, email: string, ip: string, sekarang = new Date()): Promise<void> {
  await db.insert(percobaanLogin).values({ email: normalisasiEmail(email), ip, waktu: sekarang });
  await db.delete(percobaanLogin).where(lt(percobaanLogin.waktu, new Date(sekarang.getTime() - 24 * 60 * 60_000)));
}

/** Login berhasil: hitungan email itu mulai dari nol lagi. Hitungan IP tetap. */
export async function hapusGagalLogin(db: Db, email: string): Promise<void> {
  await db.delete(percobaanLogin).where(eq(percobaanLogin.email, normalisasiEmail(email)));
}
