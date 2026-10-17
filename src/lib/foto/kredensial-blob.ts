// Kredensial Vercel Blob dari env. Ada dua bentuk:
// - Token read-write (BLOB_READ_WRITE_TOKEN, atau <PREFIX>_READ_WRITE_TOKEN kalau prefix diisi).
// - ID store saja (BLOB_STORE_ID / <PREFIX>_STORE_ID). Integrasi Blob yang baru hanya membuat ini;
//   SDK lalu login pakai token OIDC yang diberikan Vercel saat fungsi berjalan.
// Token read-write didahulukan karena tidak bergantung pada OIDC.

type Env = Record<string, string | undefined>;

export type KredensialBlob = { nama: string; opsi: { token: string } | { storeId: string } };

// Awalan nilai dicek supaya env lain yang kebetulan berakhiran sama tidak ikut terambil.
function cari(env: Env, utama: string, akhiran: string, awalanNilai: string): { nama: string; nilai: string } | null {
  if (env[utama]) return { nama: utama, nilai: env[utama]! };
  const lain = Object.keys(env)
    .filter((k) => k.endsWith(akhiran) && env[k]?.startsWith(awalanNilai))
    .sort();
  return lain.length ? { nama: lain[0], nilai: env[lain[0]]! } : null;
}

export function kredensialBlob(env: Env = process.env): KredensialBlob | null {
  const token = cari(env, "BLOB_READ_WRITE_TOKEN", "_READ_WRITE_TOKEN", "vercel_blob_rw_");
  if (token) return { nama: token.nama, opsi: { token: token.nilai } };
  const store = cari(env, "BLOB_STORE_ID", "_STORE_ID", "store_");
  if (store) return { nama: store.nama, opsi: { storeId: store.nilai } };
  return null;
}
