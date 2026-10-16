// Aturan fee per pasang (PRD: "Model bisnis dan fee", "Status order dan aturan fee").
// Fungsi murni, tanpa akses database. Semua nominal dalam rupiah (integer).

import type { StatusOrder } from "./order-status";

export const FEE_MIN = 50_000;
export const FEE_MAX = 100_000;

export const STATUS_KENA_FEE: readonly StatusOrder[] = ["dikirim", "selesai"];

/** Rentang harga: hargaMin inklusif, hargaMax eksklusif (null = tanpa batas atas). */
export type FeeTier = {
  hargaMin: number;
  hargaMax: number | null;
  fee: number;
};

export function feeDalamRentang(fee: number): boolean {
  return Number.isInteger(fee) && fee >= FEE_MIN && fee <= FEE_MAX;
}

/** Cek daftar tier: nominal valid, rentang masuk akal, tidak saling tumpang tindih. */
export function validasiTier(tiers: readonly FeeTier[]): string[] {
  const error: string[] = [];
  tiers.forEach((t, i) => {
    const no = i + 1;
    if (!feeDalamRentang(t.fee)) {
      error.push(`Tier ${no}: fee harus antara Rp ${FEE_MIN} dan Rp ${FEE_MAX}.`);
    }
    if (!Number.isInteger(t.hargaMin) || t.hargaMin < 0) {
      error.push(`Tier ${no}: harga minimum tidak valid.`);
    }
    if (t.hargaMax !== null && (!Number.isInteger(t.hargaMax) || t.hargaMax <= t.hargaMin)) {
      error.push(`Tier ${no}: harga maksimum harus lebih besar dari harga minimum.`);
    }
  });

  const urut = [...tiers].sort((a, b) => a.hargaMin - b.hargaMin);
  for (let i = 1; i < urut.length; i++) {
    const sebelum = urut[i - 1];
    if (sebelum.hargaMax === null || sebelum.hargaMax > urut[i].hargaMin) {
      error.push(`Rentang harga mulai ${sebelum.hargaMin} dan ${urut[i].hargaMin} tumpang tindih.`);
    }
  }
  return error;
}

export function cariTier(harga: number, tiers: readonly FeeTier[]): FeeTier | null {
  return tiers.find((t) => harga >= t.hargaMin && (t.hargaMax === null || harga < t.hargaMax)) ?? null;
}

/**
 * Fee per pasang untuk satu produk: fee khusus produk menimpa tier.
 * Null kalau tidak ada fee khusus dan tidak ada tier yang cocok; pemanggil yang memutuskan.
 */
export function tentukanFeePerPasang(input: {
  harga: number;
  feeProduk: number | null;
  tiers: readonly FeeTier[];
}): number | null {
  if (input.feeProduk !== null) return input.feeProduk;
  return cariTier(input.harga, input.tiers)?.fee ?? null;
}

export type ItemFee = { feePerPasang: number; jumlah: number };

export function jumlahPasang(items: readonly ItemFee[]): number {
  return items.reduce((n, item) => n + item.jumlah, 0);
}

/** Fee satu order = jumlah fee tiap pasang (fee disalin ke item saat order dibuat). */
export function feeItems(items: readonly ItemFee[]): number {
  return items.reduce((total, item) => total + item.feePerPasang * item.jumlah, 0);
}

/** Order kena fee hanya kalau berstatus Dikirim/Selesai dan nomor resinya terisi. */
export function orderKenaFee(order: { status: StatusOrder; resiNomor: string | null }): boolean {
  return STATUS_KENA_FEE.includes(order.status) && Boolean(order.resiNomor?.trim());
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Periode fee (YYYY-MM) = bulan kalender WIB dari waktu status menjadi Dikirim. */
export function periodeFee(dikirimPada: Date): string {
  const wib = new Date(dikirimPada.getTime() + WIB_OFFSET_MS);
  const bulan = String(wib.getUTCMonth() + 1).padStart(2, "0");
  return `${wib.getUTCFullYear()}-${bulan}`;
}

export type OrderUntukRekap = {
  id: string;
  kode: string;
  status: StatusOrder;
  resiNomor: string | null;
  dikirimPada: Date | null;
  items: readonly ItemFee[];
};

export type RekapFee = {
  bulan: string;
  jumlahPasang: number;
  totalFee: number;
  orders: { id: string; kode: string; pasang: number; fee: number }[];
};

/** Rekap fee satu bulan (YYYY-MM) dari daftar order. */
export function rekapFeeBulanan(orders: readonly OrderUntukRekap[], bulan: string): RekapFee {
  const pendukung = orders
    .filter((o) => orderKenaFee(o) && o.dikirimPada !== null && periodeFee(o.dikirimPada) === bulan)
    .map((o) => ({ id: o.id, kode: o.kode, pasang: jumlahPasang(o.items), fee: feeItems(o.items) }))
    .sort((a, b) => a.kode.localeCompare(b.kode));

  return {
    bulan,
    jumlahPasang: pendukung.reduce((n, o) => n + o.pasang, 0),
    totalFee: pendukung.reduce((n, o) => n + o.fee, 0),
    orders: pendukung,
  };
}
