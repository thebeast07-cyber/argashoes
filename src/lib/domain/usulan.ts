// Usulan perubahan dari admin toko yang baru berlaku setelah disetujui pemilik web. Fungsi murni.

import { cariTier, type FeeTier } from "./fee";
import { urutkanTier, type Rekening } from "./pengaturan";

export const JENIS_USULAN = ["tier", "fee_produk", "rekening"] as const;
export type JenisUsulan = (typeof JENIS_USULAN)[number];

export const STATUS_USULAN = ["menunggu", "disetujui", "ditolak", "dibatalkan"] as const;
export type StatusUsulan = (typeof STATUS_USULAN)[number];

export const LABEL_JENIS: Record<JenisUsulan, string> = {
  tier: "Tier fee",
  fee_produk: "Fee khusus produk",
  rekening: "Rekening",
};

export const LABEL_STATUS: Record<StatusUsulan, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibatalkan: "Ditarik",
};

/** Nilai yang diusulkan dan nilai yang berlaku saat diusulkan, per jenis. */
export type NilaiUsulan = {
  tier: FeeTier[];
  fee_produk: number | null;
  rekening: Rekening | null;
};

/** Satu sasaran hanya boleh punya satu usulan menunggu; kunci ini yang dijaga unik di DB. */
export function kunciUsulan(jenis: JenisUsulan, productId?: string): string {
  if (jenis !== "fee_produk") return jenis;
  if (!productId) throw new Error("Usulan fee produk butuh productId");
  return `fee_produk:${productId}`;
}

function kanonik(jenis: JenisUsulan, nilai: unknown): string {
  if (jenis === "tier") {
    return JSON.stringify(urutkanTier(nilai as FeeTier[]).map((t) => [t.hargaMin, t.hargaMax, t.fee]));
  }
  if (jenis === "rekening") {
    const r = nilai as Rekening | null;
    return JSON.stringify(r && [r.bank, r.nomor, r.atasNama]);
  }
  return JSON.stringify(nilai ?? null);
}

export function samaNilai<J extends JenisUsulan>(jenis: J, a: NilaiUsulan[J], b: NilaiUsulan[J]): boolean {
  return kanonik(jenis, a) === kanonik(jenis, b);
}

/**
 * Basi = nilai yang berlaku sekarang sudah beda dari saat usulan dibuat (misalnya pemilik
 * mengubahnya langsung). Menyetujui usulan basi akan menimpa perubahan itu tanpa ketahuan.
 */
export function usulanBasi<J extends JenisUsulan>(jenis: J, dasar: NilaiUsulan[J], sekarang: NilaiUsulan[J]): boolean {
  return !samaNilai(jenis, dasar, sekarang);
}

export type ProdukUntukDampak = { id: string; nama: string; brand: string; harga: number; feePerPasang: number | null };

export type DampakTier = {
  berubah: { id: string; nama: string; brand: string; harga: number; dari: number | null; ke: number | null }[];
  naik: number;
  turun: number;
  /** Produk dengan fee khusus tidak ikut tier, jadi tidak terdampak. */
  feeKhusus: number;
};

export function dampakTier(produk: readonly ProdukUntukDampak[], lama: readonly FeeTier[], baru: readonly FeeTier[]): DampakTier {
  const hasil: DampakTier = { berubah: [], naik: 0, turun: 0, feeKhusus: 0 };
  for (const p of produk) {
    if (p.feePerPasang !== null) {
      hasil.feeKhusus++;
      continue;
    }
    const dari = cariTier(p.harga, lama)?.fee ?? null;
    const ke = cariTier(p.harga, baru)?.fee ?? null;
    if (dari === ke) continue;
    hasil.berubah.push({ id: p.id, nama: p.nama, brand: p.brand, harga: p.harga, dari, ke });
    if ((ke ?? 0) > (dari ?? 0)) hasil.naik++;
    else hasil.turun++;
  }
  hasil.berubah.sort((a, b) => a.harga - b.harga);
  return hasil;
}
