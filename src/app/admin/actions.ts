"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import { resetSandi as resetSandiDb, ubahAktif } from "@/lib/auth/akun";
import { catatGagalLogin, cekBlokirLogin, hapusGagalLogin } from "@/lib/auth/batas-login";
import { wajibIzin } from "@/lib/auth/current";
import { isPeran } from "@/lib/auth/roles";
import { pesanBatasLogin } from "@/lib/domain/batas-login";
import { buatPemilikPertama, buatSesi, buatUser, cekLogin, hapusSesi, SESSION_COOKIE } from "@/lib/auth/session";

export type StateForm = { error?: string; sukses?: string };

export async function login(_prev: StateForm, form: FormData): Promise<StateForm> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email dan password wajib diisi." };

  const db = await getDb();
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "tanpa-ip";
  const blokir = await cekBlokirLogin(db, email, ip);
  if (!blokir.boleh) return { error: pesanBatasLogin(blokir.tungguMenit) };

  const user =
    (await cekLogin(db, email, password)) ??
    (await buatPemilikPertama(db, { email, password, sandiAwal: process.env.ADMIN_PASSWORD }));
  if (!user) {
    await catatGagalLogin(db, email, ip);
    return { error: "Email atau password salah." };
  }
  await hapusGagalLogin(db, email);

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

export async function resetSandiAkun(_prev: StateForm, form: FormData): Promise<StateForm> {
  const pemilik = await wajibIzin("akun.kelola");
  const userId = String(form.get("userId") ?? "");
  const password = String(form.get("password") ?? "");
  const hasil = await resetSandiDb(await getDb(), { pelakuId: pemilik.id, userId, password });
  if (!hasil.ok) return { error: hasil.error };
  // Reset sandi sendiri ikut menghapus sesi ini, jadi langsung ke halaman login.
  if (userId === pemilik.id) redirect("/admin/login");
  revalidatePath("/admin/akun");
  return { sukses: `Password ${hasil.email} diganti. Akun itu perlu login ulang.` };
}

export async function ubahAktifAkun(_prev: StateForm, form: FormData): Promise<StateForm> {
  const pemilik = await wajibIzin("akun.kelola");
  const userId = String(form.get("userId") ?? "");
  const aktif = form.get("aktif") === "true";
  const hasil = await ubahAktif(await getDb(), { pelakuId: pemilik.id, userId, aktif });
  if (!hasil.ok) return { error: hasil.error };
  revalidatePath("/admin/akun");
  return { sukses: aktif ? `${hasil.email} aktif lagi.` : `${hasil.email} dinonaktifkan.` };
}
