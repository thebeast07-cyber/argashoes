import Link from "next/link";
import { IkonCari, IkonKeluarKardus, IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { umur } from "@/lib/domain/order-admin";
import { daftarPelanggan, PER_HALAMAN_ORDER } from "@/lib/orders/data";

export const metadata = { title: "Pelanggan · Admin Argashoes" };
export const dynamic = "force-dynamic";

export default async function HalamanPelanggan({ searchParams }: { searchParams: { q?: string; hal?: string } }) {
  await wajibIzin("pelanggan.lihat");
  const q = searchParams.q?.trim().slice(0, 60) || undefined;
  const halaman = Math.max(1, Number(searchParams.hal) || 1);
  const { items, total } = await daftarPelanggan(await getDb(), { q, halaman });
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN_ORDER));
  const sekarang = new Date();
  const link = (hal: number) => `/admin/pelanggan?${new URLSearchParams({ ...(q ? { q } : {}), hal: String(hal) })}`;

  return (
    <div className="space-y-4">
      <Link href="/admin/order" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Order
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Pelanggan</h1>
        <a href="/admin/pelanggan/ekspor" className="tombol-garis px-3 text-sm">
          <IkonKeluarKardus ukuran={18} />
          Ekspor CSV
        </a>
      </div>
      <form role="search" action="/admin/pelanggan" className="space-y-2">
        <label htmlFor="q" className="label-form">
          Cari nama atau nomor WA
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" type="search" defaultValue={q} className="input" autoComplete="off" />
          <button type="submit" className="tombol-garis shrink-0 px-3" aria-label="Cari">
            <IkonCari />
          </button>
        </div>
      </form>
      {items.length === 0 ? (
        <div className="rounded-label border-[1.5px] border-dashed border-tinta/55 p-5 text-sm">
          <p className="font-semibold">{q ? "Tidak ada pelanggan yang cocok." : "Belum ada pelanggan."}</p>
          {!q && <p className="mt-1 text-redup">Pelanggan tercatat otomatis saat checkout pertama.</p>}
        </div>
      ) : (
        <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pelanggan/${p.id}`} className="block py-3 hover:bg-white">
                <p className="font-semibold">{p.nama}</p>
                <p className="angka text-sm text-redup">
                  +{p.noWa} · {p.jumlahOrder} order, {p.orderDikirim} dikirim
                  {p.orderTerakhir && ` · terakhir ${umur(new Date(p.orderTerakhir), sekarang)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalHalaman > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {halaman > 1 ? <Link href={link(halaman - 1)} className="tombol-garis">Sebelumnya</Link> : <span />}
          <span className="angka text-redup">Halaman {halaman} dari {totalHalaman}</span>
          {halaman < totalHalaman ? <Link href={link(halaman + 1)} className="tombol-garis">Berikutnya</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
