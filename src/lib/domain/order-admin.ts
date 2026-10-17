// Aturan tampilan order di admin dan notifikasi order baru. Fungsi murni.

import { formatRupiah } from "./produk";
import type { StatusOrder } from "./order-status";
import { formatWaktuWib } from "./waktu";

/** Lead yang belum diproses selama ini ditandai di daftar order dan beranda admin (keputusan pemilik: 24 jam). */
export const BATAS_LEAD_JAM = 24;

export const CATATAN_INTERNAL_MAKS = 1000;

export function leadTerbengkalai(order: { status: StatusOrder; dibuat: Date }, sekarang: Date, jam = BATAS_LEAD_JAM): boolean {
  return order.status === "lead" && sekarang.getTime() - order.dibuat.getTime() >= jam * 60 * 60_000;
}

const WIB_MS = 7 * 60 * 60_000;

/** Pukul 00.00 WIB hari ini, dalam UTC. "Order hari ini" dihitung dalam WIB (CLAUDE.md). */
export function awalHariWib(sekarang: Date): Date {
  const wib = new Date(sekarang.getTime() + WIB_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_MS);
}

/** "2 jam lalu", "3 hari lalu": cukup untuk menilai seberapa lama Lead dibiarkan. */
export function umur(dari: Date, sekarang: Date): string {
  const menit = Math.max(0, Math.floor((sekarang.getTime() - dari.getTime()) / 60_000));
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

export type OrderUntukEmail = {
  kode: string;
  nama: string;
  noWa: string;
  alamat: string;
  catatan: string | null;
  total: number;
  dibuat: Date;
  items: readonly { namaProduk: string; size: string; jumlah: number; hargaSatuan: number }[];
};

/** Email ke pemilik setiap ada order baru, supaya Lead diketahui tanpa harus membuka admin. */
export function isiEmailOrderBaru(o: OrderUntukEmail, linkAdmin: string): { subjek: string; teks: string } {
  const pasang = o.items.reduce((n, i) => n + i.jumlah, 0);
  return {
    subjek: `Order baru ${o.kode}: ${pasang} pasang, ${formatRupiah(o.total)}`,
    teks: [
      `Order baru masuk lewat web, status Lead.`,
      "",
      `Kode: ${o.kode}`,
      `Waktu: ${formatWaktuWib(o.dibuat)}`,
      "",
      ...o.items.map((i) => `${i.jumlah}x ${i.namaProduk}, size ${i.size}, ${formatRupiah(i.hargaSatuan)}`),
      `Subtotal: ${formatRupiah(o.total)} (belum ongkir)`,
      "",
      `Pembeli: ${o.nama}`,
      `WhatsApp: +${o.noWa}`,
      `Alamat: ${o.alamat}`,
      ...(o.catatan ? [`Catatan: ${o.catatan}`] : []),
      "",
      `Buka di admin: ${linkAdmin}`,
    ].join("\n"),
  };
}

export const KOLOM_EKSPOR_PELANGGAN = ["nama", "no_wa", "alamat_terakhir", "jumlah_order", "order_dikirim", "order_terakhir", "persetujuan_pada"] as const;
