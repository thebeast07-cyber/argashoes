import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { asistenAktif } from "@/lib/asisten/gemini";
import { wajibIzin } from "@/lib/auth/current";
import { FormTanya } from "./form-tanya";

export const metadata = { title: "Tanya stok · Admin Argashoes" };
export const dynamic = "force-dynamic";

export default async function HalamanTanya() {
  await wajibIzin("produk.kelola");
  return (
    <div className="space-y-4">
      <Link href="/admin/produk" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Produk
      </Link>
      <h1 className="text-2xl font-bold">Tanya stok</h1>
      <p className="text-sm text-redup">
        Tanya pakai bahasa sehari-hari. Angka diambil langsung dari data stok. Asisten hanya membaca, tidak mengubah apa pun.
      </p>
      {asistenAktif() ? (
        <FormTanya />
      ) : (
        <div className="space-y-2 rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          <p className="font-semibold">Asisten belum aktif.</p>
          <p>Pemilik perlu mengisi GEMINI_API_KEY di Environment Variables Vercel, lalu redeploy.</p>
          <Link href="/admin/produk" className="font-semibold underline underline-offset-2">
            Cari stok lewat daftar produk
          </Link>
        </div>
      )}
    </div>
  );
}
