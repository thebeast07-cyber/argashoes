import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, orderEvents, orderItems, orders, users } from "@/db/schema";
import { BATAS_LEAD_JAM } from "@/lib/domain/order-admin";
import { STATUS_ORDER, type StatusOrder } from "@/lib/domain/order-status";

// Query order dan pelanggan untuk admin.

export const PER_HALAMAN_ORDER = 30;

function polaCari(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Cari dengan kode, nama, atau nomor WA. Nomor bisa diketik "0812..." atau "62812...". */
function syaratCari(q: string) {
  const pola = polaCari(q);
  const angka = q.replace(/\D/g, "").replace(/^0/, "62");
  return or(ilike(orders.kode, pola), ilike(orders.nama, pola), ...(angka.length >= 4 ? [ilike(orders.noWa, `%${angka}%`)] : []));
}

export async function daftarOrder(db: Db, filter: { status?: StatusOrder; q?: string; halaman: number }) {
  const syarat = and(filter.status ? eq(orders.status, filter.status) : undefined, filter.q ? syaratCari(filter.q) : undefined);
  const [[{ total }], baris] = await Promise.all([
    db.select({ total: count() }).from(orders).where(syarat),
    db
      .select({ id: orders.id, kode: orders.kode, nama: orders.nama, status: orders.status, total: orders.total, dibuat: orders.dibuat, waClickedAt: orders.waClickedAt })
      .from(orders)
      .where(syarat)
      .orderBy(desc(orders.dibuat))
      .limit(PER_HALAMAN_ORDER)
      .offset((filter.halaman - 1) * PER_HALAMAN_ORDER),
  ]);
  const ids = baris.map((o) => o.id);
  const items = ids.length
    ? await db.select({ orderId: orderItems.orderId, namaProduk: orderItems.namaProduk, size: orderItems.size, jumlah: orderItems.jumlah }).from(orderItems).where(inArray(orderItems.orderId, ids))
    : [];
  return { total, items: baris.map((o) => ({ ...o, barang: items.filter((i) => i.orderId === o.id) })) };
}

/** Jumlah per status untuk tab filter (dengan pencarian yang sama, tanpa filter status). */
export async function hitungPerStatus(db: Db, q?: string): Promise<Record<StatusOrder, number>> {
  const rows = await db.select({ status: orders.status, n: count() }).from(orders).where(q ? syaratCari(q) : undefined).groupBy(orders.status);
  const hasil = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<StatusOrder, number>;
  for (const r of rows) hasil[r.status] = r.n;
  return hasil;
}

export async function ambilOrder(db: Db, kode: string) {
  const [o] = await db.select().from(orders).where(eq(orders.kode, kode));
  if (!o) return null;
  const [items, riwayat] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db
      .select({ dari: orderEvents.dariStatus, ke: orderEvents.keStatus, waktu: orderEvents.waktu, catatan: orderEvents.catatan, oleh: users.nama })
      .from(orderEvents)
      .leftJoin(users, eq(orderEvents.olehUserId, users.id))
      .where(eq(orderEvents.orderId, o.id))
      .orderBy(orderEvents.waktu),
  ]);
  return { ...o, items, riwayat };
}

export async function ringkasanBerandaOrder(db: Db, awalHari: Date, sekarang: Date) {
  const batas = new Date(sekarang.getTime() - BATAS_LEAD_JAM * 60 * 60_000);
  const [[{ hariIni }], terbengkalai] = await Promise.all([
    db.select({ hariIni: count() }).from(orders).where(gte(orders.dibuat, awalHari)),
    db
      .select({ kode: orders.kode, nama: orders.nama, total: orders.total, dibuat: orders.dibuat })
      .from(orders)
      .where(and(eq(orders.status, "lead"), lt(orders.dibuat, batas)))
      .orderBy(orders.dibuat)
      .limit(20),
  ]);
  return { hariIni, terbengkalai };
}

export async function emailPemilik(db: Db): Promise<string[]> {
  const rows = await db.select({ email: users.email }).from(users).where(and(eq(users.peran, "pemilik"), eq(users.aktif, true)));
  return rows.map((r) => r.email);
}

// --- Pelanggan -------------------------------------------------------------------

const statistikPelanggan = {
  jumlahOrder: sql<number>`count(${orders.id})::int`,
  orderDikirim: sql<number>`count(${orders.id}) filter (where ${orders.status} in ('dikirim', 'selesai'))::int`,
  orderTerakhir: sql<Date | null>`max(${orders.dibuat})`,
};

export async function daftarPelanggan(db: Db, filter: { q?: string; halaman: number }) {
  const q = filter.q?.trim();
  const angka = q?.replace(/\D/g, "").replace(/^0/, "62") ?? "";
  const syarat = q ? or(ilike(customers.nama, polaCari(q)), ...(angka.length >= 4 ? [ilike(customers.noWa, `%${angka}%`)] : [])) : undefined;
  const [[{ total }], baris] = await Promise.all([
    db.select({ total: count() }).from(customers).where(syarat),
    db
      .select({ id: customers.id, nama: customers.nama, noWa: customers.noWa, ...statistikPelanggan })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(syarat)
      .groupBy(customers.id)
      .orderBy(sql`max(${orders.dibuat}) desc nulls last`)
      .limit(PER_HALAMAN_ORDER)
      .offset((filter.halaman - 1) * PER_HALAMAN_ORDER),
  ]);
  return { total, items: baris };
}

export async function ambilPelanggan(db: Db, id: string) {
  const [p] = await db.select().from(customers).where(eq(customers.id, id));
  if (!p) return null;
  const riwayat = await db
    .select({ kode: orders.kode, status: orders.status, total: orders.total, dibuat: orders.dibuat })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.dibuat));
  return { ...p, riwayat };
}

export async function semuaPelangganUntukEkspor(db: Db) {
  return db
    .select({ nama: customers.nama, noWa: customers.noWa, alamatTerakhir: customers.alamatTerakhir, persetujuanPada: customers.persetujuanPada, ...statistikPelanggan })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(customers.nama);
}
