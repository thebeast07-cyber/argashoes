import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { pesanAdmin, users } from "@/db/schema";
import { BATAS_PESAN_DIBUKA, type AkunPesan } from "@/lib/domain/pesan-admin";

// Pesan antar akun admin (lihat domain/pesan-admin.ts). Pesan bukan data bisnis, jadi tidak dicatat di audit_log.

export async function daftarAkunPesan(db: Db): Promise<AkunPesan[]> {
  return db.select({ id: users.id, nama: users.nama, peran: users.peran }).from(users).where(eq(users.aktif, true)).orderBy(asc(users.nama));
}

/** Penerima harus akun aktif dan bukan pengirim sendiri. */
export async function kirimPesan(db: Db, dariId: string, keId: string, isi: string): Promise<"ok" | "tidak_ada"> {
  if (dariId === keId) return "tidak_ada";
  const [ke] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, keId), eq(users.aktif, true)));
  if (!ke) return "tidak_ada";
  await db.insert(pesanAdmin).values({ dariUserId: dariId, keUserId: keId, isi });
  return "ok";
}

export async function jumlahPesanBaru(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(pesanAdmin)
    .where(and(eq(pesanAdmin.keUserId, userId), isNull(pesanAdmin.dibaca)));
  return row?.n ?? 0;
}

export type PesanMasuk = { id: string; dariId: string; dariNama: string; isi: string; dibuat: Date };

/** Pesan yang belum dibaca, terlama dulu, lalu ditandai dibaca. Dipanggil saat panel Asisten dibuka. */
export async function bukaPesanBaru(db: Db, userId: string, sekarang = new Date()): Promise<PesanMasuk[]> {
  return db.transaction(async (tx) => {
    const baris = await tx
      .select({ id: pesanAdmin.id, dariId: pesanAdmin.dariUserId, dariNama: users.nama, isi: pesanAdmin.isi, dibuat: pesanAdmin.dibuat })
      .from(pesanAdmin)
      .innerJoin(users, eq(pesanAdmin.dariUserId, users.id))
      .where(and(eq(pesanAdmin.keUserId, userId), isNull(pesanAdmin.dibaca)))
      .orderBy(asc(pesanAdmin.dibuat))
      .limit(BATAS_PESAN_DIBUKA);
    if (baris.length > 0) {
      await tx
        .update(pesanAdmin)
        .set({ dibaca: sekarang })
        .where(
          inArray(
            pesanAdmin.id,
            baris.map((b) => b.id),
          ),
        );
    }
    return baris;
  });
}
