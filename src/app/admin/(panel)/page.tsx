import { wajibLogin } from "@/lib/auth/current";

export const metadata = { title: "Admin · Argashoes" };

export default async function BerandaAdmin({ searchParams }: { searchParams: { akses?: string } }) {
  const user = await wajibLogin();
  return (
    <div className="space-y-4">
      {searchParams.akses === "ditolak" && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Halaman itu hanya untuk pemilik web.
        </p>
      )}
      <h1 className="text-xl font-bold">Halo, {user.nama}</h1>
      <p className="text-sm text-neutral-600">
        Ringkasan order, produk, dan stok akan muncul di sini setelah modul-modulnya dibangun.
      </p>
    </div>
  );
}
