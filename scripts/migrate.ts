import "./env";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createPgliteDb, MIGRATIONS_FOLDER } from "@/db";
// Lewat @/db supaya cadangan WebSocket (paket ws) ikut terpasang sebelum Pool dibuat.
import { Pool } from "@neondatabase/serverless";

// Neon: dijalankan otomatis oleh Vercel lewat skrip "vercel-build" sebelum next build, jadi tiap deploy
// membawa migrasinya sendiri. Migrasi Drizzle hanya menjalankan file yang belum tercatat, aman diulang.
// Lokal (PGlite): migrasi juga otomatis jalan saat aplikasi membuka database.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.VERCEL) {
    // Lebih baik deploy gagal dengan pesan jelas daripada web tayang tanpa database.
    console.error("DATABASE_URL belum diisi di Vercel. Settings → Environment Variables, atau Storage → hubungkan database Neon. Lalu redeploy.");
    process.exit(1);
  }
  if (url) {
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
    await pool.end();
    console.log(`Migrasi Neon selesai (${process.env.VERCEL_ENV ?? "lokal"}).`);
  } else {
    const { close } = await createPgliteDb(process.env.PGLITE_DIR || ".data/pglite");
    await close();
    console.log("Migrasi PGlite lokal selesai.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
