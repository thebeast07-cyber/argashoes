// Keranjang di browser (PRD: isi keranjang disimpan di browser). Fungsi murni; penyimpanan ada di lib/keranjang.
// Harga di sini hanya untuk tampilan. Saat checkout, harga dan stok dibaca ulang dari database.

export const JUMLAH_MAKS = 5;
export const ITEM_MAKS = 10;

export type ItemKeranjang = {
  productId: string;
  size: string;
  jumlah: number;
  // Salinan untuk tampilan, supaya halaman keranjang tidak perlu menunggu server.
  nama: string;
  brand: string;
  harga: number;
  foto: string | null;
};

const sama = (a: Pick<ItemKeranjang, "productId" | "size">, b: Pick<ItemKeranjang, "productId" | "size">) =>
  a.productId === b.productId && a.size === b.size;

/** Model + size yang sama digabung (jumlah bertambah, maksimal JUMLAH_MAKS). Item baru masuk paling atas. */
export function tambahItem(items: readonly ItemKeranjang[], baru: Omit<ItemKeranjang, "jumlah">): ItemKeranjang[] {
  const ada = items.find((i) => sama(i, baru));
  if (ada) return items.map((i) => (i === ada ? { ...i, ...baru, jumlah: Math.min(JUMLAH_MAKS, i.jumlah + 1) } : i));
  return [{ ...baru, jumlah: 1 }, ...items].slice(0, ITEM_MAKS);
}

export function ubahJumlah(items: readonly ItemKeranjang[], kunci: Pick<ItemKeranjang, "productId" | "size">, jumlah: number): ItemKeranjang[] {
  const j = Math.min(JUMLAH_MAKS, Math.max(1, Math.round(jumlah)));
  return items.map((i) => (sama(i, kunci) ? { ...i, jumlah: j } : i));
}

export function hapusItem(items: readonly ItemKeranjang[], kunci: Pick<ItemKeranjang, "productId" | "size">): ItemKeranjang[] {
  return items.filter((i) => !sama(i, kunci));
}

export function totalKeranjang(items: readonly ItemKeranjang[]): { pasang: number; subtotal: number } {
  return items.reduce((t, i) => ({ pasang: t.pasang + i.jumlah, subtotal: t.subtotal + i.harga * i.jumlah }), { pasang: 0, subtotal: 0 });
}

/** Isi localStorage bisa rusak atau diubah tangan: yang bentuknya salah dibuang, bukan membuat halaman gagal. */
export function parseKeranjang(teks: string | null): ItemKeranjang[] {
  if (!teks) return [];
  let mentah: unknown;
  try {
    mentah = JSON.parse(teks);
  } catch {
    return [];
  }
  if (!Array.isArray(mentah)) return [];
  const hasil: ItemKeranjang[] = [];
  for (const x of mentah as Record<string, unknown>[]) {
    if (
      x &&
      typeof x.productId === "string" &&
      typeof x.size === "string" &&
      typeof x.nama === "string" &&
      typeof x.brand === "string" &&
      Number.isInteger(x.harga) &&
      Number.isInteger(x.jumlah) &&
      (x.foto === null || typeof x.foto === "string") &&
      !hasil.some((h) => sama(h, x as ItemKeranjang))
    ) {
      hasil.push({
        productId: x.productId,
        size: x.size,
        nama: x.nama,
        brand: x.brand,
        harga: x.harga as number,
        foto: x.foto as string | null,
        jumlah: Math.min(JUMLAH_MAKS, Math.max(1, x.jumlah as number)),
      });
    }
  }
  return hasil.slice(0, ITEM_MAKS);
}
