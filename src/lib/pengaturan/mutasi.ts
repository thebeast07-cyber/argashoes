import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { auditLog, feeTiers, products, settings, usulan } from "@/db/schema";
import type { FeeTier } from "@/lib/domain/fee";
import type { Rekening } from "@/lib/domain/pengaturan";
import type { AmbangStok } from "@/lib/domain/stok";
import { kunciUsulan, samaNilai, usulanBasi, type JenisUsulan, type NilaiUsulan } from "@/lib/domain/usulan";
import { getNomorWa, getRekening, getTiers, KUNCI_SETTING, nilaiSekarang } from "./data";
import { getAmbangStok } from "@/lib/produk/data";

// Semua perubahan pengaturan ditulis bersama audit log-nya dalam satu transaksi.

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Audit = { aksi: string; entitas: string; entitasId?: string; data?: unknown };

async function catat(tx: Tx, olehUserId: string, entri: Audit | Audit[]) {
  const daftar = Array.isArray(entri) ? entri : [entri];
  await tx.insert(auditLog).values(daftar.map((e) => ({ olehUserId, ...e, data: e.data ?? null })));
}

// Tier ditulis ulang seluruhnya (hapus lalu isi); kunci ini mencegah dua penulisan saling menimpa.
async function kunciTier(tx: Tx) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('fee_tiers'))`);
}

async function simpanSetting(tx: Tx, kunci: string, nilai: unknown) {
  if (nilai === null) {
    await tx.delete(settings).where(eq(settings.kunci, kunci));
    return;
  }
  await tx.insert(settings).values({ kunci, nilai }).onConflictDoUpdate({ target: settings.kunci, set: { nilai } });
}

async function terapkan<J extends JenisUsulan>(tx: Tx, jenis: J, productId: string | null, nilai: NilaiUsulan[J]) {
  if (jenis === "tier") {
    await tx.delete(feeTiers);
    const tiers = nilai as FeeTier[];
    if (tiers.length > 0) await tx.insert(feeTiers).values(tiers);
  } else if (jenis === "rekening") {
    await simpanSetting(tx, KUNCI_SETTING.rekening, nilai);
  } else {
    await tx.update(products).set({ feePerPasang: nilai as number | null }).where(eq(products.id, productId!));
  }
}

/** Audit untuk perubahan nilainya sendiri, sama bentuknya entah diubah langsung atau lewat usulan. */
function auditPerubahan(jenis: JenisUsulan, productId: string | null, dari: unknown, ke: unknown, usulanId?: string): Audit {
  const tambahan = usulanId ? { usulanId } : {};
  if (jenis === "tier") return { aksi: "fee_tier.diubah", entitas: "fee_tiers", data: { dari, ke, ...tambahan } };
  if (jenis === "rekening") return { aksi: "rekening.diubah", entitas: "settings", entitasId: KUNCI_SETTING.rekening, data: { dari, ke, ...tambahan } };
  return { aksi: "produk.diubah", entitas: "products", entitasId: productId!, data: { feePerPasang: { dari, ke }, ...tambahan } };
}

// --- Diubah langsung (pemilik, atau pengaturan toko oleh siapa pun yang berizin) --------------

export async function simpanTier(db: Db, tiers: FeeTier[], olehUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await kunciTier(tx);
    const lama = await getTiers(tx);
    if (samaNilai("tier", lama, tiers)) return;
    await terapkan(tx, "tier", null, tiers);
    await catat(tx, olehUserId, auditPerubahan("tier", null, lama, tiers));
  });
}

export async function simpanRekening(db: Db, rekening: Rekening, olehUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const lama = await getRekening(tx);
    if (samaNilai("rekening", lama, rekening)) return;
    await terapkan(tx, "rekening", null, rekening);
    await catat(tx, olehUserId, auditPerubahan("rekening", null, lama, rekening));
  });
}

export async function simpanPengaturanToko(
  db: Db,
  baru: { nomorWa: string | null; ambang: AmbangStok },
  olehUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [nomorWa, ambang] = await Promise.all([getNomorWa(tx), getAmbangStok(tx)]);
    const berubah: Record<string, { dari: unknown; ke: unknown }> = {};
    if (nomorWa !== baru.nomorWa) {
      await simpanSetting(tx, KUNCI_SETTING.nomorWa, baru.nomorWa && { nomor: baru.nomorWa });
      berubah.nomorWa = { dari: nomorWa, ke: baru.nomorWa };
    }
    if (ambang.readyMin !== baru.ambang.readyMin) {
      await simpanSetting(tx, KUNCI_SETTING.ambangStok, baru.ambang);
      berubah.ambangStok = { dari: ambang.readyMin, ke: baru.ambang.readyMin };
    }
    if (Object.keys(berubah).length > 0) {
      await catat(tx, olehUserId, { aksi: "pengaturan.diubah", entitas: "settings", data: berubah });
    }
  });
}

// --- Usulan ----------------------------------------------------------------------

/** Nama produk ikut dicatat supaya riwayat tetap terbaca walau nama produknya diganti nanti. */
async function namaProduk(tx: Tx, productId: string | null): Promise<{ produk?: string }> {
  if (!productId) return {};
  const [p] = await tx.select({ nama: products.nama, brand: products.brand }).from(products).where(eq(products.id, productId));
  return p ? { produk: `${p.brand} ${p.nama}` } : {};
}

export type HasilAjukan = { status: "ok"; id: string } | { status: "sudah_ada" | "tidak_berubah" | "tidak_ada" };

export async function ajukanUsulan<J extends JenisUsulan>(
  db: Db,
  input: { jenis: J; productId?: string; isi: NilaiUsulan[J]; alasan: string | null },
  olehUserId: string,
): Promise<HasilAjukan> {
  const kunci = kunciUsulan(input.jenis, input.productId);
  try {
    return await db.transaction(async (tx) => {
      const dasar = await nilaiSekarang(tx, input.jenis, input.productId);
      if (dasar === undefined) return { status: "tidak_ada" as const };
      if (samaNilai(input.jenis, dasar, input.isi)) return { status: "tidak_berubah" as const };

      const [u] = await tx
        .insert(usulan)
        .values({
          jenis: input.jenis,
          kunci,
          productId: input.productId ?? null,
          isi: { nilai: input.isi },
          dasar: { nilai: dasar },
          alasan: input.alasan,
          diajukanOleh: olehUserId,
        })
        .returning({ id: usulan.id });
      await catat(tx, olehUserId, {
        aksi: "usulan.diajukan",
        entitas: "usulan",
        entitasId: u.id,
        data: { jenis: input.jenis, productId: input.productId ?? null, ...(await namaProduk(tx, input.productId ?? null)), dari: dasar, ke: input.isi },
      });
      return { status: "ok" as const, id: u.id };
    });
  } catch (e) {
    if (isUniqueViolation(e, "usulan_satu_menunggu_uq")) return { status: "sudah_ada" };
    throw e;
  }
}

export type HasilPutuskan = "ok" | "tidak_ada" | "sudah_diputuskan" | "basi";

/** Setujui menerapkan isi usulan; usulan basi tidak diterapkan dan tetap menunggu sampai ditolak. */
export async function putuskanUsulan(
  db: Db,
  id: string,
  keputusan: { setuju: boolean; catatan: string | null },
  olehUserId: string,
): Promise<HasilPutuskan> {
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(usulan).where(eq(usulan.id, id)).for("update");
    if (!u) return "tidak_ada";
    if (u.status !== "menunggu") return "sudah_diputuskan";

    if (keputusan.setuju) {
      if (u.jenis === "tier") await kunciTier(tx);
      const sekarang = await nilaiSekarang(tx, u.jenis, u.productId);
      const dasar = u.dasar.nilai as NilaiUsulan[typeof u.jenis];
      if (sekarang === undefined || usulanBasi(u.jenis, dasar, sekarang)) return "basi";
      await terapkan(tx, u.jenis, u.productId, u.isi.nilai as NilaiUsulan[typeof u.jenis]);
      await catat(tx, olehUserId, auditPerubahan(u.jenis, u.productId, sekarang, u.isi.nilai, u.id));
    }

    const status = keputusan.setuju ? "disetujui" : "ditolak";
    await tx
      .update(usulan)
      .set({ status, diputuskanOleh: olehUserId, diputuskanPada: new Date(), catatanKeputusan: keputusan.catatan })
      .where(eq(usulan.id, id));
    await catat(tx, olehUserId, {
      aksi: `usulan.${status}`,
      entitas: "usulan",
      entitasId: id,
      data: { jenis: u.jenis, ...(await namaProduk(tx, u.productId)), catatan: keputusan.catatan },
    });
    return "ok";
  });
}

export type HasilBatal = "ok" | "tidak_ada" | "sudah_diputuskan" | "bukan_pengaju";

/** Hanya pengaju yang bisa menarik usulannya sendiri, dan hanya selama masih menunggu. */
export async function batalkanUsulan(db: Db, id: string, olehUserId: string): Promise<HasilBatal> {
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(usulan).where(eq(usulan.id, id)).for("update");
    if (!u) return "tidak_ada";
    if (u.diajukanOleh !== olehUserId) return "bukan_pengaju";
    if (u.status !== "menunggu") return "sudah_diputuskan";
    await tx
      .update(usulan)
      .set({ status: "dibatalkan", diputuskanOleh: olehUserId, diputuskanPada: new Date() })
      .where(eq(usulan.id, id));
    await catat(tx, olehUserId, { aksi: "usulan.dibatalkan", entitas: "usulan", entitasId: id, data: { jenis: u.jenis, ...(await namaProduk(tx, u.productId)) } });
    return "ok";
  });
}
