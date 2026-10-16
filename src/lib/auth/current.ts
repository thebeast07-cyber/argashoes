import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { punyaIzin, type Izin } from "./roles";
import { SESSION_COOKIE, validasiSesi, type UserSesi } from "./session";

// Helper auth khusus Next (server component, server action, route handler).

export const getUserSaatIni = cache(async (): Promise<UserSesi | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validasiSesi(await getDb(), token);
});

export async function wajibLogin(): Promise<UserSesi> {
  const user = await getUserSaatIni();
  if (!user) redirect("/admin/login");
  return user;
}

/** Untuk halaman/aksi yang butuh izin tertentu, mis. "fee.atur" hanya untuk pemilik. */
export async function wajibIzin(izin: Izin): Promise<UserSesi> {
  const user = await wajibLogin();
  if (!punyaIzin(user.peran, izin)) redirect("/admin?akses=ditolak");
  return user;
}
