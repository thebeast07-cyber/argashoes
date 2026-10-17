import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { urlDatabase } from "@/db/url";
import { tokenBlob } from "@/lib/foto/token-blob";

export const dynamic = "force-dynamic";

/** Pesan error tanpa connection string atau password, kalau ada yang ikut tercetak. */
function bersihkan(pesan: string): string {
  return pesan.replace(/postgres(ql)?:\/\/\S+/gi, "[url disembunyikan]").replace(/password=\S+/gi, "password=[disembunyikan]").slice(0, 300);
}

// Diagnosa deploy tanpa membuka rahasia: hanya ya/tidak dan pesan error yang dibersihkan.
export async function GET() {
  const env = (k: string) => Boolean(process.env[k]);
  const hasil: Record<string, unknown> = {
    node: process.version,
    websocketBawaan: typeof WebSocket !== "undefined",
    vercel: process.env.VERCEL_ENV ?? null,
    envDatabase: urlDatabase()?.nama ?? null,
    envBlob: tokenBlob()?.nama ?? null,
    envTerisi: {
      ADMIN_PASSWORD: env("ADMIN_PASSWORD"),
      RESEND_API_KEY: env("RESEND_API_KEY"),
    },
  };
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    hasil.database = "terhubung";
    try {
      const r = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
      hasil.migrasiTerpasang = (r as unknown as { rows: { n: number }[] }).rows?.[0]?.n ?? null;
    } catch (e) {
      hasil.migrasiTerpasang = `tidak terbaca: ${bersihkan(e instanceof Error ? e.message : String(e))}`;
    }
    try {
      const r = await db.execute(sql`select count(*)::int as n from users`);
      hasil.jumlahAkun = (r as unknown as { rows: { n: number }[] }).rows?.[0]?.n ?? null;
    } catch (e) {
      hasil.jumlahAkun = `tabel users tidak terbaca: ${bersihkan(e instanceof Error ? e.message : String(e))}`;
    }
  } catch (e) {
    hasil.database = `GAGAL: ${bersihkan(e instanceof Error ? e.message : String(e))}`;
  }
  return Response.json(hasil, { headers: { "Cache-Control": "no-store" } });
}
