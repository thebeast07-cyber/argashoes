// Laporan fee bulanan: bulan kalender WIB, ringkasan semua bulan, dan pencocokan dengan pembayaran. Fungsi murni.
// Aturan siapa yang kena fee ada di fee.ts (orderKenaFee, periodeFee, rekapFeeBulanan).

import { periodeFee } from "./fee";

const WIB_MS = 7 * 60 * 60_000;
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function isBulan(teks: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(teks);
}

/** "2026-10" → "Oktober 2026". */
export function labelBulan(bulan: string): string {
  const [t, b] = bulan.split("-").map(Number);
  return `${NAMA_BULAN[b - 1]} ${t}`;
}

/** Awal (inklusif) dan akhir (eksklusif) satu bulan WIB, dalam UTC, untuk query `dikirim_pada`. */
export function rentangBulanWib(bulan: string): { mulai: Date; akhir: Date } {
  const [t, b] = bulan.split("-").map(Number);
  return { mulai: new Date(Date.UTC(t, b - 1, 1) - WIB_MS), akhir: new Date(Date.UTC(t, b, 1) - WIB_MS) };
}

export function geserBulan(bulan: string, n: number): string {
  const [t, b] = bulan.split("-").map(Number);
  const d = new Date(Date.UTC(t, b - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type OrderFeeRingkas = { dikirimPada: Date; pasang: number; fee: number };
export type RingkasBulan = { bulan: string; order: number; pasang: number; fee: number };

/** Semua bulan yang punya order kena fee, terbaru dulu. Bulan berjalan selalu ikut walau masih nol. */
export function ringkasPerBulan(orders: readonly OrderFeeRingkas[], sekarang: Date): RingkasBulan[] {
  const per = new Map<string, RingkasBulan>();
  per.set(periodeFee(sekarang), { bulan: periodeFee(sekarang), order: 0, pasang: 0, fee: 0 });
  for (const o of orders) {
    const bulan = periodeFee(o.dikirimPada);
    const r = per.get(bulan) ?? { bulan, order: 0, pasang: 0, fee: 0 };
    per.set(bulan, { bulan, order: r.order + 1, pasang: r.pasang + o.pasang, fee: r.fee + o.fee });
  }
  return [...per.values()].sort((a, b) => b.bulan.localeCompare(a.bulan));
}

export type StatusBayar =
  | { jenis: "belum" }
  | { jenis: "lunas"; dibayarPada: Date }
  /** Ditandai dibayar, tapi rekap sekarang berbeda (mis. ditandai sebelum bulan selesai). */
  | { jenis: "selisih"; dibayarPada: Date; dibayar: number; selisih: number };

export function statusBayar(pembayaran: { total: number; dibayarPada: Date | null } | null, totalSekarang: number): StatusBayar {
  if (!pembayaran?.dibayarPada) return { jenis: "belum" };
  if (pembayaran.total === totalSekarang) return { jenis: "lunas", dibayarPada: pembayaran.dibayarPada };
  return { jenis: "selisih", dibayarPada: pembayaran.dibayarPada, dibayar: pembayaran.total, selisih: totalSekarang - pembayaran.total };
}

export const KOLOM_EKSPOR_FEE = ["kode", "dikirim_pada_wib", "pembeli", "nomor_resi", "status", "pasang", "fee", "total_order"] as const;

/** Tanggal hari ini menurut WIB, format input date ("2026-10-17"). */
export function hariIniWib(sekarang: Date): string {
  return new Date(sekarang.getTime() + WIB_MS).toISOString().slice(0, 10);
}

/** "2026-10-05" dari input date → pukul 12.00 WIB hari itu, supaya tidak bergeser hari di zona waktu mana pun. */
export function tanggalWib(teks: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(teks);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 5));
  return d.getUTCDate() === Number(m[3]) ? d : null;
}

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });

/** "5 Oktober 2026". */
export function formatTanggalWib(d: Date): string {
  return FORMAT_TANGGAL.format(d);
}
