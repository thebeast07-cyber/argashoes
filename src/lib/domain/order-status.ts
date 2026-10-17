// Status order dan transisinya (PRD: "Status order dan aturan fee").
// Fungsi murni, tanpa akses database.

export const STATUS_ORDER = ["lead", "dikonfirmasi", "dikirim", "selesai", "batal"] as const;
export type StatusOrder = (typeof STATUS_ORDER)[number];

export const LABEL_STATUS: Record<StatusOrder, string> = {
  lead: "Lead",
  dikonfirmasi: "Dikonfirmasi",
  dikirim: "Dikirim",
  selesai: "Selesai",
  batal: "Batal",
};

// Lead hanya dibuat otomatis saat checkout, jadi tidak ada transisi menuju lead.
// Selesai dan Batal adalah status akhir.
const TRANSISI: Record<StatusOrder, readonly StatusOrder[]> = {
  lead: ["dikonfirmasi", "batal"],
  dikonfirmasi: ["dikirim", "batal"],
  dikirim: ["selesai"],
  selesai: [],
  batal: [],
};

/** Pilihan cepat alasan batal; "Lainnya" diisi sendiri. Alasan wajib supaya pemilik tahu kenapa Lead tidak jadi. */
export const ALASAN_BATAL = ["Stok habis", "Pembeli tidak membalas", "Pembeli batal", "Lainnya"] as const;

export function isStatusOrder(nilai: unknown): nilai is StatusOrder {
  return typeof nilai === "string" && (STATUS_ORDER as readonly string[]).includes(nilai);
}

export function statusBerikutnya(dari: StatusOrder): readonly StatusOrder[] {
  return TRANSISI[dari];
}

export function bisaTransisi(dari: StatusOrder, ke: StatusOrder): boolean {
  return TRANSISI[dari].includes(ke);
}

export type OrderUntukTransisi = {
  status: StatusOrder;
  resiNomor: string | null;
  dikirimPada: Date | null;
};

export type InputTransisi = {
  order: OrderUntukTransisi;
  ke: StatusOrder;
  // Wajib (atau sudah tersimpan di order) saat pindah ke Dikirim.
  resiNomor?: string | null;
  // Wajib saat pindah ke Batal.
  alasanBatal?: string | null;
  waktu: Date;
};

export type PerubahanOrder = {
  status: StatusOrder;
  resiNomor: string | null;
  dikirimPada: Date | null;
  alasanBatal?: string;
};

export type GagalTransisi = "STATUS_SAMA" | "TRANSISI_TIDAK_VALID" | "RESI_WAJIB" | "ALASAN_WAJIB";

export type HasilTransisi =
  | { ok: true; perubahan: PerubahanOrder; event: { dariStatus: StatusOrder; keStatus: StatusOrder; waktu: Date; catatan: string | null } }
  | { ok: false; error: GagalTransisi };

export const PESAN_GAGAL_TRANSISI: Record<GagalTransisi, string> = {
  STATUS_SAMA: "Status order sudah sama.",
  TRANSISI_TIDAK_VALID: "Perubahan status ini tidak diizinkan.",
  RESI_WAJIB: "Nomor resi wajib diisi sebelum status Dikirim.",
  ALASAN_WAJIB: "Alasan batal wajib diisi.",
};

function rapikanResi(resi: string | null | undefined): string | null {
  const bersih = resi?.trim();
  return bersih ? bersih : null;
}

/**
 * Hitung perubahan order untuk satu transisi status, plus event audit-nya.
 * Tidak menyimpan apa pun; pemanggil yang menulis ke database.
 */
export function transisiStatus({ order, ke, resiNomor, alasanBatal, waktu }: InputTransisi): HasilTransisi {
  const dari = order.status;
  if (dari === ke) return { ok: false, error: "STATUS_SAMA" };
  if (!bisaTransisi(dari, ke)) return { ok: false, error: "TRANSISI_TIDAK_VALID" };

  const resi = rapikanResi(resiNomor) ?? rapikanResi(order.resiNomor);
  let dikirimPada = order.dikirimPada;

  if (ke === "dikirim") {
    if (!resi) return { ok: false, error: "RESI_WAJIB" };
    // Periode fee dihitung dari saat status menjadi Dikirim.
    dikirimPada = waktu;
  }

  if (ke === "batal") {
    const alasan = alasanBatal?.trim().replace(/\s+/g, " ").slice(0, 200);
    if (!alasan) return { ok: false, error: "ALASAN_WAJIB" };
    return {
      ok: true,
      perubahan: { status: ke, resiNomor: resi, dikirimPada, alasanBatal: alasan },
      event: { dariStatus: dari, keStatus: ke, waktu, catatan: alasan },
    };
  }

  return {
    ok: true,
    perubahan: { status: ke, resiNomor: resi, dikirimPada },
    event: { dariStatus: dari, keStatus: ke, waktu, catatan: null },
  };
}
