import { normalisasiNomorWa } from "@/lib/domain/pengaturan";

// Isi halaman /link (tautan ala linktree untuk bio Instagram dan TikTok). Murni: tanpa database, tanpa Next.
// Menambah tautan baru (TikTok, dsb.) cukup menambah satu butir di `daftarTautan`.

export const URL_KATALOG = "https://argashoess.my.id";
export const URL_INSTAGRAM = "https://www.instagram.com/argashoess.catalog";
export const AKUN_INSTAGRAM = "@argashoess.catalog";

// Nomor yang dipakai untuk tombol chat di /link, sengaja tidak dibaca dari Pengaturan admin: diberikan pemilik web untuk halaman ini.
const NOMOR_CHAT = "+62 896-3090-8542";
const SAPAAN_CHAT = "Halo Argashoes, saya mau tanya stok sepatu.";

export type IkonTautan = "katalog" | "chat" | "kamera";

export type Tautan = {
  kunci: string;
  judul: string;
  keterangan?: string;
  href: string;
  ikon: IkonTautan;
  /** Hanya satu tautan yang utama: dialah tombol berwarna aksen. */
  utama: boolean;
  /** Terbuka di tab baru (situs lain), bukan di tab ini. */
  tabBaru: boolean;
};

/** Link wa.me dari nomor apa saja yang dikenali `normalisasiNomorWa`; null kalau nomornya tidak sah. */
export function urlWa(nomor: string, pesan?: string): string | null {
  const n = normalisasiNomorWa(nomor);
  if (!n) return null;
  return pesan ? `https://wa.me/${n}?text=${encodeURIComponent(pesan)}` : `https://wa.me/${n}`;
}

export function daftarTautan(): Tautan[] {
  const wa = urlWa(NOMOR_CHAT, SAPAAN_CHAT);
  return [
    {
      kunci: "katalog",
      judul: "Lihat katalog",
      keterangan: "Cari size, cek stok, pesan di web",
      href: URL_KATALOG,
      ikon: "katalog",
      utama: true,
      tabBaru: false,
    },
    // Tanpa nomor yang sah, tombol chat tidak ditampilkan daripada mengarah ke link rusak.
    ...(wa
      ? [
          {
            kunci: "whatsapp",
            judul: "Chat WhatsApp",
            keterangan: "Tanya stok dan size",
            href: wa,
            ikon: "chat" as const,
            utama: false,
            tabBaru: true,
          },
        ]
      : []),
    {
      kunci: "instagram",
      judul: "Instagram",
      keterangan: AKUN_INSTAGRAM,
      href: URL_INSTAGRAM,
      ikon: "kamera",
      utama: false,
      tabBaru: true,
    },
  ];
}
