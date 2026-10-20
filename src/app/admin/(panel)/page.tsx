import Link from "next/link";
import { IkonCari, IkonGalat, IkonMasukKardus } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibLogin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { periodeFee } from "@/lib/domain/fee";
import { daftarBelumLengkap, type ButirKelengkapan } from "@/lib/domain/kelengkapan";
import { labelBulan } from "@/lib/domain/laporan-fee";
import { awalHariWib, umur } from "@/lib/domain/order-admin";
import { formatRupiah } from "@/lib/domain/produk";
import { rekapBulan } from "@/lib/fee/data";
import { ringkasanBerandaOrder } from "@/lib/orders/data";
import { dataKelengkapan, jumlahUsulanMenunggu } from "@/lib/pengaturan/data";
import { daftarSizeHabis } from "@/lib/produk/data";

export const metadata = { title: "Admin · Argashoes" };
export const dynamic = "force-dynamic";

const BATAS_HABIS = 12;

// Data yang masih kosong, hanya ke akun yang bisa mengisinya. Butir hilang sendiri setelah diisi.
function BelumLengkap({ butir }: { butir: ButirKelengkapan[] }) {
  return (
    <section aria-labelledby="judul-lengkap" className="space-y-2 rounded-label border-[1.5px] border-tinta bg-white p-3">
      <h2 id="judul-lengkap" className="font-bold">
        Belum lengkap
      </h2>
      <ul className="divide-y divide-tinta/15">
        {butir.map((b) => (
          <li key={b.kunci} className="space-y-1.5 py-2.5 first:pt-1 last:pb-0">
            <p className={`flex gap-2 text-sm ${b.penting ? "font-semibold text-sedikit-teks" : ""}`}>
              {b.penting && <IkonGalat ukuran={18} className="mt-px shrink-0" />}
              <span>{b.teks}</span>
            </p>
            {b.aksi && (
              <Link href={b.aksi.href} className="tombol-garis min-h-11 px-3 text-sm">
                {b.aksi.label}
              </Link>
            )}
            {b.model && (
              <ul className="text-sm">
                {b.model.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/produk/${m.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                      {m.nama}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {Boolean(b.modelLain) && <p className="text-sm text-redup">dan {b.modelLain} model lain.</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BerandaAdmin({ searchParams }: { searchParams: { akses?: string } }) {
  const user = await wajibLogin();
  const db = await getDb();
  const kelolaProduk = punyaIzin(user.peran, "produk.kelola");
  const sekarang = new Date();
  const [usulanMenunggu, habis, order, fee, kelengkapan] = await Promise.all([
    punyaIzin(user.peran, "usulan.putuskan") ? jumlahUsulanMenunggu(db) : 0,
    kelolaProduk ? daftarSizeHabis(db, BATAS_HABIS) : null,
    punyaIzin(user.peran, "order.kelola") ? ringkasanBerandaOrder(db, awalHariWib(sekarang), sekarang) : null,
    punyaIzin(user.peran, "fee.laporan") ? rekapBulan(db, periodeFee(sekarang)) : null,
    dataKelengkapan(db),
  ]);
  const belumLengkap = daftarBelumLengkap(kelengkapan, (izin) => punyaIzin(user.peran, izin));

  return (
    <div className="space-y-6">
      {searchParams.akses === "ditolak" && (
        <p role="alert" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Halaman itu hanya untuk pemilik web.
        </p>
      )}
      <h1 className="text-xl font-bold">Halo, {user.nama}</h1>
      {belumLengkap.length > 0 && <BelumLengkap butir={belumLengkap} />}
      {usulanMenunggu > 0 && (
        <div className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <p className="font-semibold">{usulanMenunggu} usulan dari admin toko menunggu keputusanmu.</p>
          <Link href="/admin/pengaturan/usulan" className="tombol-utama">
            Periksa usulan
          </Link>
        </div>
      )}

      {fee && (
        <Link href={`/admin/fee/${fee.bulan}`} className="block rounded-label border-[1.5px] border-tinta bg-white p-3 hover:bg-kertas">
          <span className="block text-sm text-redup">Fee {labelBulan(fee.bulan)} sejauh ini</span>
          <span className="angka block text-2xl font-extrabold">{formatRupiah(fee.totalFee)}</span>
          <span className="angka block text-sm">
            {fee.jumlahPasang} pasang · <span className="font-semibold underline underline-offset-2">Lihat laporan fee</span>
          </span>
        </Link>
      )}

      {order && (
        <section aria-labelledby="judul-order" className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="judul-order" className="text-lg font-bold">
              Order hari ini <span className="angka font-normal text-redup">({order.hariIni})</span>
            </h2>
            <Link href="/admin/order" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
              Semua order
            </Link>
          </div>
          {order.terbengkalai.length > 0 ? (
            <div className="space-y-2 rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3">
              <p className="text-sm font-bold text-sedikit-teks">{order.terbengkalai.length} Lead belum diproses lebih dari 24 jam</p>
              <ul className="divide-y divide-sedikit-teks/30">
                {order.terbengkalai.map((o) => (
                  <li key={o.kode}>
                    <Link href={`/admin/order/${o.kode}`} className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm">
                      <span>
                        <span className="sempit angka font-bold">{o.kode}</span> {o.nama}
                      </span>
                      <span className="shrink-0 text-sedikit-teks">{umur(o.dibuat, sekarang)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-redup">Tidak ada Lead yang dibiarkan lebih dari 24 jam.</p>
          )}
        </section>
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
