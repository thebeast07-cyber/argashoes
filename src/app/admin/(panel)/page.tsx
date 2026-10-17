import Link from "next/link";
import { IkonCari, IkonMasukKardus } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibLogin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { jumlahUsulanMenunggu } from "@/lib/pengaturan/data";
import { daftarSizeHabis } from "@/lib/produk/data";

export const metadata = { title: "Admin · Argashoes" };
export const dynamic = "force-dynamic";

const BATAS_HABIS = 12;

export default async function BerandaAdmin({ searchParams }: { searchParams: { akses?: string } }) {
  const user = await wajibLogin();
  const db = await getDb();
  const kelolaProduk = punyaIzin(user.peran, "produk.kelola");
  const [usulanMenunggu, habis] = await Promise.all([
    punyaIzin(user.peran, "usulan.putuskan") ? jumlahUsulanMenunggu(db) : 0,
    kelolaProduk ? daftarSizeHabis(db, BATAS_HABIS) : null,
  ]);

  return (
    <div className="space-y-6">
      {searchParams.akses === "ditolak" && (
        <p role="alert" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Halaman itu hanya untuk pemilik web.
        </p>
      )}
      <h1 className="text-xl font-bold">Halo, {user.nama}</h1>
      {usulanMenunggu > 0 && (
        <div className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <p className="font-semibold">{usulanMenunggu} usulan dari admin toko menunggu keputusanmu.</p>
          <Link href="/admin/pengaturan/usulan" className="tombol-utama">
            Periksa usulan
          </Link>
        </div>
      )}

      {kelolaProduk && habis && (
        <>
          <form role="search" action="/admin/produk" className="space-y-2">
            <label htmlFor="cari-beranda" className="label-form">
              Cari produk atau SKU
            </label>
            <div className="flex gap-2">
              <input id="cari-beranda" name="q" type="search" className="input" autoComplete="off" />
              <button type="submit" className="tombol-garis shrink-0 px-3" aria-label="Cari">
                <IkonCari />
              </button>
            </div>
          </form>

          <section aria-labelledby="judul-habis" className="space-y-2">
            <h2 id="judul-habis" className="text-lg font-bold">
              Size habis <span className="angka font-normal text-redup">({habis.total.toLocaleString("id-ID")})</span>
            </h2>
            {habis.total === 0 ? (
              <p className="text-sm text-redup">Semua size di katalog masih ada stoknya.</p>
            ) : (
              <>
                <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
                  {habis.items.map((h) => (
                    <li key={`${h.productId}-${h.size}`}>
                      <Link href={`/admin/produk/${h.productId}`} className="flex min-h-11 items-center justify-between gap-3 py-2 hover:bg-white">
                        <span className="min-w-0 truncate text-sm">
                          <span className="sempit font-semibold uppercase text-redup">{h.brand}</span> {h.nama}
                        </span>
                        <span className="sempit angka shrink-0 rounded-label border-[1.5px] border-habis/60 px-1.5 font-bold text-habis line-through">
                          {h.size}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {habis.total > habis.items.length && (
                  <p className="text-sm text-redup">dan {(habis.total - habis.items.length).toLocaleString("id-ID")} size lain.</p>
                )}
              </>
            )}
          </section>

          <Link href="/admin/produk/import" className="tombol-garis w-full">
            <IkonMasukKardus ukuran={18} />
            Import stok dari CSV
          </Link>
        </>
      )}
    </div>
  );
}
