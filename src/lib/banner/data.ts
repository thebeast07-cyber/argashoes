import { and, desc, eq, gt, lte } from "drizzle-orm";
import type { Db } from "@/db";
import { banner } from "@/db/schema";
import { bannerTayang, type Banner } from "@/lib/domain/banner";

const kolom = {
  id: banner.id,
  judul: banner.judul,
  keterangan: banner.keterangan,
  gambarUrl: banner.gambarUrl,
  tautan: banner.tautan,
  teksTombol: banner.teksTombol,
  mulai: banner.mulai,
  selesai: banner.selesai,
  aktif: banner.aktif,
};

export async function semuaBanner(db: Db): Promise<Banner[]> {
  return db.select(kolom).from(banner).orderBy(desc(banner.mulai));
}

export async function ambilBanner(db: Db, id: string): Promise<Banner | null> {
  const [b] = await db.select(kolom).from(banner).where(eq(banner.id, id));
  return b ?? null;
}

/** SQL hanya menyaring kasar; pilihan banner yang tampil tetap lewat bannerTayang. */
export async function bannerBeranda(db: Db, sekarang = new Date()): Promise<Banner | null> {
  const calon = await db
    .select(kolom)
    .from(banner)
    .where(and(eq(banner.aktif, true), lte(banner.mulai, sekarang), gt(banner.selesai, sekarang)));
  return bannerTayang(calon, sekarang);
}
