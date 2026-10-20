// Tampilan deskripsi produk. Fungsi murni; teks di database tidak diubah.
// Deskripsi sering ditempel dari marketplace dengan poin "•" disambung dalam satu baris; di sini dipecah jadi daftar.

export type Butir = { label: string | null; isi: string };
export type BlokDeskripsi = { jenis: "judul"; teks: string } | { jenis: "paragraf"; teks: string } | { jenis: "daftar"; butir: Butir[] };

const BATAS_JUDUL = 40;
const BATAS_LABEL = 30;

function jadiButir(teks: string): Butir {
  // "Classic Look: Siluet..." → label tebal. Titik dua harus diikuti spasi, jadi "https://..." tidak terpotong.
  const m = teks.match(/^([^:]{1,30}):\s+(.+)$/);
  return m && m[1].trim().length <= BATAS_LABEL ? { label: m[1].trim(), isi: m[2].trim() } : { label: null, isi: teks };
}

function judulAtauParagraf(teks: string): BlokDeskripsi {
  return teks.endsWith(":") && teks.length <= BATAS_JUDUL ? { jenis: "judul", teks: teks.slice(0, -1).trim() } : { jenis: "paragraf", teks };
}

export function uraiDeskripsi(teks: string): BlokDeskripsi[] {
  const blok: BlokDeskripsi[] = [];
  const tambahButir = (b: Butir) => {
    const akhir = blok.at(-1);
    if (akhir?.jenis === "daftar") akhir.butir.push(b);
    else blok.push({ jenis: "daftar", butir: [b] });
  };

  for (const mentah of teks.split(/\r?\n/)) {
    const baris = mentah.trim();
    if (!baris) {
      // Baris kosong memutus daftar, supaya daftar berikutnya tidak tergabung.
      if (blok.at(-1)?.jenis === "daftar") blok.push({ jenis: "paragraf", teks: "" });
      continue;
    }
    if (baris.includes("•")) {
      const [depan, ...poin] = baris.split("•").map((p) => p.trim());
      if (depan) blok.push(judulAtauParagraf(depan));
      for (const p of poin) if (p) tambahButir(jadiButir(p));
    } else if (/^[-*]\s+/.test(baris)) {
      tambahButir(jadiButir(baris.replace(/^[-*]\s+/, "")));
    } else {
      blok.push(judulAtauParagraf(baris));
    }
  }
  return blok.filter((b) => !(b.jenis === "paragraf" && b.teks === ""));
}
