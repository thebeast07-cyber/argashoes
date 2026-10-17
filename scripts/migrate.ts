import "./env";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { createPgliteDb, MIGRATIONS_FOLDER } from "@/db";

// Neon: dijalankan otomatis oleh Vercel lewat skrip "vercel-build" sebelum next build, jadi tiap deploy
// membawa migrasinya sendiri. Migrasi Drizzle hanya menjalankan file yang belum tercatat, aman diulang.
// Lokal (PGlite): migrasi juga otomatis jalan saat aplikasi membuka database.
async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
    await pool.end();
    console.log("Migrasi Neon selesai.");
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
