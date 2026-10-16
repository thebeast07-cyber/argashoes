// Validasi isian halaman Pengaturan: tier fee, nomor WhatsApp, rekening, ambang stok. Fungsi murni.

import { FEE_MAX, FEE_MIN, feeDalamRentang, type FeeTier } from "./fee";
import { formatRupiah, parseBilanganBulat, parseRupiah, type HasilValidasi } from "./produk";
import type { AmbangStok } from "./stok";

// --- Tier fee -------------------------------------------------------------------

/** Satu baris editor tier. Batas atas baris terakhir diabaikan: tier terakhir selalu "ke atas". */
export type BarisTier = { batasAtas: string; fee: string };

/**
 * Editor menyimpan batas, bukan rentang: tier pertama mulai Rp 0 dan tiap tier mulai di batas
 * tier sebelumnya, jadi rentang bolong atau tumpang tindih tidak mungkin terjadi.
 */
export function validasiBarisTier(baris: readonly BarisTier[]): HasilValidasi<FeeTier[]> {
  const error: Record<string, string> = {};
  if (baris.length === 0) return { ok: false, error: { umum: "Isi minimal satu tier." } };

  const tiers: FeeTier[] = [];
  let mulai = 0;
  baris.forEach((b, i) => {
    const terakhir = i === baris.length - 1;
    const fee = parseRupiah(b.fee);
    if (fee === null || !feeDalamRentang(fee)) {
      error[`fee.${i}`] = `Fee ${formatRupiah(FEE_MIN)} sampai ${formatRupiah(FEE_MAX)}.`;
    }

    let batas: number | null = null;
    if (!terakhir) {
      batas = parseRupiah(b.batasAtas);
      if (batas === null || batas <= mulai) {
        error[`batas.${i}`] = `Harus lebih dari ${formatRupiah(mulai)}.`;
        batas = null;
      }
    }
    tiers.push({ hargaMin: mulai, hargaMax: batas, fee: fee ?? 0 });
    // Batas salah: baris berikutnya tetap dicek dari batas terakhir yang valid.
    if (batas !== null) mulai = batas;
  });

  return Object.keys(error).length > 0 ? { ok: false, error } : { ok: true, data: tiers };
}

/** Rapat = mulai Rp 0, tiap tier menyambung tier sebelumnya, tier terakhir tanpa batas atas. */
export function tierRapat(tiers: readonly FeeTier[]): boolean {
  if (tiers.length === 0) return false;
  const urut = urutkanTier(tiers);
  return (
    urut[0].hargaMin === 0 &&
    urut.at(-1)!.hargaMax === null &&
    urut.every((t, i) => i === 0 || t.hargaMin === urut[i - 1].hargaMax)
  );
}

export function urutkanTier(tiers: readonly FeeTier[]): FeeTier[] {
  return [...tiers].sort((a, b) => a.hargaMin - b.hargaMin);
}

/** Isi awal editor dari tier yang tersimpan. Tanpa tier: satu baris kosong. */
export function barisDariTier(tiers: readonly FeeTier[]): BarisTier[] {
  if (tiers.length === 0) return [{ batasAtas: "", fee: "" }];
  return urutkanTier(tiers).map((t) => ({
    batasAtas: t.hargaMax === null ? "" : t.hargaMax.toLocaleString("id-ID"),
    fee: t.fee.toLocaleString("id-ID"),
  }));
}

export function labelRentang(t: FeeTier): string {
  if (t.hargaMax === null) return `${formatRupiah(t.hargaMin)} ke atas`;
  return `${formatRupiah(t.hargaMin)} sampai di bawah ${formatRupiah(t.hargaMax)}`;
}

// --- Nomor WhatsApp ---------------------------------------------------------------

/** "0812-3456-7890", "+62 812 3456 7890", "812..." jadi "6281234567890", format yang dipakai link wa.me. */
export function normalisasiNomorWa(teks: string): string | null {
  let n = teks.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(n)) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  if (!n.startsWith("62") || n.length < 10 || n.length > 15) return null;
  return n;
}

export function formatNomorWa(n: string): string {
  return "+" + n;
}

// --- Rekening yang tampil ke pelanggan --------------------------------------------------

export type Rekening = { bank: string; nomor: string; atasNama: string };

export function validasiRekening(input: Rekening): HasilValidasi<Rekening> {
  const error: Record<string, string> = {};
  const bank = input.bank.trim().replace(/\s+/g, " ");
  const atasNama = input.atasNama.trim().replace(/\s+/g, " ");
  const nomor = input.nomor.replace(/[\s\-.]/g, "");
  if (!bank) error.bank = "Nama bank wajib diisi.";
  else if (bank.length > 40) error.bank = "Maksimal 40 huruf.";
  if (!/^\d{5,20}$/.test(nomor)) error.nomor = "Nomor rekening berupa angka, 5 sampai 20 digit.";
  if (!atasNama) error.atasNama = "Nama pemilik rekening wajib diisi.";
  else if (atasNama.length > 60) error.atasNama = "Maksimal 60 huruf.";
  return Object.keys(error).length > 0 ? { ok: false, error } : { ok: true, data: { bank, nomor, atasNama } };
}

export function isRekening(nilai: unknown): nilai is Rekening {
  const r = nilai as Rekening | null;
  return typeof r?.bank === "string" && typeof r.nomor === "string" && typeof r.atasNama === "string";
}

// --- Ambang stok ------------------------------------------------------------------

export const AMBANG_MAKS = 50;

/** Minimal 2: dengan ambang 1, stok 1 sudah Ready dan status Sisa sedikit tidak pernah muncul. */
export function validasiAmbang(teks: string): HasilValidasi<AmbangStok> {
  const n = parseBilanganBulat(teks);
  if (n === null || n < 2 || n > AMBANG_MAKS) {
    return { ok: false, error: { ambang: `Angka bulat 2 sampai ${AMBANG_MAKS}.` } };
  }
  return { ok: true, data: { readyMin: n } };
}
