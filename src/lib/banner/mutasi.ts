import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, banner } from "@/db/schema";
import type { DataBanner } from "@/lib/domain/banner";

// Setiap perubahan banner ditulis bersama audit log-nya dalam satu transaksi.
// File gambar lama dihapus pemanggil setelah transaksi selesai (sama seperti foto produk).

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type GambarBanner = { gambarPotret: string; gambarLanskap: string };

async function catat(tx: Tx, olehUserId: string, aksi: string, entitasId: string, data: unknown) {
  await tx.insert(auditLog).values({ olehUserId, aksi, entitas: "banner", entitasId, data });
}

/** URL yang tidak dipakai lagi setelah perubahan. Satu file bisa dipakai di dua kolom (banner lama hasil migrasi). */
function gambarTerbuang(lama: (string | null)[], baru: (string | null)[]): string[] {
  return [...new Set(lama.filter((u): u is string => u !== null && !baru.includes(u)))];
}

export async function buatBanner(db: Db, data: DataBanner & GambarBanner, olehUserId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [b] = await tx.insert(banner).values(data).returning({ id: banner.id });
    await catat(tx, olehUserId, "banner.buat", b.id, { judul: data.judul, mulai: data.mulai, selesai: data.selesai });
    return b.id;
  });
}

/** Gambar yang tidak dikirim berarti tidak diubah. Mengembalikan URL gambar lama yang perlu dihapus. */
export async function ubahBanner(
  db: Db,
  id: string,
  data: DataBanner & Partial<GambarBanner>,
  olehUserId: string,
): Promise<{ ok: true; gambarLama: string[] } | { ok: false }> {
  return db.transaction(async (tx) => {
    const [lama] = await tx
      .select({ gambarPotret: banner.gambarPotret, gambarLanskap: banner.gambarLanskap })
      .from(banner)
      .where(eq(banner.id, id))
      .for("update");
    if (!lama) return { ok: false as const };
    await tx.update(banner).set(data).where(eq(banner.id, id));
    await catat(tx, olehUserId, "banner.ubah", id, {
      judul: data.judul,
      mulai: data.mulai,
      selesai: data.selesai,
      gambarDiganti: Boolean(data.gambarPotret || data.gambarLanskap),
    });
    const baru = [data.gambarPotret ?? lama.gambarPotret, data.gambarLanskap ?? lama.gambarLanskap];
    return { ok: true as const, gambarLama: gambarTerbuang([lama.gambarPotret, lama.gambarLanskap], baru) };
  });
}

export async function aturAktifBanner(db: Db, id: string, aktif: boolean, olehUserId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const hasil = await tx.update(banner).set({ aktif }).where(eq(banner.id, id)).returning({ id: banner.id });
    if (hasil.length === 0) return false;
    await catat(tx, olehUserId, aktif ? "banner.nyalakan" : "banner.matikan", id, null);
    return true;
  });
}

/** Mengembalikan URL gambar yang perlu dihapus, atau false kalau banner tidak ada. */
export async function hapusBanner(db: Db, id: string, olehUserId: string): Promise<{ gambar: string[] } | false> {
  return db.transaction(async (tx) => {
    const [b] = await tx
      .delete(banner)
      .where(eq(banner.id, id))
      .returning({ judul: banner.judul, gambarPotret: banner.gambarPotret, gambarLanskap: banner.gambarLanskap });
    if (!b) return false;
    await catat(tx, olehUserId, "banner.hapus", id, { judul: b.judul });
    return { gambar: gambarTerbuang([b.gambarPotret, b.gambarLanskap], []) };
  });
}
