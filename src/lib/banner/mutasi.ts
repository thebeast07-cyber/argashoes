import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, banner } from "@/db/schema";
import type { DataBanner } from "@/lib/domain/banner";

// Setiap perubahan banner ditulis bersama audit log-nya dalam satu transaksi.
// File gambar lama dihapus pemanggil setelah transaksi selesai (sama seperti foto produk).

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function catat(tx: Tx, olehUserId: string, aksi: string, entitasId: string, data: unknown) {
  await tx.insert(auditLog).values({ olehUserId, aksi, entitas: "banner", entitasId, data });
}

export async function buatBanner(db: Db, data: DataBanner & { gambarUrl: string | null }, olehUserId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [b] = await tx.insert(banner).values(data).returning({ id: banner.id });
    await catat(tx, olehUserId, "banner.buat", b.id, { judul: data.judul, mulai: data.mulai, selesai: data.selesai });
    return b.id;
  });
}

/** `gambarUrl: undefined` berarti gambar tidak diubah. Mengembalikan URL gambar lama yang perlu dihapus, kalau ada. */
export async function ubahBanner(
  db: Db,
  id: string,
  data: DataBanner & { gambarUrl?: string | null },
  olehUserId: string,
): Promise<{ ok: true; gambarLama: string | null } | { ok: false }> {
  return db.transaction(async (tx) => {
    const [lama] = await tx.select({ gambarUrl: banner.gambarUrl }).from(banner).where(eq(banner.id, id)).for("update");
    if (!lama) return { ok: false as const };
    await tx.update(banner).set(data).where(eq(banner.id, id));
    await catat(tx, olehUserId, "banner.ubah", id, { judul: data.judul, mulai: data.mulai, selesai: data.selesai, gambarDiganti: data.gambarUrl !== undefined });
    const gambarLama = data.gambarUrl !== undefined && lama.gambarUrl !== data.gambarUrl ? lama.gambarUrl : null;
    return { ok: true as const, gambarLama };
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
export async function hapusBanner(db: Db, id: string, olehUserId: string): Promise<{ gambarUrl: string | null } | false> {
  return db.transaction(async (tx) => {
    const [b] = await tx.delete(banner).where(eq(banner.id, id)).returning({ judul: banner.judul, gambarUrl: banner.gambarUrl });
    if (!b) return false;
    await catat(tx, olehUserId, "banner.hapus", id, { judul: b.judul });
    return { gambarUrl: b.gambarUrl };
  });
}
