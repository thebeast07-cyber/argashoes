"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import { wajibIzin } from "@/lib/auth/current";
import { isPeran } from "@/lib/auth/roles";
import { buatPemilikPertama, buatSesi, buatUser, cekLogin, hapusSesi, SESSION_COOKIE } from "@/lib/auth/session";

export type StateForm = { error?: string; sukses?: string };

export async function login(_prev: StateForm, form: FormData): Promise<StateForm> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email dan password wajib diisi." };

  const db = await getDb();
  const user =
    (await cekLogin(db, email, password)) ??
    (await buatPemilikPertama(db, { email, password, sandiAwal: process.env.ADMIN_PASSWORD }));
  if (!user) return { error: "Email atau password salah." };

  const { token, kedaluwarsa } = await buatSesi(db, user.id);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await hapusSesi(await getDb(), token);
  cookies().delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function tambahAkun(_prev: StateForm, form: FormData): Promise<StateForm> {
  const pemilik = await wajibIzin("akun.kelola");
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const peran = form.get("peran");
  if (!nama || !email || !isPeran(peran)) return { error: "Nama, email, dan peran wajib diisi." };

  const db = await getDb();
  try {
    const user = await buatUser(db, { nama, email, peran, password });
    await db.insert(auditLog).values({
      olehUserId: pemilik.id,
      aksi: "akun.dibuat",
      entitas: "users",
      entitasId: user.id,
      data: { email: user.email, peran: user.peran },
    });
    revalidatePath("/admin/akun");
    return { sukses: `Akun ${user.email} dibuat.` };
  } catch (e) {
    // 23505 = unique_violation (Drizzle menaruh error Postgres di `cause`).
    if ((e as { cause?: { code?: string } }).cause?.code === "23505") {
      return { error: "Email sudah dipakai akun lain." };
    }
    if (e instanceof Error && e.message.startsWith("Password")) return { error: e.message };
    throw e;
  }
}
