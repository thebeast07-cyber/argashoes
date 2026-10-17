// Token Vercel Blob dari env. Kalau "Custom Environment Variable Prefix" diisi saat menghubungkan store,
// namanya jadi <PREFIX>_READ_WRITE_TOKEN, bukan BLOB_READ_WRITE_TOKEN. Semua itu diterima, sama seperti database.

type Env = Record<string, string | undefined>;

const NAMA_UTAMA = "BLOB_READ_WRITE_TOKEN";
const AKHIRAN = "_READ_WRITE_TOKEN";
// Token Blob selalu berawalan ini, jadi token lain yang kebetulan berakhiran sama tidak ikut terambil.
const AWALAN_NILAI = "vercel_blob_rw_";

export function tokenBlob(env: Env = process.env): { nama: string; token: string } | null {
  if (env[NAMA_UTAMA]) return { nama: NAMA_UTAMA, token: env[NAMA_UTAMA]! };
  const lain = Object.keys(env)
    .filter((k) => k.endsWith(AKHIRAN) && env[k]?.startsWith(AWALAN_NILAI))
    .sort();
  return lain.length ? { nama: lain[0], token: env[lain[0]]! } : null;
}
