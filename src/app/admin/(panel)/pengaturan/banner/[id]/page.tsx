import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { ambilBanner } from "@/lib/banner/data";
import { inputWaktuWib, LABEL_STATUS_BANNER, statusBanner } from "@/lib/domain/banner";
import { ubahAktifBanner } from "../actions";
import { FormBanner } from "../form-banner";
import { TombolHapus } from "./tombol-hapus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ubah banner · Argashoes" };

export default async function HalamanUbahBanner({ params }: { params: { id: string } }) {
  await wajibIzin("banner.kelola");
  const b = /^[0-9a-f-]{36}$/.test(params.id) ? await ambilBanner(await getDb(), params.id) : null;
  if (!b) notFound();
  const st = statusBanner(b, new Date());

  return (
    <div className="space-y-4">
      <Link href="/admin/pengaturan/banner" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Banner promo
      </Link>
      <h1 className="break-words text-2xl font-bold">{b.judul}</h1>

      <div className="flex flex-wrap items-center gap-3 rounded-label border border-tinta/55 bg-white p-3 text-sm">
        <p className="flex-1">
          Status: <span className="font-semibold">{LABEL_STATUS_BANNER[st]}</span>
        </p>
        <form action={ubahAktifBanner.bind(null, b.id, !b.aktif)}>
          <button type="submit" className="tombol-garis px-3 text-sm">
            {b.aktif ? "Matikan banner" : "Nyalakan lagi"}
          </button>
        </form>
      </div>

      <FormBanner
        id={b.id}
        awal={{
          judul: b.judul,
          keterangan: b.keterangan ?? "",
          tautan: b.tautan ?? "",
          teksTombol: b.teksTombol ?? "",
          mulai: inputWaktuWib(b.mulai),
          selesai: inputWaktuWib(b.selesai),
          gambarUrl: b.gambarUrl,
        }}
      />

      <TombolHapus id={b.id} />
    </div>
  );
}
