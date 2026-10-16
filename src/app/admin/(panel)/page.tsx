import Link from "next/link";
import { wajibLogin } from "@/lib/auth/current";

export const metadata = { title: "Admin · Argashoes" };

export default async function BerandaAdmin({ searchParams }: { searchParams: { akses?: string } }) {
  const user = await wajibLogin();
  return (
    <div className="space-y-4">
      {searchParams.akses === "ditolak" && (
        <p role="alert" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Halaman itu hanya untuk pemilik web.
        </p>
      )}
      <h1 className="text-xl font-bold">Halo, {user.nama}</h1>
      <p className="text-sm text-redup">
        Ringkasan order dan size yang habis akan tampil di sini setelah modul order selesai. Untuk sekarang, kelola katalog lewat{" "}
        <Link href="/admin/produk" className="font-semibold text-tinta underline underline-offset-2">
          Produk
        </Link>
        .
      </p>
    </div>
  );
}
