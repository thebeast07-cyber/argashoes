// Aturan mengelola akun admin yang sudah ada: reset sandi dan aktif/nonaktif. Fungsi murni.

import type { Peran } from "@/lib/auth/roles";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";

export type AkunSasaran = { id: string; peran: Peran; aktif: boolean };

export function cekSandiBaru(password: string): string | null {
  return password.length < PASSWORD_MIN ? `Password minimal ${PASSWORD_MIN} karakter.` : null;
}

/**
 * Pemilik tidak bisa menonaktifkan dirinya sendiri, dan harus selalu tersisa satu pemilik aktif.
 * Tanpa itu panel bisa terkunci: halaman Akun hanya bisa dibuka pemilik.
 */
export function cekUbahAktif(input: {
  pelakuId: string;
  sasaran: AkunSasaran;
  aktifBaru: boolean;
  jumlahPemilikAktif: number;
}): string | null {
  const { pelakuId, sasaran, aktifBaru, jumlahPemilikAktif } = input;
  if (sasaran.aktif === aktifBaru) return aktifBaru ? "Akun ini sudah aktif." : "Akun ini sudah nonaktif.";
  if (aktifBaru) return null;
  if (sasaran.id === pelakuId) return "Akun sendiri tidak bisa dinonaktifkan.";
  if (sasaran.peran === "pemilik" && jumlahPemilikAktif <= 1) return "Harus ada minimal satu pemilik aktif.";
  return null;
}
