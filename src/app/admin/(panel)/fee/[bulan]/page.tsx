import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonKeluarKardus, IkonKembali } from "@/components/ikon";
import { LabelStatus } from "@/components/label-status";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { periodeFee } from "@/lib/domain/fee";
import { formatTanggalWib, geserBulan, hariIniWib, isBulan, labelBulan, statusBayar } from "@/lib/domain/laporan-fee";
import { formatRupiah } from "@/lib/domain/produk";
import { rekapBulan } from "@/lib/fee/data";
import { BatalkanBayar, FormBayar } from "./bayar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { bulan: string } }) {
  return { title: isBulan(params.bulan) ? `Fee ${labelBulan(params.bulan)} · Admin Argashoes` : "Laporan fee" };
}

export default async function FeeBulan({ params }: { params: { bulan: string } }) {
  await wajibIzin("fee.laporan");
  if (!isBulan(params.bulan)) notFound();
  const sekarang = new Date();
  const bulanIni = periodeFee(sekarang);
  const r = await rekapBulan(await getDb(), params.bulan);
  const st = statusBayar(r.pembayaran, r.totalFee);
  const berjalan = params.bulan === bulanIni;
  const sebelum = geserBulan(params.bulan, -1);
  const sesudah = geserBulan(params.bulan, 1);

  return (
    <div className="space-y-5">
      <Link href="/admin/fee" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Laporan fee
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{labelBulan(params.bulan)}</h1>
        {berjalan && <p className="text-sm text-redup">Bulan berjalan: angka masih bisa bertambah sampai akhir bulan.</p>}
      </div>

      <div className="rounded-label border-[1.5px] border-tinta bg-white p-4">
        <p className="text-sm text-redup">Total fee</p>
        <p className="angka text-3xl font-extrabold">{formatRupiah(r.totalFee)}</p>
        <p className="angka mt-1 text-sm">
          {r.jumlahPasang} pasang dari {r.orders.length} order
        </p>
      </div>

      {r.totalFee > 0 && (
        <section aria-labelledby="judul-bayar" className="space-y-2">
          <h2 id="judul-bayar" className="text-lg font-bold">
            Pembayaran
          </h2>
          {st.jenis === "lunas" && (
            <>
              <p className="font-semibold">
                Sudah dibayar {formatTanggalWib(st.dibayarPada)}
                {r.pembayaran?.catatan && <span className="font-normal text-redup"> · {r.pembayaran.catatan}</span>}
              </p>
              <BatalkanBayar bulan={params.bulan} />
            </>
          )}
          {st.jenis === "selisih" && (
            <>
              <p role="status" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
                Ditandai dibayar {formatRupiah(st.dibayar)} pada {formatTanggalWib(st.dibayarPada)}, tapi rekap sekarang {formatRupiah(r.totalFee)} (selisih{" "}
                {formatRupiah(st.selisih)}). Biasanya karena ada order yang Dikirim setelah ditandai.
              </p>
              <FormBayar bulan={params.bulan} hariIni={hariIniWib(sekarang)} ulang />
            </>
          )}
          {st.jenis === "belum" && <FormBayar bulan={params.bulan} hariIni={hariIniWib(sekarang)} ulang={false} />}
        </section>
      )}

      <section aria-labelledby="judul-pendukung" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="judul-pendukung" className="text-lg font-bold">
            Order pendukung
          </h2>
          {r.orders.length > 0 && (
            <a href={`/admin/fee/${params.bulan}/ekspor`} className="tombol-garis px-3 text-sm">
              <IkonKeluarKardus ukuran={18} />
              Ekspor CSV
            </a>
          )}
        </div>
        {r.orders.length === 0 ? (
          <p className="text-sm text-redup">Belum ada order yang Dikirim di bulan ini.</p>
        ) : (
          <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
            {r.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/order/${o.kode}`} className="block py-3 hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="sempit angka font-bold">{o.kode}</span>
                    <span className="angka font-bold">{formatRupiah(o.fee)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="text-redup">
                      {o.nama} · dikirim {formatTanggalWib(o.dikirimPada)} · {o.pasang} pasang
                    </span>
                    <LabelStatus status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav aria-label="Bulan lain" className="flex items-center justify-between gap-3 text-sm">
        <Link href={`/admin/fee/${sebelum}`} className="tombol-garis">
          {labelBulan(sebelum)}
        </Link>
        {sesudah <= bulanIni ? (
          <Link href={`/admin/fee/${sesudah}`} className="tombol-garis">
            {labelBulan(sesudah)}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
