// SKU otomatis saat menambah size. Fungsi murni.
// Rumus yang dianjurkan (panduan import): kode artikel dari label dus + strip + size, mis. HM9451-600-40.

import { normalisasiSize, normalisasiSku } from "./stok";

/** Size sebagai akhiran SKU: spasi jadi strip ("40 2/3" → "40-2/3"), huruf besar. */
export function akhiranSize(size: string): string {
  return normalisasiSize(size).replace(/\s+/g, "-").toUpperCase();
}

/**
 * Kode artikel model ini, dibaca dari SKU size yang sudah ada.
 * SKU yang berakhiran "-<size>" diambil bagian depannya; SKU tanpa akhiran size dianggap kode artikel utuh
 * (mis. pengguna menulis HM9451-600 untuk size 39). Kalau beda-beda, yang paling sering dipakai; seri → yang pertama.
 */
export function kodeArtikel(varian: readonly { sku: string; size: string }[]): string | null {
  const hitung = new Map<string, number>();
  for (const v of varian) {
    const sku = normalisasiSku(v.sku);
    const akhiran = `-${akhiranSize(v.size)}`;
    const kode = sku.endsWith(akhiran) && sku.length > akhiran.length ? sku.slice(0, -akhiran.length) : sku;
    if (kode) hitung.set(kode, (hitung.get(kode) ?? 0) + 1);
  }
  let terbaik: string | null = null;
  for (const [kode, n] of hitung) if (terbaik === null || n > hitung.get(terbaik)!) terbaik = kode;
  return terbaik;
}

/** SKU usulan untuk size baru. Kosong kalau kode artikel belum diketahui atau size belum diisi. */
export function usulSku(kode: string | null, size: string): string {
  const akhiran = akhiranSize(size);
  return kode && akhiran ? normalisasiSku(`${kode}-${akhiran}`) : "";
}

/** Pesan saat SKU bentrok: sebut pemakainya, supaya pengguna tahu harus mengubah apa. */
export function pesanSkuDipakai(sku: string, pemakai: { productId: string; nama: string; brand: string; size: string } | null, productIdSendiri: string): string {
  if (!pemakai) return `SKU ${sku} sudah dipakai. Satu SKU hanya untuk satu size.`;
  const di = pemakai.productId === productIdSendiri ? "" : ` di ${pemakai.brand} ${pemakai.nama}`;
  return `SKU ${sku} sudah dipakai size ${pemakai.size}${di}. Satu SKU hanya untuk satu size: tambahkan strip dan size di belakang kode artikel.`;
}
