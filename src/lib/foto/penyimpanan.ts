import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { TIPE_FOTO, type TipeFoto } from "@/lib/domain/foto";
import { kredensialBlob } from "./kredensial-blob";

// Kredensial Blob ada (lihat kredensial-blob.ts) → Vercel Blob. Kosong → folder lokal ./.data/foto, disajikan oleh /foto/[nama].
// Pola yang sama dengan database: lokal jalan tanpa setup apa pun.

export class PenyimpananBelumSiap extends Error {}

const folderLokal = () => path.resolve(process.env.FOTO_DIR ?? ".data/foto");

/** Nama file lokal yang sah: uuid + ekstensi foto. Menutup path traversal di route penyaji. */
export const POLA_NAMA_LOKAL = /^[0-9a-f-]{36}\.(jpg|webp|png)$/;

/** `folder` hanya mengelompokkan file di Blob, mis. "produk/<id>" atau "resi/<id>". */
export async function simpanFoto(folder: string, isi: Blob, tipe: TipeFoto): Promise<string> {
  const nama = `${randomUUID()}.${TIPE_FOTO[tipe]}`;
  const blob = kredensialBlob();
  if (blob) {
    const hasil = await put(`${folder}/${nama}`, isi, {
      access: "public",
      contentType: tipe,
      cacheControlMaxAge: 31_536_000,
      ...blob.opsi,
    });
    return hasil.url;
  }
  // Filesystem di Vercel hanya-baca: tanpa token Blob, upload di Preview/Production pasti gagal.
  if (process.env.VERCEL) throw new PenyimpananBelumSiap("Blob belum terhubung: BLOB_READ_WRITE_TOKEN atau BLOB_STORE_ID kosong di Vercel.");
  await mkdir(folderLokal(), { recursive: true });
  await writeFile(path.join(folderLokal(), nama), Buffer.from(await isi.arrayBuffer()));
  return `/foto/${nama}`;
}

/** Dipanggil setelah transaksi DB selesai. File yatim lebih aman daripada foto hilang dari produk. */
export async function hapusFotoTersimpan(url: string): Promise<void> {
  if (url.startsWith("/foto/")) {
    const nama = url.slice("/foto/".length);
    if (POLA_NAMA_LOKAL.test(nama)) await unlink(path.join(folderLokal(), nama)).catch(() => {});
    return;
  }
  const blob = kredensialBlob();
  if (blob) await del(url, blob.opsi);
}

export async function bacaFotoLokal(nama: string): Promise<Buffer | null> {
  if (!POLA_NAMA_LOKAL.test(nama)) return null;
  return readFile(path.join(folderLokal(), nama)).catch(() => null);
}
