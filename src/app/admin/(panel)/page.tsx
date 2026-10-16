import Link from "next/link";
import { getDb } from "@/db";
import { wajibLogin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { jumlahUsulanMenunggu } from "@/lib/pengaturan/data";

export const metadata = { title: "Admin · Argashoes" };

export default async function BerandaAdmin({ searchParams }: { searchParams: { akses?: string } }) {
  const user = await wajibLogin();
  const usulanMenunggu = punyaIzin(user.peran, "usulan.putuskan") ? await jumlahUsulanMenunggu(await getDb()) : 0;
  return (
    <div className="space-y-4">
      {searchParams.akses === "ditolak" && (
        <p role="alert" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Halaman itu hanya untuk pemilik web.
        </p>
      )}
      <h1 className="text-xl font-bold">Halo, {user.nama}</h1>
      {usulanMenunggu > 0 && (
        <div className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <p className="font-semibold">{usulanMenunggu} usulan dari admin toko menunggu keputusanmu.</p>
          <Link href="/admin/pengaturan/usulan" className="tombol-utama">
            Periksa usulan
          </Link>
        </div>
      )}
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
