"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { aturAktifBanner, buatBanner, hapusBanner, ubahBanner } from "@/lib/banner/mutasi";
import { validasiBanner } from "@/lib/domain/banner";
import { isTipeFoto, validasiFileFoto } from "@/lib/domain/foto";
import { hapusFotoTersimpan, PenyimpananBelumSiap, simpanFoto } from "@/lib/foto/penyimpanan";

export type StateBanner = { error?: Record<string, string>; pesan?: string };

function segarkan() {
  revalidatePath("/");
  revalidatePath("/admin/pengaturan/banner");
}

/** id null = banner baru. Gambar sudah dikecilkan di browser; kolom "hapusGambar" = "1" untuk membuang gambar lama. */
export async function simpanBanner(id: string | null, form: FormData): Promise<StateBanner> {
  const user = await wajibIzin("banner.kelola");
  const teks = (k: string) => String(form.get(k) ?? "");
  const v = validasiBanner({
    judul: teks("judul"),
    keterangan: teks("keterangan"),
    tautan: teks("tautan"),
    teksTombol: teks("teksTombol"),
    mulai: teks("mulai"),
    selesai: teks("selesai"),
  });
  if (!v.ok) return { error: v.error };

  // undefined = gambar tidak diubah.
  let gambarUrl: string | null | undefined = form.get("hapusGambar") === "1" ? null : undefined;
  const file = form.get("gambar");
  if (file instanceof Blob && file.size > 0) {
    const salah = validasiFileFoto({ tipe: file.type, ukuran: file.size });
    if (salah || !isTipeFoto(file.type)) return { error: { gambar: salah ?? "Format gambar harus JPG, PNG, atau WebP." } };
    try {
      gambarUrl = await simpanFoto("banner", file, file.type);
    } catch (e) {
      if (e instanceof PenyimpananBelumSiap) return { pesan: "Penyimpanan gambar belum disiapkan di server." };
      return { pesan: "Gambar gagal diunggah. Coba lagi." };
    }
  }

  const db = await getDb();
  const unggahanBaru = typeof gambarUrl === "string" ? gambarUrl : null;
  try {
    if (id === null) {
      await buatBanner(db, { ...v.data, gambarUrl: gambarUrl ?? null }, user.id);
    } else {
      const hasil = await ubahBanner(db, id, { ...v.data, gambarUrl }, user.id);
      if (!hasil.ok) {
        if (unggahanBaru) await hapusFotoTersimpan(unggahanBaru).catch(() => {});
        return { pesan: "Banner ini sudah dihapus orang lain." };
      }
      if (hasil.gambarLama) await hapusFotoTersimpan(hasil.gambarLama).catch(() => {});
    }
  } catch (e) {
    if (unggahanBaru) await hapusFotoTersimpan(unggahanBaru).catch(() => {});
    throw e;
  }
  segarkan();
  redirect("/admin/pengaturan/banner?tersimpan=1");
}

export async function ubahAktifBanner(id: string, aktif: boolean): Promise<void> {
  const user = await wajibIzin("banner.kelola");
  await aturAktifBanner(await getDb(), id, aktif, user.id);
  segarkan();
  revalidatePath(`/admin/pengaturan/banner/${id}`);
}

export async function buangBanner(id: string): Promise<void> {
  const user = await wajibIzin("banner.kelola");
  const hasil = await hapusBanner(await getDb(), id, user.id);
  if (hasil && hasil.gambarUrl) await hapusFotoTersimpan(hasil.gambarUrl).catch(() => {});
  segarkan();
  redirect("/admin/pengaturan/banner?dihapus=1");
}
