import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { wajibIzin } from "@/lib/auth/current";
import { FormBanner } from "../form-banner";

export const metadata = { title: "Banner baru · Argashoes" };

export default async function HalamanBannerBaru() {
  await wajibIzin("banner.kelola");
  return (
    <div className="space-y-4">
      <Link href="/admin/pengaturan/banner" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Banner promo
      </Link>
      <h1 className="text-2xl font-bold">Banner baru</h1>
      <FormBanner id={null} awal={{ judul: "", tautan: "", mulai: "", selesai: "", gambarPotret: null, gambarLanskap: null }} />
    </div>
  );
}
