import Link from "next/link";
import { IkonCari, IkonKeluarKardus, IkonMasukKardus, IkonTambah } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { formatRupiah } from "@/lib/domain/produk";
import { daftarProduk, getAmbangStok, opsiFilter, PER_HALAMAN } from "@/lib/produk/data";

export const metadata = { title: "Produk · Admin Argashoes" };
// Stok harus selalu terbaru (PRD: data stok tidak di-cache lama).
export const dynamic = "force-dynamic";

type Cari = { q?: string; brand?: string; size?: string; hal?: string };

function urlDengan(cari: Cari, ubah: Partial<Cari>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...cari, ...ubah })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/admin/produk?${s}` : "/admin/produk";
}

export default async function HalamanProduk({ searchParams }: { searchParams: Cari }) {
  await wajibIzin("produk.kelola");
  const db = await getDb();
  const halaman = Math.max(1, Number(searchParams.hal) || 1);
  const [{ items, total }, opsi, ambang] = await Promise.all([
    daftarProduk(db, { q: searchParams.q, brand: searchParams.brand, size: searchParams.size, halaman }),
    opsiFilter(db),
    getAmbangStok(db),
  ]);
  const adaFilter = Boolean(searchParams.q || searchParams.brand || searchParams.size);
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Produk</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/produk/import" className="tombol-garis text-sm">
            <IkonMasukKardus ukuran={18} />
            Import CSV
          </Link>
          <a href="/admin/produk/ekspor?format=katalog" className="tombol-garis text-sm">
            <IkonKeluarKardus ukuran={18} />
            Ekspor CSV
          </a>
        </div>
      </div>

      <Link href="/admin/produk/baru" className="tombol-utama w-full sm:w-auto">
        <IkonTambah ukuran={18} />
        Tambah model sepatu
      </Link>

      <form role="search" className="space-y-2" action="/admin/produk">
        <label htmlFor="q" className="label-form">
          Cari nama, brand, atau SKU
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" type="search" defaultValue={searchParams.q} className="input" autoComplete="off" />
          <button type="submit" className="tombol-garis shrink-0 px-3" aria-label="Cari">
            <IkonCari />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="brand" className="label-form">
              Brand
            </label>
            <select id="brand" name="brand" defaultValue={searchParams.brand ?? ""} className="input">
              <option value="">Semua</option>
              {opsi.brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="size" className="label-form">
              Size
            </label>
            <select id="size" name="size" defaultValue={searchParams.size ?? ""} className="input">
              <option value="">Semua</option>
              {opsi.sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className="tombol-garis text-sm">
            Terapkan filter
          </button>
          {adaFilter && (
            <Link href="/admin/produk" className="text-sm font-semibold underline underline-offset-2">
              Hapus filter
            </Link>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        adaFilter ? (
          <div className="rounded-label border-[1.5px] border-dashed border-tinta/40 p-5 text-sm">
            <p className="font-semibold">Tidak ada model yang cocok.</p>
            <p className="mt-1 text-redup">Coba kata kunci lain, atau hapus filter brand dan size.</p>
          </div>
        ) : (
          <div className="rounded-label border-[1.5px] border-dashed border-tinta/40 p-5 text-sm">
            <p className="font-semibold">Katalog masih kosong.</p>
            <p className="mt-1 text-redup">
              Tambah model satu per satu, atau{" "}
              <Link href="/admin/produk/import" className="font-semibold text-tinta underline underline-offset-2">
                import CSV
              </Link>{" "}
              dari data yang sudah ada.
            </p>
          </div>
        )
      ) : (
        <section aria-labelledby="judul-daftar">
          <h2 id="judul-daftar" className="mb-2 text-sm text-redup">
            {total.toLocaleString("id-ID")} model{adaFilter ? " cocok" : ""}
          </h2>
          <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
            {items.map((p) => {
              const sizeTampil = searchParams.size ? p.varian.filter((v) => v.size === searchParams.size) : p.varian;
              return (
                <li key={p.id}>
                  <Link href={`/admin/produk/${p.id}`} className="block py-3 hover:bg-white">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0">
                        <span className="sempit block text-xs font-semibold uppercase text-redup">{p.brand}</span>
                        <span className="block truncate font-semibold">{p.nama}</span>
                      </p>
                      <span className="angka shrink-0 text-sm font-semibold">{formatRupiah(p.harga)}</span>
                    </div>
                    {!p.aktif && <p className="mt-1 text-xs font-semibold text-bata">Nonaktif, tidak tampil di katalog</p>}
                    {sizeTampil.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {sizeTampil.map((v) => (
                          <LabelSize key={v.id} size={v.size} stok={v.stok} ambang={ambang} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-redup">Belum ada size. Buka untuk menambah.</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {totalHalaman > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {halaman > 1 ? (
            <Link href={urlDengan(searchParams, { hal: String(halaman - 1) })} className="tombol-garis">
              Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="angka text-redup">
            Halaman {halaman} dari {totalHalaman}
          </span>
          {halaman < totalHalaman ? (
            <Link href={urlDengan(searchParams, { hal: String(halaman + 1) })} className="tombol-garis">
              Berikutnya
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
