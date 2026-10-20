import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, feeTiers, products, settings, users, usulan } from "@/db/schema";
import type { FeeTier } from "@/lib/domain/fee";
import type { DataKelengkapan } from "@/lib/domain/kelengkapan";
import { isRekening, type Rekening } from "@/lib/domain/pengaturan";
import { kunciUsulan, type JenisUsulan, type NilaiUsulan, type ProdukUntukDampak } from "@/lib/domain/usulan";
import { getAmbangStok } from "@/lib/produk/data";

export const KUNCI_SETTING = { nomorWa: "nomor_wa", rekening: "rekening", ambangStok: "ambang_stok" } as const;

export async function getTiers(db: Db): Promise<FeeTier[]> {
  return db
    .select({ hargaMin: feeTiers.hargaMin, hargaMax: feeTiers.hargaMax, fee: feeTiers.fee })
    .from(feeTiers)
    .orderBy(asc(feeTiers.hargaMin));
}

async function getSetting(db: Db, kunci: string): Promise<unknown> {
  const [row] = await db.select({ nilai: settings.nilai }).from(settings).where(eq(settings.kunci, kunci));
  return row?.nilai ?? null;
}

export async function getNomorWa(db: Db): Promise<string | null> {
  // Disimpan sebagai objek: string angka polos di jsonb terbaca balik sebagai number.
  const nomor = ((await getSetting(db, KUNCI_SETTING.nomorWa)) as { nomor?: unknown } | null)?.nomor;
  return typeof nomor === "string" ? nomor : null;
}

export async function getRekening(db: Db): Promise<Rekening | null> {
  const nilai = await getSetting(db, KUNCI_SETTING.rekening);
  return isRekening(nilai) ? nilai : null;
}

export async function getPengaturan(db: Db) {
  const [tiers, nomorWa, rekening, ambang] = await Promise.all([getTiers(db), getNomorWa(db), getRekening(db), getAmbangStok(db)]);
  return { tiers, nomorWa, rekening, ambang };
}

/** Undefined kalau sasarannya tidak ada (produk tidak ditemukan). */
export async function nilaiSekarang<J extends JenisUsulan>(db: Db, jenis: J, productId?: string | null): Promise<NilaiUsulan[J] | undefined> {
  if (jenis === "tier") return (await getTiers(db)) as NilaiUsulan[J];
  if (jenis === "rekening") return (await getRekening(db)) as NilaiUsulan[J];
  if (!productId) return undefined;
  const [p] = await db.select({ fee: products.feePerPasang }).from(products).where(eq(products.id, productId));
  return p ? (p.fee as NilaiUsulan[J]) : undefined;
}

/** Produk aktif yang ikut dihitung saat menilai dampak usulan tier. */
export async function produkUntukDampak(db: Db): Promise<ProdukUntukDampak[]> {
  return db
    .select({ id: products.id, nama: products.nama, brand: products.brand, harga: products.harga, feePerPasang: products.feePerPasang })
    .from(products)
    .where(eq(products.aktif, true));
}

// --- Usulan --------------------------------------------------------------------

const pengaju = alias(users, "pengaju");
const pemutus = alias(users, "pemutus");

const kolomUsulan = {
  id: usulan.id,
  jenis: usulan.jenis,
  status: usulan.status,
  productId: usulan.productId,
  isi: usulan.isi,
  dasar: usulan.dasar,
  alasan: usulan.alasan,
  diajukanOlehId: usulan.diajukanOleh,
  diajukanOleh: pengaju.nama,
  diajukanPada: usulan.diajukanPada,
  diputuskanOleh: pemutus.nama,
  diputuskanPada: usulan.diputuskanPada,
  catatanKeputusan: usulan.catatanKeputusan,
  produkNama: products.nama,
  produkBrand: products.brand,
  produkHarga: products.harga,
};

function queryUsulan(db: Db) {
  return db
    .select(kolomUsulan)
    .from(usulan)
    .innerJoin(pengaju, eq(pengaju.id, usulan.diajukanOleh))
    .leftJoin(pemutus, eq(pemutus.id, usulan.diputuskanOleh))
    .leftJoin(products, eq(products.id, usulan.productId));
}

