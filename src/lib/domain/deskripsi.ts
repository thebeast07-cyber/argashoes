// Tampilan deskripsi produk. Fungsi murni; teks di database tidak diubah.
// Owner menempel deskripsi dari mana saja (Shopee, Tokopedia, IG), jadi formatnya ditebak dari kebiasaan umum:
// poin "•"/"✅"/"➤"/"-"/"1." (kadang disambung dalam satu baris), judul berakhiran titik dua, HURUF BESAR,
// atau dibungkus 【】/[]/===, label "Warna: Hitam", plus hashtag dan garis hiasan yang tidak perlu tampil.

import { rapikanHurufBesar } from "./teks";

export type Butir = { label: string | null; isi: string };
export type BlokDeskripsi =
  | { jenis: "judul"; teks: string }
  | { jenis: "paragraf"; teks: string }
  | { jenis: "daftar"; berurut: boolean; butir: Butir[] };

const BATAS_JUDUL = 40;

// Penanda poin di awal baris. Strip dan bintang wajib diikuti spasi supaya "-20%" tidak dianggap poin.
const PENANDA_POIN = /^(?:[•●◦▪▫■□◆◇★☆✓✔☑➤➢►▶→»·]|[-*–—](?=\s)|\p{Extended_Pictographic}️?)\s*/u;
const NOMOR = /^\d{1,2}[.)]\s+/;
// Poin yang disambung dalam satu baris.
const PEMISAH_SEBARIS = /\s*[•●▪◾■]\s*/u;
const HIASAN_JUDUL = /^[\s[【〔(=*#_~\-]+|[\s\]】〕)=*#_~\-]+$/gu;

function jadiButir(teks: string): Butir {
  // "Warna: Hitam" atau "Warna : Hitam" → label tebal. Label harus diawali huruf dan "://" bukan pemisah, jadi tautan aman.
  const m = teks.match(/^(\p{L}[^:]{0,29}?)\s*:\s*(?!\/\/)(\S.*)$/u);
  return m ? { label: m[1].trim(), isi: m[2].trim() } : { label: null, isi: teks };
}

/** Judul: pendek dan berakhiran titik dua, HURUF BESAR tanpa titik di akhir, atau dibungkus hiasan. */
function bacaJudul(baris: string): string | null {
  const tanpaHiasan = baris.replace(HIASAN_JUDUL, "").trim();
  const dibungkus = tanpaHiasan !== baris.trim() && /^[\s[【〔(=*#_~-]/u.test(baris) && /[\]】〕)=*#_~-]\s*$/u.test(baris);
  const teks = tanpaHiasan.replace(/\s*:$/, "").trim();
  if (!teks || teks.length > BATAS_JUDUL) return null;
  const hurufBesar = /\p{Lu}/u.test(teks) && !/\p{Ll}/u.test(teks) && !/[.!?]$/.test(teks);
  if (tanpaHiasan.endsWith(":") || dibungkus || hurufBesar) return rapikanHurufBesar(teks);
  return null;
}

function hanyaHiasan(baris: string): boolean {
  return /^[\s=*_~\-–—.•·]+$/u.test(baris) || /^(?:#[\p{L}\p{N}_]+\s*)+$/u.test(baris);
}

export function uraiDeskripsi(teks: string): BlokDeskripsi[] {
  const blok: BlokDeskripsi[] = [];
  let putus = false;
  const tambahButir = (b: Butir, berurut: boolean) => {
    const akhir = blok.at(-1);
    if (!putus && akhir?.jenis === "daftar" && akhir.berurut === berurut) akhir.butir.push(b);
    else blok.push({ jenis: "daftar", berurut, butir: [b] });
    putus = false;
  };
  const tambahBlok = (b: BlokDeskripsi) => {
    blok.push(b);
    putus = false;
  };

  for (const mentah of teks.split(/\r?\n/)) {
    const baris = mentah.trim();
    if (!baris) {
      // Baris kosong memutus daftar, supaya daftar berikutnya tidak tergabung.
      putus = true;
      continue;
    }
    if (hanyaHiasan(baris)) continue;

    if (NOMOR.test(baris)) {
      tambahButir(jadiButir(baris.replace(NOMOR, "")), true);
      continue;
    }
    const tanpaPenanda = baris.replace(PENANDA_POIN, "");
    const adaPenanda = tanpaPenanda !== baris;
    const bagian = tanpaPenanda.split(PEMISAH_SEBARIS).map((p) => p.trim());
    const [depan, ...sisa] = bagian;

    if (sisa.length > 0) {
      // "Fitur: • A • B" atau "• A • B": bagian depan judul/poin, sisanya poin.
      if (depan) {
        const judul = !adaPenanda ? bacaJudul(depan) : null;
        if (judul) tambahBlok({ jenis: "judul", teks: judul });
        else if (adaPenanda) tambahButir(jadiButir(depan), false);
        else tambahBlok({ jenis: "paragraf", teks: depan });
      }
      for (const p of sisa) if (p) tambahButir(jadiButir(p), false);
      continue;
    }

    // Emoji di depan judul ("✨ SPESIFIKASI") tetap judul, bukan poin.
    const judul = bacaJudul(tanpaPenanda);
    if (judul) tambahBlok({ jenis: "judul", teks: judul });
    else if (adaPenanda) tambahButir(jadiButir(tanpaPenanda), false);
    else tambahBlok({ jenis: "paragraf", teks: baris });
  }
  return blok;
}
