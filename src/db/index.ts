import fs from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import ws from "ws";
import * as schema from "./schema";
import { urlDatabase } from "./url";

// Driver Neon memakai WebSocket. Node 22 punya bawaan; Node 20 (bisa jadi versi project di Vercel) belum, jadi pakai paket ws.
if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;

// Satu tipe untuk dua driver: Neon (Vercel) dan PGlite (lokal/test).
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
const PGLITE_DIR_DEFAULT = path.join(process.cwd(), ".data", "pglite");

export function createNeonDb(url: string): { db: Db; close: () => Promise<void> } {
  const pool = new Pool({ connectionString: url });
  return { db: drizzleNeon({ client: pool, schema }), close: () => pool.end() };
}

/**
 * PGlite: Postgres dalam proses. dataDir kosong = in-memory (dipakai test).
 * Migrasi langsung dijalankan supaya lokal tidak perlu langkah tambahan.
 */
export async function createPgliteDb(dataDir?: string): Promise<{ db: Db; close: () => Promise<void> }> {
  // PGlite bikin folder terakhir saja, bukan induknya, jadi clone baru gagal tanpa ini.
  if (dataDir && !dataDir.includes("://")) {
    await fs.mkdir(dataDir, { recursive: true });
  }
  const client = new PGlite(dataDir);
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, close: () => client.close() };
}

// Simpan di globalThis supaya hot reload `next dev` tidak membuka PGlite dua kali.
const globalDb = globalThis as unknown as { __argashoesDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalDb.__argashoesDb) {
    const url = urlDatabase()?.url;
    // Di Vercel, PGlite pasti gagal (filesystem hanya-baca). Pesan ini muncul di log, bukan error yang membingungkan.
    if (!url && process.env.VERCEL) throw new Error("DATABASE_URL belum diisi di Vercel (Settings → Environment Variables). Hubungkan database Neon lalu redeploy.");
    globalDb.__argashoesDb = url
      ? Promise.resolve(createNeonDb(url).db)
      : createPgliteDb(process.env.PGLITE_DIR || PGLITE_DIR_DEFAULT).then((r) => r.db);
    // Kalau gagal, jangan cache promise yang sudah reject.
    globalDb.__argashoesDb.catch(() => {
      globalDb.__argashoesDb = undefined;
    });
  }
  return globalDb.__argashoesDb;
}

export { schema };
