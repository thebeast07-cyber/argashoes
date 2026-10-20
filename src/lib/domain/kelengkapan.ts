// Kotak "Belum lengkap" di beranda admin. Fungsi murni.
// Pemilik web tidak bisa mengingatkan owner satu per satu, jadi sistem yang memeriksa data yang masih kosong dan
// menampilkannya ke akun yang bisa mengisinya. Butir hilang sendiri begitu datanya diisi.

import type { Izin } from "@/lib/auth/roles";
import { FEE_MIN } from "./fee";

export type DataKelengkapan = {
  adaNomorWa: boolean;
  adaRekening: boolean;
  rekeningMenunggu: boolean;
  adaTier: boolean;
  modelTanpaFoto: { total: number; contoh: { id: string; nama: string }[] };
};

export type ButirKelengkapan = {
  kunci: "nomor_wa" | "rekening" | "tier" | "foto";
  /** Penting = pembeli ikut terhambat. */
  penting: boolean;
  teks: string;
  aksi: { label: string; href: string } | null;
  model?: { id: string; nama: string }[];
  /** Jumlah model di luar daftar contoh. */
  modelLain?: number;
};

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

export function daftarBelumLengkap(d: DataKelengkapan, bisa: (izin: Izin) => boolean): ButirKelengkapan[] {
  const hasil: ButirKelengkapan[] = [];

  if (!d.adaNomorWa && bisa("pengaturan.ubah")) {
    hasil.push({
      kunci: "nomor_wa",
      penting: true,
      teks: "Nomor WhatsApp toko belum diisi. Pembeli belum bisa mengirim pesanan.",
      aksi: { label: "Isi nomor WhatsApp", href: "/admin/pengaturan#judul-toko" },
    });
  }

  if (!d.adaRekening) {
    const teks = "Rekening belum diisi. Pembeli belum tahu ke mana harus transfer.";
    if (bisa("rekening.atur")) {
      // Kalau owner sudah mengajukan, kotak usulan di beranda yang mengingatkan pemilik web.
      if (!d.rekeningMenunggu) hasil.push({ kunci: "rekening", penting: true, teks, aksi: { label: "Isi rekening", href: "/admin/pengaturan#judul-rekening" } });
    } else if (bisa("usulan.ajukan")) {
      hasil.push(
        d.rekeningMenunggu
          ? { kunci: "rekening", penting: false, teks: "Rekening sudah diajukan, menunggu persetujuan pemilik web.", aksi: null }
          : { kunci: "rekening", penting: true, teks, aksi: { label: "Ajukan rekening", href: "/admin/pengaturan#judul-rekening" } },
      );
    }
  }

  if (!d.adaTier && bisa("fee.atur")) {
    hasil.push({
      kunci: "tier",
      penting: false,
      teks: `Tabel fee belum diisi. Sementara tiap pasang dihitung ${rupiah(FEE_MIN)}.`,
      aksi: { label: "Atur fee", href: "/admin/pengaturan#judul-tier" },
    });
  }

  if (d.modelTanpaFoto.total > 0 && bisa("produk.kelola")) {
    hasil.push({
      kunci: "foto",
      penting: false,
      teks: `${d.modelTanpaFoto.total} model yang tampil di katalog belum ada fotonya.`,
      aksi: null,
      model: d.modelTanpaFoto.contoh,
      modelLain: d.modelTanpaFoto.total - d.modelTanpaFoto.contoh.length,
    });
  }

  // Yang menghambat pembeli di atas.
  return [...hasil.filter((b) => b.penting), ...hasil.filter((b) => !b.penting)];
}
