import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { riwayatPengaturan } from "@/lib/pengaturan/data";
import { ringkasRiwayat } from "@/lib/pengaturan/ringkasan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Riwayat perubahan · Argashoes" };

const BATAS = 50;

export default async function HalamanRiwayat() {
  await wajibIzin("pengaturan.ubah");
  const daftar = await riwayatPengaturan(await getDb(), BATAS);

  return (
    <div className="space-y-6">
      <Link href="/admin/pengaturan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Pengaturan
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Riwayat perubahan</h1>
        <p className="text-sm text-redup">
          Perubahan fee, rekening, dan pengaturan toko, baik yang diubah langsung maupun lewat usulan. Pemilik web dan admin toko melihat daftar yang
          sama. Catatan ini tidak bisa diedit atau dihapus.
        </p>
      </div>

      {daftar.length === 0 ? (
        <p className="text-sm text-redup">Belum ada perubahan yang tercatat.</p>
      ) : (
        <ol className="divide-y divide-tinta/15 border-y border-tinta/15">
          {daftar.map((r) => {
            const { judul, detail } = ringkasRiwayat(r);
            return (
              <li key={r.id} className="space-y-1 py-3">
                <p className="font-semibold">{judul}</p>
                {detail.length > 0 && (
                  <ul className="angka space-y-0.5 text-sm">
                    {detail.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-redup">
                  {r.oleh ?? "Pengubah tidak tercatat"} · {formatWaktuWib(r.waktu)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      {daftar.length === BATAS && <p className="text-sm text-redup">Menampilkan {BATAS} perubahan terakhir.</p>}
    </div>
  );
}
