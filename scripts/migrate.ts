import "./env";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
// Lewat @/db supaya cadangan WebSocket (paket ws) ikut terpasang sebelum Pool dibuat.
import { createPgliteDb, MIGRATIONS_FOLDER } from "@/db";
import { urlDatabaseMigrasi } from "@/db/url";
import { Pool } from "@neondatabase/serverless";

// Neon: dijalankan otomatis oleh Vercel lewat skrip "vercel-build" sebelum next build, jadi tiap deploy
// membawa migrasinya sendiri. Migrasi Drizzle hanya menjalankan file yang belum tercatat, aman diulang.
// Lokal (PGlite): migrasi juga otomatis jalan saat aplikasi membuka database.

const bersihkan = (pesan: string) => pesan.replace(/postgres(ql)?:\/\/\S+/gi, "[url disembunyikan]");

async function main() {
  const db = urlDatabaseMigrasi();
  if (!db && process.env.VERCEL) {
    // Lebih baik deploy gagal dengan pesan jelas daripada web tayang tanpa database.
    const ada = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|NEON|(^|_)PG/.test(k));
    console.error("DATABASE_URL belum diisi di Vercel. Settings → Environment Variables, atau Storage → hubungkan database Neon. Lalu redeploy.");
    console.error(`Env yang mirip database di build ini: ${ada.length ? ada.join(", ") : "(tidak ada)"}`);
    process.exit(1);
  }
  if (db) {
    console.log(`Migrasi Neon memakai ${db.nama} (${process.env.VERCEL_ENV ?? "lokal"})...`);
    const pool = new Pool({ connectionString: db.url });
    try {
      await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await pool.end();
    }
    console.log("Migrasi Neon selesai.");
  } else {
    const { close } = await createPgliteDb(process.env.PGLITE_DIR || ".data/pglite");
    await close();
    console.log("Migrasi PGlite lokal selesai.");
  }
}

// Kegagalan koneksi WebSocket datang sebagai ErrorEvent, bukan Error; pesannya ada di .message atau .error.
function teks(e: unknown): string {
  if (e instanceof Error) return e.message + (e.cause ? ` | sebab: ${teks(e.cause)}` : "");
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; error?: unknown };
    if (o.error) return teks(o.error);
    if (typeof o.message === "string" && o.message) return o.message;
  }
  return String(e);
}

main().catch((e) => {
  console.error("MIGRASI GAGAL:", bersihkan(teks(e)));
  process.exit(1);
});
