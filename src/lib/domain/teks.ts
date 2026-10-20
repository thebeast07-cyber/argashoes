// Merapikan teks isian admin untuk tampilan publik. Fungsi murni; data di database tidak diubah.

// Singkatan yang lazim di nama sepatu dan memang ditulis huruf besar.
const SINGKATAN = new Set(["OG", "SB", "SE", "QS", "PRM", "GTX", "NMD", "XLG", "SPZL", "LX", "SP", "CDG", "BNIB", "USA", "UK", "EU", "US", "II", "III", "X"]);

function rapikanKata(kata: string): string {
  if (/\d/.test(kata) || SINGKATAN.has(kata)) return kata;
  return kata.charAt(0) + kata.slice(1).toLowerCase();
}

/**
 * Nama yang diketik HURUF BESAR SEMUA ditampilkan sebagai Huruf Awal Besar ("NIKE AIR MAX 90" → "Nike Air Max 90").
 * Kata berangka (AF1, 90, DH2987) dan singkatan sepatu (OG, SB, GTX, ...) tetap huruf besar.
 * Kalau sudah ada huruf kecil, pengisi sengaja memilih besar-kecilnya, jadi dibiarkan.
 */
export function rapikanHurufBesar(teks: string): string {
  const t = teks.trim().replace(/\s+/g, " ");
  if (/\p{Ll}/u.test(t) || !/\p{Lu}/u.test(t)) return t;
  return t
    .split(/([^\p{L}\p{N}']+)/u)
    .map((bagian) => (/^[\p{L}\p{N}']+$/u.test(bagian) ? rapikanKata(bagian) : bagian))
    .join("");
}
