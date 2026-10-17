// Banner promo: overlay gambar di beranda publik (potret untuk HP, lanskap untuk layar lebar). Fungsi murni.
// Jadwal diisi dan ditampilkan dalam WIB, disimpan sebagai timestamptz.

import type { HasilValidasi } from "./produk";

export type Banner = {
  id: string;
  judul: string;
  gambarPotret: string | null;
  gambarLanskap: string | null;
  tautan: string | null;
  mulai: Date;
  selesai: Date;
  aktif: boolean;
};

export type DataBanner = Omit<Banner, "id" | "gambarPotret" | "gambarLanskap" | "aktif">;
export type InputBanner = { judul: string; tautan: string; mulai: string; selesai: string };

export const BATAS_JUDUL = 120;

const WIB_MS = 7 * 60 * 60 * 1000;

/** "2026-11-11T00:00" (isian datetime-local, dibaca sebagai WIB) → Date. */
export function parseWaktuWib(teks: string): Date | null {
  const m = teks.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, th, bl, tg, jm, mn] = m.map(Number);
  const utc = Date.UTC(th, bl - 1, tg, jm, mn) - WIB_MS;
  const cek = new Date(utc + WIB_MS);
  // Menolak tanggal yang tidak ada (mis. 31 November) yang diam-diam digeser Date.UTC.
  if (cek.getUTCFullYear() !== th || cek.getUTCMonth() !== bl - 1 || cek.getUTCDate() !== tg || jm > 23 || mn > 59) return null;
  return new Date(utc);
}

/** Date → "2026-11-11T00:00" dalam WIB, untuk mengisi ulang kolom datetime-local. */
export function inputWaktuWib(waktu: Date): string {
  return new Date(waktu.getTime() + WIB_MS).toISOString().slice(0, 16);
}

/** Tautan internal ("/produk/...") atau https. "//domain" ditolak karena browser membacanya sebagai situs lain. */
export function tautanSah(tautan: string): boolean {
  if (tautan.startsWith("/")) return !tautan.startsWith("//") && !/\s/.test(tautan);
  try {
    return new URL(tautan).protocol === "https:";
  } catch {
    return false;
  }
}

export function validasiBanner(input: InputBanner): HasilValidasi<DataBanner> {
  const error: Record<string, string> = {};
  const judul = input.judul.trim().replace(/\s+/g, " ");
  const tautan = input.tautan.trim();
  const mulai = parseWaktuWib(input.mulai);
  const selesai = parseWaktuWib(input.selesai);

  if (!judul) error.judul = "Judul wajib diisi.";
  else if (judul.length > BATAS_JUDUL) error.judul = `Judul maksimal ${BATAS_JUDUL} huruf.`;
  if (tautan && !tautanSah(tautan)) error.tautan = "Tulis alamat halaman web ini (mulai dengan /) atau link https.";
  if (!mulai) error.mulai = "Isi tanggal dan jam mulai.";
  if (!selesai) error.selesai = "Isi tanggal dan jam selesai.";
  else if (mulai && selesai <= mulai) error.selesai = "Waktu selesai harus setelah waktu mulai.";

  if (Object.keys(error).length > 0) return { ok: false, error };
  return {
    ok: true,
    data: {
      judul,
      tautan: tautan || null,
      mulai: mulai!,
      selesai: selesai!,
    },
  };
}

/** Banner wajib punya dua gambar. Saat mengubah, gambar yang sudah tersimpan boleh dipakai lagi. */
export function galatGambarBanner(g: { potret: boolean; lanskap: boolean }): Record<string, string> {
  const error: Record<string, string> = {};
  if (!g.potret) error.gambarPotret = "Pilih gambar untuk HP (potret).";
  if (!g.lanskap) error.gambarLanskap = "Pilih gambar untuk desktop (lanskap).";
  return error;
}

/** Sekali ditutup, overlay banner yang sama tidak muncul lagi di browser itu selama 24 jam. */
export const JEDA_TAMPIL_ULANG_MS = 24 * 60 * 60 * 1000;

export function perluTampilOverlay(ditutupPada: number | null, sekarang: number): boolean {
  return ditutupPada === null || !Number.isFinite(ditutupPada) || sekarang - ditutupPada >= JEDA_TAMPIL_ULANG_MS || ditutupPada > sekarang;
}

export type StatusBanner = "nonaktif" | "dijadwalkan" | "tayang" | "selesai";

export const LABEL_STATUS_BANNER: Record<StatusBanner, string> = {
  nonaktif: "Dimatikan",
  dijadwalkan: "Terjadwal",
  tayang: "Sedang tayang",
  selesai: "Sudah lewat",
};

export function statusBanner(b: Pick<Banner, "aktif" | "mulai" | "selesai">, sekarang: Date): StatusBanner {
  if (!b.aktif) return "nonaktif";
  if (sekarang < b.mulai) return "dijadwalkan";
  if (sekarang >= b.selesai) return "selesai";
  return "tayang";
}

/** Banner yang tampil di beranda: satu saja, yang mulainya paling baru, supaya promo terbaru yang terlihat. */
export function bannerTayang<T extends Pick<Banner, "aktif" | "mulai" | "selesai">>(daftar: readonly T[], sekarang: Date): T | null {
  return [...daftar].filter((b) => statusBanner(b, sekarang) === "tayang").sort((a, b) => b.mulai.getTime() - a.mulai.getTime())[0] ?? null;
}

/** Urutan di admin: yang tayang, lalu terjadwal (paling dekat dulu), lalu dimatikan, lalu yang sudah lewat. */
export function urutBannerAdmin<T extends Pick<Banner, "aktif" | "mulai" | "selesai">>(daftar: readonly T[], sekarang: Date): T[] {
  const bobot: Record<StatusBanner, number> = { tayang: 0, dijadwalkan: 1, nonaktif: 2, selesai: 3 };
  return [...daftar].sort((a, b) => {
    const sa = statusBanner(a, sekarang);
    const sb = statusBanner(b, sekarang);
    if (sa !== sb) return bobot[sa] - bobot[sb];
    return sa === "dijadwalkan" ? a.mulai.getTime() - b.mulai.getTime() : b.mulai.getTime() - a.mulai.getTime();
  });
}
