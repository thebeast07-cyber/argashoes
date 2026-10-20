import "server-only";
import sharp from "sharp";
import { FOTO_KECIL_SISI, sumberFotoSendiri } from "@/lib/domain/foto";
import { bacaFotoLokal, simpanFoto } from "./penyimpanan";

// Versi 600px untuk kartu katalog, dibuat di server dengan sharp (lihat FOTO_KECIL_SISI di domain/foto.ts).

async function kecilkan(isi: Buffer): Promise<Buffer> {
  return sharp(isi)
    .rotate()
    .resize({ width: FOTO_KECIL_SISI, height: FOTO_KECIL_SISI, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#FFFFFF" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}

/** null kalau gagal: produk tetap bisa memakai foto aslinya, jadi upload tidak ikut gagal. */
export async function buatFotoKecil(folder: string, isi: Buffer): Promise<string | null> {
  try {
    const kecil = await kecilkan(isi);
    return await simpanFoto(folder, new Blob([new Uint8Array(kecil)], { type: "image/jpeg" }), "image/jpeg");
  } catch (e) {
    console.error("Gagal membuat foto kecil", e);
    return null;
  }
}

export async function bacaFotoAsli(url: string): Promise<Buffer | null> {
  if (!sumberFotoSendiri(url)) return null;
  if (url.startsWith("/foto/")) return bacaFotoLokal(url.slice("/foto/".length));
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
