// Checkout: validasi data pembeli, pemeriksaan ulang item terhadap database, kode order, dan pesan WhatsApp. Fungsi murni.

import { FEE_MIN, tentukanFeePerPasang, type FeeTier } from "./fee";
import { ITEM_MAKS, JUMLAH_MAKS } from "./keranjang";
import { normalisasiNomorWa } from "./pengaturan";
import { formatRupiah } from "./produk";

export const ALAMAT_MIN = 15;
export const CATATAN_MAKS = 500;

export type InputPembeli = { nama: string; wa: string; alamat: string; catatan: string; setuju: boolean };
export type DataPembeli = { nama: string; noWa: string; alamat: string; catatan: string | null };

export function validasiPembeli(input: InputPembeli): { ok: true; data: DataPembeli } | { ok: false; error: Record<string, string> } {
  const error: Record<string, string> = {};
  const nama = input.nama.trim().replace(/\s+/g, " ");
  const noWa = normalisasiNomorWa(input.wa);
  const alamat = input.alamat.trim();
  const catatan = input.catatan.trim();
  if (!nama) error.nama = "Nama penerima wajib diisi.";
  else if (nama.length > 80) error.nama = "Nama terlalu panjang.";
  if (!noWa) error.wa = "Isi nomor WhatsApp Indonesia, contoh 0812 3456 7890.";
  if (alamat.length < ALAMAT_MIN) error.alamat = "Alamat terlalu pendek. Tulis jalan, kecamatan, kota, dan kode pos.";
  else if (alamat.length > 500) error.alamat = "Alamat terlalu panjang.";
  if (catatan.length > CATATAN_MAKS) error.catatan = `Catatan maksimal ${CATATAN_MAKS} huruf.`;
  if (!input.setuju) error.setuju = "Centang persetujuan supaya toko boleh memproses pesananmu.";
  if (Object.keys(error).length > 0) return { ok: false, error };
  return { ok: true, data: { nama, noWa: noWa!, alamat, catatan: catatan || null } };
}

export type ItemDiminta = { productId: string; size: string; jumlah: number };

export type VarianTerkini = {
  productId: string;
  variantId: string;
  size: string;
  stok: number;
  nama: string;
  brand: string;
  harga: number;
  feeProduk: number | null;
};

export type ItemOrder = {
  variantId: string;
  namaProduk: string;
  size: string;
  hargaSatuan: number;
  jumlah: number;
  feePerPasang: number;
};

export type MasalahItem = { productId: string; size: string; pesan: string };

/**
 * Harga dan stok selalu dari database, bukan dari browser (PRD: checkout memeriksa ulang).
 * Web tidak menahan stok; ini hanya menolak yang sudah jelas tidak bisa dipenuhi.
 * Fee disalin ke item. Tanpa fee khusus dan tanpa tier yang cocok, dipakai batas bawah kesepakatan (FEE_MIN),
 * supaya pembeli tidak ditolak karena tabel fee belum lengkap.
 */
export function rencanakanOrder(
  diminta: readonly ItemDiminta[],
  terkini: readonly VarianTerkini[],
  tiers: readonly FeeTier[],
): { ok: true; items: ItemOrder[]; total: number } | { ok: false; masalah: MasalahItem[] } {
  if (diminta.length === 0) return { ok: false, masalah: [{ productId: "", size: "", pesan: "Keranjang kosong." }] };
  if (diminta.length > ITEM_MAKS) return { ok: false, masalah: [{ productId: "", size: "", pesan: `Maksimal ${ITEM_MAKS} model per pesanan.` }] };

  const masalah: MasalahItem[] = [];
  const items: ItemOrder[] = [];
  for (const d of diminta) {
    const v = terkini.find((t) => t.productId === d.productId && t.size === d.size);
    const jumlah = Math.trunc(d.jumlah);
    if (!v) {
      masalah.push({ ...d, pesan: `Size ${d.size} untuk model ini sudah tidak dijual. Hapus dari keranjang.` });
    } else if (!(jumlah >= 1 && jumlah <= JUMLAH_MAKS)) {
      masalah.push({ ...d, pesan: `Jumlah harus 1 sampai ${JUMLAH_MAKS} pasang.` });
    } else if (v.stok <= 0) {
      masalah.push({ ...d, pesan: `${v.brand} ${v.nama} size ${v.size} baru saja habis. Hapus dari keranjang atau pilih size lain.` });
    } else if (jumlah > v.stok) {
      masalah.push({ ...d, pesan: `${v.brand} ${v.nama} size ${v.size} tinggal ${v.stok} pasang.` });
    } else {
      items.push({
        variantId: v.variantId,
        namaProduk: `${v.brand} ${v.nama}`,
        size: v.size,
        hargaSatuan: v.harga,
        jumlah,
        feePerPasang: tentukanFeePerPasang({ harga: v.harga, feeProduk: v.feeProduk, tiers }) ?? FEE_MIN,
      });
    }
  }
  if (masalah.length > 0) return { ok: false, masalah };
  return { ok: true, items, total: items.reduce((n, i) => n + i.hargaSatuan * i.jumlah, 0) };
}

