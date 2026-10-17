import Link from "next/link";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { periodeFee } from "@/lib/domain/fee";
import { formatTanggalWib, labelBulan, statusBayar } from "@/lib/domain/laporan-fee";
import { formatRupiah } from "@/lib/domain/produk";
import { ringkasanSemuaBulan } from "@/lib/fee/data";

export const metadata = { title: "Laporan fee · Admin Argashoes" };
export const dynamic = "force-dynamic";

export default async function LaporanFee() {
  await wajibIzin("fee.laporan");
  const sekarang = new Date();
  const bulanIni = periodeFee(sekarang);
  const semua = await ringkasanSemuaBulan(await getDb(), sekarang);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Laporan fee</h1>
        <p className="mt-1 text-sm text-redup">Dari order Dikirim atau Selesai yang punya nomor resi, per bulan tanggal Dikirim (WIB).</p>
      </div>
      <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
        {semua.map((b) => {
          const st = statusBayar(b.pembayaran, b.fee);
          return (
            <li key={b.bulan}>
              <Link href={`/admin/fee/${b.bulan}`} className="block py-3 hover:bg-white">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">
                    {labelBulan(b.bulan)}
                    {b.bulan === bulanIni && <span className="font-normal text-redup"> · berjalan</span>}
                  </span>
                  <span className="angka shrink-0 font-bold">{formatRupiah(b.fee)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="angka text-redup">
                    {b.pasang} pasang dari {b.order} order
                  </span>
                  {b.fee > 0 &&
                    (st.jenis === "lunas" ? (
                      <span className="font-semibold">Dibayar {formatTanggalWib(st.dibayarPada)}</span>
                    ) : st.jenis === "selisih" ? (
                      <span className="font-bold text-sedikit-teks">Dibayar, selisih {formatRupiah(st.selisih)}</span>
                    ) : (
                      <span className="font-bold text-sedikit-teks">Belum dibayar</span>
                    ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {semua.length === 1 && semua[0].fee === 0 && (
        <p className="text-sm text-redup">Belum ada order yang Dikirim. Fee muncul di sini begitu order ditandai Dikirim dengan nomor resi.</p>
      )}
    </div>
  );
}
