// Alamat database dari env. Integrasi Neon di Vercel bisa memberi nama lain, mis. POSTGRES_URL atau
// <PREFIX>_DATABASE_URL kalau kolom "Custom Environment Variable Prefix" diisi. Semua itu diterima.

type Env = Record<string, string | undefined>;

const NAMA_UTAMA = ["DATABASE_URL", "POSTGRES_URL"];
const NAMA_TANPA_POOLER = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

function cari(env: Env, utama: string[], akhiran: string[]): { nama: string; url: string } | null {
  for (const nama of utama) if (env[nama]) return { nama, url: env[nama]! };
  const lain = Object.keys(env)
    .filter((k) => akhiran.some((a) => k.endsWith(`_${a}`)) && env[k])
    .sort();
  return lain.length ? { nama: lain[0], url: env[lain[0]]! } : null;
}

/** Untuk aplikasi: alamat lewat pooler (banyak koneksi singkat). */
export function urlDatabase(env: Env = process.env): { nama: string; url: string } | null {
  return cari(env, NAMA_UTAMA, NAMA_UTAMA);
}

/** Untuk migrasi: alamat langsung tanpa pooler kalau ada, selain itu sama dengan aplikasi. */
export function urlDatabaseMigrasi(env: Env = process.env): { nama: string; url: string } | null {
  return cari(env, NAMA_TANPA_POOLER, NAMA_TANPA_POOLER) ?? urlDatabase(env);
}
