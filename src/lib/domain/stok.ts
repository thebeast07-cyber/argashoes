// Status stok dan urutan size (PRD: "Aturan stok"). Fungsi murni.

export type StatusStok = "ready" | "sisa_sedikit" | "habis";

/** Ready kalau stok >= readyMin, Sisa sedikit kalau 1..readyMin-1, Habis kalau 0. */
export type AmbangStok = { readyMin: number };

export const AMBANG_STOK_DEFAULT: AmbangStok = { readyMin: 3 };

export function statusStok(stok: number, ambang: AmbangStok = AMBANG_STOK_DEFAULT): StatusStok {
  if (stok <= 0) return "habis";
  return stok >= ambang.readyMin ? "ready" : "sisa_sedikit";
}

export function labelStok(stok: number, ambang: AmbangStok = AMBANG_STOK_DEFAULT): string {
  const status = statusStok(stok, ambang);
  if (status === "habis") return "Habis";
  if (status === "sisa_sedikit") return `Sisa ${stok}`;
  return "Ready";
}

export function isAmbangStok(nilai: unknown): nilai is AmbangStok {
  const readyMin = (nilai as AmbangStok | null)?.readyMin;
  return typeof readyMin === "number" && Number.isInteger(readyMin) && readyMin >= 2;
}

/** "42,5" dan " 42.5 " jadi "42.5"; spasi ganda dirapikan. */
export function normalisasiSize(size: string): string {
  return size.trim().replace(/\s+/g, " ").replace(/^(\d+),(\d+)$/, "$1.$2");
}

export function normalisasiSku(sku: string): string {
  return sku.trim().toUpperCase();
}

/** Nilai angka sebuah size untuk diurutkan: "42" → 42, "42.5" → 42.5, "41 1/3" → 41.33. */
export function nilaiSize(size: string): number | null {
  const m = normalisasiSize(size).match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?$/);
  if (!m) return null;
  const pecahan = m[2] && Number(m[3]) > 0 ? Number(m[2]) / Number(m[3]) : 0;
  return Number(m[1]) + pecahan;
}

/** Size angka diurutkan sebagai angka, size teks (mis. "S", "US 9") di belakang secara alfabet. */
export function bandingkanSize(a: string, b: string): number {
  const na = nilaiSize(a);
  const nb = nilaiSize(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.localeCompare(b, "id", { numeric: true });
}
