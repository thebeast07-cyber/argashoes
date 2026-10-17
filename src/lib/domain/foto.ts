// Foto produk: urutan, batas jumlah, dan syarat file. Fungsi murni.
// Foto disimpan per model (bukan per size). Foto pertama adalah sampul di katalog.

export const FOTO_MAKS = 8;
/** Sisi terpanjang setelah dikecilkan di browser sebelum diunggah. */
export const FOTO_SISI_MAKS = 1600;
/** Batas file yang diterima server. Foto 1600px hasil kompresi biasanya 150-500 KB. */
export const FOTO_UKURAN_MAKS = 1.5 * 1024 * 1024;

export const TIPE_FOTO = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" } as const;
export type TipeFoto = keyof typeof TIPE_FOTO;

export function isTipeFoto(tipe: string): tipe is TipeFoto {
  return Object.prototype.hasOwnProperty.call(TIPE_FOTO, tipe);
}

/** Pesan galat untuk ditampilkan, atau null kalau file boleh disimpan. */
export function validasiFileFoto(file: { tipe: string; ukuran: number }): string | null {
  if (!isTipeFoto(file.tipe)) return "Format foto harus JPG, PNG, atau WebP.";
  if (file.ukuran === 0) return "File foto kosong.";
  if (file.ukuran > FOTO_UKURAN_MAKS) return "Foto terlalu besar. Pilih ulang; foto dikecilkan otomatis sebelum diunggah.";
  return null;
}

export type AksiFoto =
  | { jenis: "tambah"; url: string }
  | { jenis: "sampul"; url: string }
  | { jenis: "geser"; url: string; arah: -1 | 1 }
  | { jenis: "hapus"; url: string };

export type HasilFoto = { ok: true; foto: string[] } | { ok: false; error: "penuh" | "tidak_ada" | "sudah_ada" };

export function terapkanAksiFoto(foto: readonly string[], aksi: AksiFoto): HasilFoto {
  const i = foto.indexOf(aksi.url);
  if (aksi.jenis === "tambah") {
    if (i !== -1) return { ok: false, error: "sudah_ada" };
    if (foto.length >= FOTO_MAKS) return { ok: false, error: "penuh" };
    return { ok: true, foto: [...foto, aksi.url] };
  }
  if (i === -1) return { ok: false, error: "tidak_ada" };

  const baru = [...foto];
  if (aksi.jenis === "hapus") {
    baru.splice(i, 1);
  } else if (aksi.jenis === "sampul") {
    baru.splice(i, 1);
    baru.unshift(aksi.url);
  } else {
    const j = i + aksi.arah;
    // Di ujung daftar, geser tidak mengubah apa-apa.
    if (j >= 0 && j < baru.length) [baru[i], baru[j]] = [baru[j], baru[i]];
  }
  return { ok: true, foto: baru };
}

/** Bentuk aksi yang datang dari browser belum tentu valid; tambah hanya boleh dari server setelah upload. */
export function parseAksiFoto(nilai: unknown): Exclude<AksiFoto, { jenis: "tambah" }> | null {
  const a = nilai as { jenis?: unknown; url?: unknown; arah?: unknown } | null;
  if (!a || typeof a.url !== "string" || a.url === "") return null;
  if (a.jenis === "sampul" || a.jenis === "hapus") return { jenis: a.jenis, url: a.url };
  if (a.jenis === "geser" && (a.arah === -1 || a.arah === 1)) return { jenis: "geser", url: a.url, arah: a.arah };
  return null;
}

/** Ukuran hasil kecilkan: sisi terpanjang paling besar `maks`, rasio tetap, tidak pernah diperbesar. */
export function ukuranKecil(lebar: number, tinggi: number, maks = FOTO_SISI_MAKS): { lebar: number; tinggi: number } {
  const skala = Math.min(1, maks / Math.max(lebar, tinggi));
  return { lebar: Math.round(lebar * skala), tinggi: Math.round(tinggi * skala) };
}
