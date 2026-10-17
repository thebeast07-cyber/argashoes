import Link from "next/link";

export default function PesananTidakAda() {
  return (
    <main className="wadah py-12">
      <h1 className="text-2xl font-bold">Pesanan dengan kode itu tidak ada.</h1>
      <p className="mt-2 text-redup">Periksa lagi kodenya. Kode pesanan juga ada di chat WhatsApp yang kamu kirim ke toko.</p>
      <Link href="/" className="tombol-utama mt-4">
        Lihat katalog
      </Link>
    </main>
  );
}