export async function ambilUsulan(db: Db, id: string) {
  const [row] = await queryUsulan(db).where(eq(usulan.id, id));
  return row ?? null;
}

export type UsulanLengkap = NonNullable<Awaited<ReturnType<typeof ambilUsulan>>>;

/** Yang menunggu dulu (paling lama di atas), lalu riwayat terbaru. */
export async function daftarUsulan(db: Db, opsi: { batasRiwayat: number }) {
  const [menunggu, riwayat] = await Promise.all([
    queryUsulan(db).where(eq(usulan.status, "menunggu")).orderBy(asc(usulan.diajukanPada)),
    queryUsulan(db)
      .where(sql`${usulan.status} <> 'menunggu'`)
      .orderBy(desc(usulan.diputuskanPada))
      .limit(opsi.batasRiwayat),
  ]);
  return { menunggu, riwayat };
}

export async function jumlahUsulanMenunggu(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(usulan).where(eq(usulan.status, "menunggu"));
  return row?.n ?? 0;
}

export async function usulanMenungguUntuk(db: Db, kunci: string): Promise<{ id: string; diajukanOlehId: string } | null> {
  const [row] = await db
    .select({ id: usulan.id, diajukanOlehId: usulan.diajukanOleh })
    .from(usulan)
    .where(and(eq(usulan.kunci, kunci), eq(usulan.status, "menunggu")));
  return row ?? null;
}

// --- Riwayat perubahan yang bisa dilihat dua pihak -----------------------------------

const AKSI_RIWAYAT = [
  "fee_tier.diubah",
  "rekening.diubah",
  "pengaturan.diubah",
  "usulan.diajukan",
  "usulan.disetujui",
  "usulan.ditolak",
  "usulan.dibatalkan",
];

/** Perubahan fee, rekening, dan pengaturan toko, termasuk fee khusus yang diubah dari form produk. */
export async function riwayatPengaturan(db: Db, batas: number) {
  return db
    .select({
      id: auditLog.id,
      aksi: auditLog.aksi,
      entitasId: auditLog.entitasId,
      data: auditLog.data,
      waktu: auditLog.waktu,
      oleh: users.nama,
      produkNama: products.nama,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.olehUserId))
    .leftJoin(products, and(eq(auditLog.entitas, "products"), eq(sql`${products.id}::text`, auditLog.entitasId)))
    .where(
      or(
        inArray(auditLog.aksi, AKSI_RIWAYAT),
        and(eq(auditLog.aksi, "produk.diubah"), sql`jsonb_exists(${auditLog.data}, 'feePerPasang')`),
      ),
    )
    .orderBy(desc(auditLog.waktu))
    .limit(batas);
}

// --- Kotak "Belum lengkap" di beranda ------------------------------------------------

const CONTOH_TANPA_FOTO = 5;

export async function dataKelengkapan(db: Db): Promise<DataKelengkapan> {
  const tanpaFoto = and(eq(products.aktif, true), sql`jsonb_array_length(${products.foto}) = 0`);
  const [nomorWa, rekening, menunggu, [tier], [jumlah], contoh] = await Promise.all([
    getNomorWa(db),
    getRekening(db),
    usulanMenungguUntuk(db, kunciUsulan("rekening")),
    db.select({ n: count() }).from(feeTiers),
    db.select({ n: count() }).from(products).where(tanpaFoto),
    db
      .select({ id: products.id, brand: products.brand, nama: products.nama })
      .from(products)
      .where(tanpaFoto)
      .orderBy(desc(products.dibuat))
      .limit(CONTOH_TANPA_FOTO),
  ]);
  return {
    adaNomorWa: Boolean(nomorWa),
    adaRekening: Boolean(rekening),
    rekeningMenunggu: Boolean(menunggu),
    adaTier: (tier?.n ?? 0) > 0,
    modelTanpaFoto: { total: jumlah?.n ?? 0, contoh: contoh.map((m) => ({ id: m.id, nama: `${m.brand} ${m.nama}` })) },
  };
}
