import Link from "next/link";

// Kerangka halaman publik. Belum ada tautan Keranjang: keranjang dibangun di tahap 5 (R-24, tanpa tautan ke halaman yang belum ada).
export default function LayoutPublik({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="wadah flex min-h-[60px] items-center justify-between gap-4 py-1.5">
        <Link href="/" className="lebar inline-flex min-h-11 items-center text-[22px] font-black tracking-tight">
          Argashoes
        </Link>
        <Link href="/cara-order" className="inline-flex min-h-11 items-center font-bold underline underline-offset-[3px] hover:decoration-2">
          Cara order
        </Link>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="wadah mt-9 bg-kertas-gelap py-8 min-[900px]:py-10">
        <p className="lebar text-lg font-black tracking-tight">Argashoes</p>
        <p className="mt-1 text-sm text-redup">Sepatu Nike dan Adidas. Pesan di sini, selesaikan di WhatsApp.</p>
        <Link href="/cara-order" className="mt-3 inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]">
          Cara order
        </Link>
      </footer>
    </div>
  );
}
