import Link from "next/link";
import { NamaProduk } from "@/components/nama-produk";
import { notFound } from "next/navigation";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { formatRupiah } from "@/lib/domain/produk";
import { produkPublik } from "@/lib/katalog/data";
import { getAmbangStok } from "@/lib/produk/data";
import { Deskripsi } from "./deskripsi";
import { Galeri } from "./galeri";
import { PilihPesan } from "./pilih-pesan";

// Stok selalu terbaru (PRD: halaman produk membaca stok terbaru).
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: { id: string }; searchParams: { size?: string } };

export async function generateMetadata({ params }: Props) {
  if (!UUID.test(params.id)) return {};
  const p = await produkPublik(await getDb(), params.id);
  return p ? { title: `${p.brand} ${p.nama} · Argashoes` } : {};
}

export default async function HalamanProduk({ params, searchParams }: Props) {
  if (!UUID.test(params.id)) notFound();
  const db = await getDb();
  const [p, ambang] = await Promise.all([produkPublik(db, params.id), getAmbangStok(db)]);
  if (!p) notFound();
  const nama = `${p.brand} ${p.nama}`;

  return (
    <main className="min-[900px]:wadah min-[900px]:pb-14">
      <Link href="/" className="inline-flex min-h-12 items-center gap-1.5 px-4 font-bold min-[900px]:px-0">
        <IkonKembali ukuran={20} />
        Katalog
      </Link>
      <div className="min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-14">
        <div className="min-[900px]:sticky min-[900px]:top-4">
          <Galeri foto={p.foto} alt={nama} />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="px-4 pt-[18px] min-[900px]:order-1 min-[900px]:px-0 min-[900px]:pt-0">
            <p className="sempit text-[13px] font-bold uppercase text-redup">{p.brand}</p>
            {/* Kata panjang tanpa spasi (BLUE/SILVER/OBSIDIAN) di ukuran 32px lebih lebar dari layar HP; boleh dipatah di mana saja. */}
            <h1 className="mb-2 mt-0.5 text-[32px] font-black leading-[1.02] tracking-tight [overflow-wrap:anywhere] min-[900px]:text-[44px]">
              <NamaProduk nama={p.nama} />
            </h1>
            <p className="angka text-2xl font-extrabold">
              {formatRupiah(p.harga)}
              {p.hargaCoret && p.hargaCoret > p.harga && <span className="ml-1.5 text-base font-normal text-redup line-through">{formatRupiah(p.hargaCoret)}</span>}
            </p>
          </div>
          <PilihPesan
            produk={{ id: p.id, nama: p.nama, brand: p.brand, harga: p.harga, foto: p.sampulKecil }}
            varian={p.varian}
            ambang={ambang}
            sizeAwal={searchParams.size}
          />
          {p.deskripsi && (
            <section aria-labelledby="judul-deskripsi" className="mx-4 mt-6 min-[900px]:order-4 min-[900px]:mx-0">
              <h2 id="judul-deskripsi" className="mb-1.5 text-lg font-bold">
                Tentang model ini
              </h2>
              <Deskripsi teks={p.deskripsi} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
