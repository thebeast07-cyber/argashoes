import Link from "next/link";

export default function ProdukTidakAda() {
  return (
    <main className="wadah py-12">
      <h1 className="text-2xl font-bold">Model ini tidak ada di katalog.</h1>
      <p className="mt-2 text-redup">Mungkin sudah tidak dijual, atau tautannya salah.</p>
      <Link href="/" className="tombol-utama mt-4">
        Lihat katalog
      </Link>
    </main>
  );
}
