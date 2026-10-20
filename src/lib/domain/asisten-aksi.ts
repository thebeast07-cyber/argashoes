// Ubah stok lewat asisten. Fungsi murni.
// Gemini hanya menerjemahkan kalimat jadi perintah (model, size, tambah/kurangi/jadi, jumlah). Di sini perintah itu
// dicocokkan ke data DB jadi rencana "dari → ke" untuk kartu konfirmasi. Stok baru berubah setelah pengguna menekan
// Simpan, dan saat itu server mengecek stoknya belum berubah sejak kartu dibuat.

import type { ModelStok, VarianStok } from "./asisten-stok";

export const CARA_STOK = ["tambah", "kurangi", "jadi"] as const;
export type CaraStok = (typeof CARA_STOK)[number];

export const BATAS_PERINTAH_STOK = 40;
export const STOK_MAKS = 9999;

export type VarianAksi = VarianStok & { id: string };
export type PerintahStok = {
  nomorModel: number;
  size: string;
  cara: CaraStok;
  jumlah: number;
};
export type BarisRencanaStok = {
  variantId: string;
  productId: string;
  model: string;
  size: string;
  dari: number;
  ke: number;
};
export type RencanaStokAsisten = {
  baris: BarisRencanaStok[];
  masalah: string[];
};
export type PerubahanStok = { variantId: string; dari: number; ke: number };

/** "42,5", " EU 42.5 " dan "42.5" dianggap size yang sama. */
export function samakanSize(size: string): string {
  return size
    .trim()
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/^(?:eu|size)\s*/, "")
    .replace(/\s+/g, " ");
}

const bulat = (n: unknown, maks: number): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= maks;

/** Perintah dari AI diperlakukan sebagai input tak tepercaya: yang bentuknya salah dibuang. */
export function bacaPerintahStok(mentah: unknown): PerintahStok[] {
  if (!Array.isArray(mentah)) return [];
  return mentah
    .filter(
      (p): p is PerintahStok =>
        Boolean(p) &&
        Number.isInteger(p.nomorModel) &&
        typeof p.size === "string" &&
        p.size.trim() !== "" &&
        CARA_STOK.includes(p.cara) &&
        bulat(p.jumlah, STOK_MAKS),
    )
    .slice(0, BATAS_PERINTAH_STOK)
    .map((p) => ({
      nomorModel: p.nomorModel,
      size: p.size.trim(),
      cara: p.cara,
      jumlah: p.jumlah,
    }));
}

/** null kalau tidak ada perintah. Perintah untuk size yang sama dijalankan berurutan. */
export function rencanaStokAsisten(perintah: readonly PerintahStok[], model: readonly ModelStok[], varian: readonly VarianAksi[]): RencanaStokAsisten | null {
  if (perintah.length === 0) return null;
  const masalah: string[] = [];
  const kini = new Map<string, number>();
  const urutan: VarianAksi[] = [];

  for (const p of perintah) {
    const m = model[p.nomorModel - 1];
    if (!m) {
      masalah.push("Ada model yang tidak ditemukan di katalog.");
      continue;
    }
    const nama = `${m.brand} ${m.nama}`;
    const v = varian.find((x) => x.productId === m.id && samakanSize(x.size) === samakanSize(p.size));
    if (!v) {
      masalah.push(`${nama}: size ${p.size} belum ada. Tambahkan dulu lewat Tambah size di halaman produknya.`);
      continue;
    }
    const dari = kini.get(v.id) ?? v.stok;
    const ke = p.cara === "tambah" ? dari + p.jumlah : p.cara === "kurangi" ? dari - p.jumlah : p.jumlah;
    if (ke < 0) {
      masalah.push(`${nama} size ${v.size} tinggal ${dari}, tidak bisa dikurangi ${p.jumlah}.`);
      continue;
    }
    if (ke > STOK_MAKS) {
      masalah.push(`${nama} size ${v.size}: stok paling banyak ${STOK_MAKS}.`);
      continue;
    }
    if (!kini.has(v.id)) urutan.push(v);
    kini.set(v.id, ke);
  }

  const baris = urutan.flatMap((v) => {
    const ke = kini.get(v.id)!;
    if (ke === v.stok) return [];
    const m = model.find((x) => x.id === v.productId)!;
    return [
      {
        variantId: v.id,
        productId: m.id,
        model: `${m.brand} ${m.nama}`,
        size: v.size,
        dari: v.stok,
        ke,
      },
    ];
  });
  if (baris.length === 0 && masalah.length === 0) masalah.push("Stoknya sudah sama dengan yang diminta, tidak ada yang berubah.");
  return { baris, masalah };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Isi kartu yang dikirim balik browser saat Simpan ditekan. Bentuk salah atau size ganda → null. */
export function bacaKonfirmasiStok(mentah: unknown): PerubahanStok[] | null {
  if (!Array.isArray(mentah) || mentah.length === 0 || mentah.length > BATAS_PERINTAH_STOK) return null;
  const hasil: PerubahanStok[] = [];
  for (const p of mentah) {
    if (!p || typeof p.variantId !== "string" || !UUID.test(p.variantId) || !bulat(p.dari, STOK_MAKS) || !bulat(p.ke, STOK_MAKS)) return null;
    hasil.push({ variantId: p.variantId, dari: p.dari, ke: p.ke });
  }
  return new Set(hasil.map((p) => p.variantId)).size === hasil.length ? hasil : null;
}

/** Stok di DB harus masih sama dengan "dari" di kartu, supaya perubahan orang lain tidak tertimpa diam-diam. */
export function cekStokMasihSama(perubahan: readonly PerubahanStok[], sekarang: ReadonlyMap<string, number>): "ok" | "berubah" | "tidak_ada" {
  if (perubahan.some((p) => !sekarang.has(p.variantId))) return "tidak_ada";
  return perubahan.every((p) => sekarang.get(p.variantId) === p.dari) ? "ok" : "berubah";
}
