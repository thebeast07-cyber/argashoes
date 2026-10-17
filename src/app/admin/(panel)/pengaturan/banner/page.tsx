import Link from "next/link";
import { IkonKembali, IkonTambah } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { semuaBanner } from "@/lib/banner/data";
import { LABEL_STATUS_BANNER, statusBanner, urutBannerAdmin, type StatusBanner } from "@/lib/domain/banner";
import { formatWaktuWib } from "@/lib/domain/waktu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banner promo · Argashoes" };

// Status selalu tertulis; warna hanya penguat (pola sama dengan label status order).
const GAYA: Record<StatusBanner, string> = {
  tayang: "border-tinta bg-tinta text-kertas",
  dijadwalkan: "border-tinta bg-white text-tinta",
  nonaktif: "border-habis/60 bg-kertas text-habis",
  selesai: "border-habis/60 bg-kertas text-habis",
};

export default async function HalamanBanner({ searchParams }: { searchParams: { tersimpan?: string; dihapus?: string } }) {
  await wajibIzin("banner.kelola");
  const sekarang = new Date();
  const daftar = urutBannerAdmin(await semuaBanner(await getDb()), sekarang);

  return (
    <div className="space-y-4">
      <Link href="/admin/pengaturan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Pengaturan
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Banner promo</h1>
        <Link href="/admin/pengaturan/banner/baru" className="tombol-garis px-3 text-sm">
          <IkonTambah ukuran={18} />
          Banner baru
        </Link>
      </div>
      <p className="text-sm text-redup">Banner muncul sebagai gambar di tengah layar saat pembeli membuka beranda, selama jadwalnya, lalu berhenti sendiri. Kalau ada dua yang jadwalnya bertabrakan, yang mulainya paling baru yang tampil.</p>

      {(searchParams.tersimpan || searchParams.dihapus) && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          {searchParams.tersimpan ? "Banner tersimpan." : "Banner dihapus."}
        </p>
      )}

      {daftar.length === 0 ? (
        <p className="rounded-label border border-tinta/55 bg-white p-4 text-sm">Belum ada banner. Siapkan dari sekarang, banner baru tayang sesuai jadwal yang kamu isi.</p>
      ) : (
        <ul className="divide-y divide-tinta/20 rounded-label border border-tinta/55 bg-white">
          {daftar.map((b) => {
            const st = statusBanner(b, sekarang);
            return (
              <li key={b.id}>
                <Link href={`/admin/pengaturan/banner/${b.id}`} className="block space-y-1 p-3 hover:bg-kertas">
                  <span className={`sempit inline-block rounded-label border-[1.5px] px-1.5 py-0.5 text-xs font-bold leading-none ${GAYA[st]}`}>{LABEL_STATUS_BANNER[st]}</span>
                  <span className="block break-words font-semibold">{b.judul}</span>
                  <span className="block text-sm text-redup">
                    {formatWaktuWib(b.mulai)} sampai {formatWaktuWib(b.selesai)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
