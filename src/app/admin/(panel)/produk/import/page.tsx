import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { wajibIzin } from "@/lib/auth/current";
import { FormImport } from "./form-import";

export const metadata = { title: "Import CSV · Admin Argashoes" };

export default async function HalamanImport() {
  await wajibIzin("produk.kelola");
  return (
    <div className="space-y-4">
      <Link href="/admin/produk" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Produk
      </Link>
      <h1 className="text-2xl font-bold">Import CSV</h1>
      <p className="text-sm text-redup">File diperiksa dulu. Tidak ada yang tersimpan sebelum kamu menekan Simpan semua perubahan.</p>
      <FormImport />
    </div>
  );
}
