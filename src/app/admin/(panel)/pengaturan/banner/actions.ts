"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { ambilBanner } from "@/lib/banner/data";
import { aturAktifBanner, buatBanner, hapusBanner, ubahBanner } from "@/lib/banner/mutasi";
import { galatGambarBanner, validasiBanner } from "@/lib/domain/banner";
import { isTipeFoto, validasiFileFoto } from "@/lib/domain/foto";
import { hapusFotoTersimpan, PenyimpananBelumSiap, simpanFoto } from "@/lib/foto/penyimpanan";

export type StateBanner = { error?: Record<string, string>; pesan?: string };

const KOLOM_GAMBAR = ["gambarPotret", "gambarLanskap"] as const;

function segarkan() {
  revalidatePath("/");
  revalidatePath("/admin/pengaturan/banner");
}

async function hapusSemua(url: string[]) {
  await Promise.all(url.map((u) => hapusFotoTersimpan(u).catch(() => {})));
}

/** id null = banner baru. Gambar sudah dikecilkan di browser; yang tidak dikirim berarti tetap memakai yang lama. */
export async function simpanBanner(id: string | null, form: FormData): Promise<StateBanner> {
  const user = await wajibIzin("banner.kelola");
  const teks = (k: string) => String(form.get(k) ?? "");
  const v = validasiBanner({ judul: teks("judul"), tautan: teks("tautan"), mulai: teks("mulai"), selesai: teks("selesai") });

  const file: Partial<Record<(typeof KOLOM_GAMBAR)[number], Blob>> = {};
  const errorFile: Record<string, string> = {};
  for (const k of KOLOM_GAMBAR) {
    const f = form.get(k);
    if (!(f instanceof Blob) || f.size === 0) continue;
    const salah = validasiFileFoto({ tipe: f.type, ukuran: f.size });
    if (salah || !isTipeFoto(f.type)) errorFile[k] = salah ?? "Format gambar harus JPG, PNG, atau WebP.";
    else file[k] = f;
  }

  const db = await getDb();
  const lama = id === null ? null : await ambilBanner(db, id);
  if (id !== null && !lama) return { pesan: "Banner ini sudah dihapus." };
  const error = {
    ...(v.ok ? {} : v.error),
    ...galatGambarBanner({ potret: Boolean(file.gambarPotret || lama?.gambarPotret), lanskap: Boolean(file.gambarLanskap || lama?.gambarLanskap) }),
    ...errorFile,
  };
  if (!v.ok || Object.keys(error).length > 0) return { error };

  // Gambar disimpan setelah semua isian lolos, supaya tidak ada file yang tertinggal tanpa banner.
  const unggahan: Partial<Record<(typeof KOLOM_GAMBAR)[number], string>> = {};
  try {
    for (const k of KOLOM_GAMBAR) {
      const f = file[k];
      if (f) unggahan[k] = await simpanFoto("banner", f, f.type as Parameters<typeof simpanFoto>[2]);
    }
  } catch (e) {
    await hapusSemua(Object.values(unggahan));
    if (e instanceof PenyimpananBelumSiap) return { pesan: "Penyimpanan gambar belum disiapkan di server." };
    return { pesan: "Gambar gagal diunggah. Coba lagi." };
  }

  try {
    if (id === null) {
      await buatBanner(db, { ...v.data, gambarPotret: unggahan.gambarPotret!, gambarLanskap: unggahan.gambarLanskap! }, user.id);
    } else {
      const hasil = await ubahBanner(db, id, { ...v.data, ...unggahan }, user.id);
      if (!hasil.ok) {
        await hapusSemua(Object.values(unggahan));
        return { pesan: "Banner ini sudah dihapus." };
      }
      await hapusSemua(hasil.gambarLama);
    }
  } catch (e) {
    await hapusSemua(Object.values(unggahan));
    throw e;
  }
  segarkan();
  redirect("/admin/pengaturan/banner?tersimpan=1");
}

export async function ubahAktifBanner(id: string, aktif: boolean): Promise<void> {
  const user = await wajibIzin("banner.kelola");
  const db = await getDb();
  const b = await ambilBanner(db, id);
  if (!b || (aktif && !(b.gambarPotret && b.gambarLanskap))) return;
  await aturAktifBanner(db, id, aktif, user.id);
  segarkan();
  revalidatePath(`/admin/pengaturan/banner/${id}`);
}

export async function buangBanner(id: string): Promise<void> {
  const user = await wajibIzin("banner.kelola");
  const hasil = await hapusBanner(await getDb(), id, user.id);
  if (hasil) await hapusSemua(hasil.gambar);
  segarkan();
  redirect("/admin/pengaturan/banner?dihapus=1");
}