// Tanpa 0/O dan 1/I/L supaya kode tidak salah baca saat diketik ulang di chat.
const HURUF_KODE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** WEB-XXXX acak, bukan nomor urut, supaya jumlah order toko tidak terbaca dari kodenya. `acak` berisi byte acak. */
export function buatKodeOrder(acak: Uint8Array, panjang = 4): string {
  let kode = "";
  for (let i = 0; i < panjang; i++) kode += HURUF_KODE[acak[i] % HURUF_KODE.length];
  return `WEB-${kode}`;
}

export function isKodeOrder(teks: string): boolean {
  return new RegExp(`^WEB-[${HURUF_KODE}]{4,8}$`).test(teks);
}

/** Pesan yang terisi saat WhatsApp terbuka. Alamat ikut, supaya toko bisa langsung menghitung ongkir. */
export function pesanWhatsApp(order: {
  kode: string;
  nama: string;
  alamat: string;
  catatan: string | null;
  total: number;
  items: readonly Pick<ItemOrder, "namaProduk" | "size" | "jumlah" | "hargaSatuan">[];
}): string {
  return [
    `Halo, saya mau pesan. Kode pesanan: ${order.kode}`,
    "",
    ...order.items.map((i) => `${i.jumlah}x ${i.namaProduk}, size ${i.size}, ${formatRupiah(i.hargaSatuan)}`),
    "",
    `Subtotal: ${formatRupiah(order.total)} (belum termasuk ongkir)`,
    `Nama: ${order.nama}`,
    `Alamat: ${order.alamat}`,
    ...(order.catatan ? [`Catatan: ${order.catatan}`] : []),
  ].join("\n");
}

export function linkWhatsApp(nomorToko: string, pesan: string): string {
  return `https://wa.me/${nomorToko}?text=${encodeURIComponent(pesan)}`;
}

/** Batas kirim per nomor WhatsApp: maksimal `maks` order dalam `jendelaMenit` terakhir. */
export function lewatBatasKirim(waktuOrderSebelumnya: readonly Date[], sekarang: Date, maks = 3, jendelaMenit = 60): boolean {
  const batas = sekarang.getTime() - jendelaMenit * 60_000;
  return waktuOrderSebelumnya.filter((w) => w.getTime() > batas).length >= maks;
}

/** Isi keranjang dari form (JSON). Bentuk yang salah dibuang; jumlah diperiksa lagi di rencanakanOrder. */
export function parseItemDiminta(teks: string): ItemDiminta[] {
  let mentah: unknown;
  try {
    mentah = JSON.parse(teks);
  } catch {
    return [];
  }
  if (!Array.isArray(mentah)) return [];
  return mentah
    .filter(
      (x): x is ItemDiminta =>
        Boolean(x) && typeof x.productId === "string" && typeof x.size === "string" && typeof x.jumlah === "number" && Number.isFinite(x.jumlah),
    )
    .slice(0, ITEM_MAKS + 1)
    .map(({ productId, size, jumlah }) => ({ productId, size, jumlah }));
}
