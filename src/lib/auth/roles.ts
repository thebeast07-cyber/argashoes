// Peran admin dan hak aksesnya (PRD: "Pengguna dan peran").
// Fungsi murni, tanpa akses database.

export const PERAN = ["pemilik", "admin_toko"] as const;
export type Peran = (typeof PERAN)[number];

export const LABEL_PERAN: Record<Peran, string> = {
  pemilik: "Pemilik web",
  admin_toko: "Admin toko",
};

export const IZIN = [
  "produk.kelola",
  "order.kelola",
  "pelanggan.lihat",
  "fee.atur",
  "fee.laporan",
  "akun.kelola",
  "analitik.lihat",
] as const;
export type Izin = (typeof IZIN)[number];

const IZIN_ADMIN_TOKO: readonly Izin[] = ["produk.kelola", "order.kelola", "pelanggan.lihat"];

const IZIN_PER_PERAN: Record<Peran, readonly Izin[]> = {
  admin_toko: IZIN_ADMIN_TOKO,
  // Pemilik: semua akses admin toko + fee, akun, analitik.
  pemilik: IZIN,
};

export function punyaIzin(peran: Peran, izin: Izin): boolean {
  return IZIN_PER_PERAN[peran].includes(izin);
}

export function isPeran(nilai: unknown): nilai is Peran {
  return typeof nilai === "string" && (PERAN as readonly string[]).includes(nilai);
}
