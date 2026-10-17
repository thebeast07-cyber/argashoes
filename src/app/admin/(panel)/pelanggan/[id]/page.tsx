import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonChat, IkonKembali } from "@/components/ikon";
import { LabelStatus } from "@/components/label-status";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { formatRupiah } from "@/lib/domain/produk";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { ambilPelanggan } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DetailPelanggan({ params }: { params: { id: string } }) {
  await wajibIzin("pelanggan.lihat");
  if (!UUID.test(params.id)) notFound();
  const p = await ambilPelanggan(await getDb(), params.id);
  if (!p) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/pelanggan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Pelanggan
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{p.nama}</h1>
        <p className="angka text-sm">+{p.noWa}</p>
        {p.alamatTerakhir && <p className="whitespace-pre-line text-sm">{p.alamatTerakhir}</p>}
        {p.persetujuanPada && <p className="text-sm text-redup">Setuju data dipakai: {formatWaktuWib(p.persetujuanPada)}</p>}
      </div>
      <a href={`https://wa.me/${p.noWa}`} target="_blank" rel="noreferrer" className="tombol-garis">
        <IkonChat ukuran={18} />
        Chat pelanggan
      </a>
      <section aria-labelledby="judul-riwayat" className="space-y-2">
        <h2 id="judul-riwayat" className="text-lg font-bold">
          Riwayat order ({p.riwayat.length})
        </h2>
        <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
          {p.riwayat.map((o) => (
            <li key={o.kode}>
              <Link href={`/admin/order/${o.kode}`} className="flex items-center justify-between gap-3 py-3 hover:bg-white">
                <span>
                  <span className="sempit angka block font-bold">{o.kode}</span>
                  <span className="text-sm text-redup">{formatWaktuWib(o.dibuat)}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <LabelStatus status={o.status} />
                  <span className="angka text-sm">{formatRupiah(o.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
