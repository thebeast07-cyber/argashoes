import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/db";
import { kalimatMerek } from "@/lib/domain/katalog";
import { merekAktif } from "@/lib/katalog/data";
import { TautanKeranjang } from "./tautan-keranjang";

// Nama brand diambil dari katalog, jadi brand baru otomatis ikut tersebut (sampai 4 brand; lebih dari itu kalimatnya umum).
export async function generateMetadata() {
  const merek = kalimatMerek(await merekAktif(await getDb()));
  return { description: `Cari size, cek stok, dan pesan sepatu ${merek ? `${merek} ` : ""}lewat WhatsApp.` };
}

// Kerangka halaman publik.
export default async function LayoutPublik({ children }: { children: React.ReactNode }) {
  const merek = kalimatMerek(await merekAktif(await getDb()));
  return (
    <div className="flex min-h-screen flex-col">
      <header className="wadah flex min-h-[60px] items-center justify-between gap-4 py-1.5">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Image src="/logo-argashoes.png" alt="Argashoes, ke beranda" width={70} height={56} priority className="h-14 w-auto" />
        </Link>
        <div className="flex items-center gap-5">
          {/* Cara order di header hanya mulai 600px; di HP cukup di footer supaya header tidak sesak. */}
          <Link href="/cara-order" className="hidden min-h-11 items-center font-bold underline underline-offset-[3px] hover:decoration-2 min-[600px]:inline-flex">
            Cara order
          </Link>
          <TautanKeranjang />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="wadah mt-9 bg-kertas-gelap py-8 min-[900px]:py-10">
        <p className="lebar text-lg font-black tracking-tight">Argashoes</p>
        <p className="mt-1 text-sm text-redup">{merek ? `Sepatu ${merek}. ` : ""}Pesan di sini, selesaikan di WhatsApp.</p>
        <Link href="/cara-order" className="mt-3 inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]">
          Cara order
        </Link>
      </footer>
    </div>
  );
}
