// CSV kecil tanpa dependensi: cukup untuk file stok dan katalog dari Excel/Sheets.

export type Pemisah = "," | ";" | "\t";

/** Batas isi file import (karakter). Ratusan SKU hanya puluhan KB. */
export const BATAS_UKURAN_CSV = 1_500_000;

/** Excel berbahasa Indonesia menyimpan CSV dengan ";", Sheets dengan ",". */
export function deteksiPemisah(teks: string): Pemisah {
  const barisPertama = teks.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const hitung = (p: string) => barisPertama.split(p).length - 1;
  const kandidat: Pemisah[] = [";", "\t", ","];
  return kandidat.reduce((terbaik, p) => (hitung(p) > hitung(terbaik) ? p : terbaik), ",");
}

/** Parse CSV (RFC 4180: tanda kutip ganda, koma/baris baru di dalam kutip). Baris kosong dibuang. */
export function parseCsv(teks: string, pemisah: Pemisah = deteksiPemisah(teks)): string[][] {
  const isi = teks.replace(/^\uFEFF/, "");
  const baris: string[][] = [];
  let sel = "";
  let barisIni: string[] = [];
  let dalamKutip = false;

  for (let i = 0; i < isi.length; i++) {
    const c = isi[i];
    if (dalamKutip) {
      if (c === '"' && isi[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (c === '"') {
        dalamKutip = false;
      } else {
        sel += c;
      }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === pemisah) {
      barisIni.push(sel);
      sel = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && isi[i + 1] === "\n") i++;
      barisIni.push(sel);
      baris.push(barisIni);
      barisIni = [];
      sel = "";
    } else {
      sel += c;
    }
  }
  barisIni.push(sel);
  baris.push(barisIni);

  return baris.filter((b) => b.some((s) => s.trim() !== ""));
}

function selCsv(nilai: string | number | null | undefined, pemisah: Pemisah): string {
  if (nilai === null || nilai === undefined) return "";
  if (typeof nilai === "number") return String(nilai);
  // Cegah formula injection saat file dibuka di Excel/Sheets.
  const aman = /^[=+\-@\t\r]/.test(nilai) ? `'${nilai}` : nilai;
  return /["\r\n]/.test(aman) || aman.includes(pemisah) ? `"${aman.replace(/"/g, '""')}"` : aman;
}

export function keCsv(baris: readonly (readonly (string | number | null | undefined)[])[], pemisah: Pemisah = ","): string {
  return baris.map((b) => b.map((s) => selCsv(s, pemisah)).join(pemisah)).join("\r\n") + "\r\n";
}

/** Nama kolom dinormalisasi: huruf kecil, spasi/strip jadi garis bawah. "Harga Coret" → "harga_coret". */
export function normalisasiHeader(nama: string): string {
  return nama.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Ubah tabel jadi objek per baris berdasarkan header. `baris` = nomor baris di file (header = 1). */
export function tabelKeObjek(tabel: string[][]): { header: string[]; data: { baris: number; nilai: Record<string, string> }[] } {
  const [kepala = [], ...isi] = tabel;
  const header = kepala.map(normalisasiHeader);
  const data = isi.map((sel, i) => ({
    baris: i + 2,
    nilai: Object.fromEntries(header.map((h, j) => [h, (sel[j] ?? "").trim()])),
  }));
  return { header, data };
}
