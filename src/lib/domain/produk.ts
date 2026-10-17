// Validasi input produk dan varian. Fungsi murni; pemanggil yang menyimpan.

import { feeDalamRentang, FEE_MAX, FEE_MIN } from "./fee";
import { normalisasiSize, normalisasiSku } from "./stok";

/** "Rp 1.500.000", "1,500,000", "1500000" → 1500000. Desimal ("1500000,50") ditolak. */
export function parseRupiah(teks: string): number | null {
  const bersih = teks.replace(/^\s*rp\.?\s*/i, "").replace(/\s/g, "");
  if (/^\d+$/.test(bersih)) return Number(bersih);
  if (/^\d{1,3}([.,]\d{3})+$/.test(bersih)) return Number(bersih.replace(/[.,]/g, ""));
  return null;
}

export function parseBilanganBulat(teks: string): number | null {
  const bersih = teks.trim();
  return /^\d+$/.test(bersih) ? Number(bersih) : null;
}

/**
 * Brand yang sudah ada dipakai dengan ejaan lamanya, supaya "nike" dan "Nike" tidak jadi dua filter merek.
 * Brand baru disimpan apa adanya, hanya spasinya dirapikan.
 */
export function samakanMerek(brand: string, ada: readonly string[]): string {
  const rapi = (b: string) => b.trim().replace(/\s+/g, " ");
  const kunci = rapi(brand).toLowerCase();
  return ada.find((b) => rapi(b).toLowerCase() === kunci) ?? rapi(brand);
}

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export type InputProduk = {
  nama: string;
  brand: string;
  kategori: string;
  deskripsi: string;
  harga: string;
  hargaCoret: string;
  feePerPasang: string;
  aktif: boolean;
};

export type DataProduk = {
  nama: string;
  brand: string;
  kategori: string | null;
  deskripsi: string | null;
  harga: number;
  hargaCoret: number | null;
  feePerPasang: number | null;
  aktif: boolean;
};

export type HasilValidasi<T> = { ok: true; data: T } | { ok: false; error: Record<string, string> };

const kosongJadiNull = (s: string) => (s.trim() === "" ? null : s.trim());

export function validasiProduk(input: InputProduk): HasilValidasi<DataProduk> {
  const error: Record<string, string> = {};
  const nama = input.nama.trim();
  const brand = input.brand.trim();
  if (!nama) error.nama = "Nama model wajib diisi.";
  if (!brand) error.brand = "Brand wajib diisi.";

  const harga = parseRupiah(input.harga);
  if (harga === null || harga <= 0) error.harga = "Isi harga dalam rupiah, tanpa desimal. Contoh: 1.299.000";

  let hargaCoret: number | null = null;
  if (input.hargaCoret.trim()) {
    hargaCoret = parseRupiah(input.hargaCoret);
    if (hargaCoret === null) error.hargaCoret = "Isi harga coret dalam rupiah, atau kosongkan.";
    else if (harga !== null && hargaCoret <= harga) error.hargaCoret = "Harga coret harus lebih tinggi dari harga jual.";
  }

  let feePerPasang: number | null = null;
  if (input.feePerPasang.trim()) {
    feePerPasang = parseRupiah(input.feePerPasang);
    if (feePerPasang === null || !feeDalamRentang(feePerPasang)) {
      error.feePerPasang = `Fee per pasang antara ${formatRupiah(FEE_MIN)} dan ${formatRupiah(FEE_MAX)}, atau kosongkan untuk ikut tier harga.`;
    }
  }

  if (Object.keys(error).length > 0) return { ok: false, error };
  return {
    ok: true,
    data: {
      nama,
      brand,
      kategori: kosongJadiNull(input.kategori),
      deskripsi: kosongJadiNull(input.deskripsi),
      harga: harga!,
      hargaCoret,
      feePerPasang,
      aktif: input.aktif,
    },
  };
}

export type DataVarian = { sku: string; size: string; stok: number };

/** SKU (sudah dinormalisasi): huruf besar, angka, titik, strip, garis bawah, garis miring. Tanpa spasi. */
export function skuValid(sku: string): boolean {
  return /^[A-Z0-9][A-Z0-9._\-/]*$/.test(sku);
}

export function validasiVarian(input: { sku: string; size: string; stok: string }): HasilValidasi<DataVarian> {
  const error: Record<string, string> = {};
  const sku = normalisasiSku(input.sku);
  const size = normalisasiSize(input.size);
  const stok = parseBilanganBulat(input.stok);
  if (!sku) error.sku = "SKU wajib diisi.";
  else if (!skuValid(sku)) error.sku = "SKU hanya huruf, angka, titik, strip, garis miring.";
  if (!size) error.size = "Size wajib diisi.";
  if (stok === null) error.stok = "Stok berupa angka bulat, 0 atau lebih.";
  if (Object.keys(error).length > 0) return { ok: false, error };
  return { ok: true, data: { sku, size, stok: stok! } };
}
