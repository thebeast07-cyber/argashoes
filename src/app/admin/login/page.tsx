import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { getUserSaatIni } from "@/lib/auth/current";
import { adaAkun } from "@/lib/auth/session";
import { FormLogin } from "./form-login";

export const metadata = { title: "Masuk admin · Argashoes" };

export const dynamic = "force-dynamic";

export default async function HalamanLogin() {
  if (await getUserSaatIni()) redirect("/admin");
  const akunPertama = !(await adaAkun(await getDb()));
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col px-4 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <Image src="/logo-argashoes.png" alt="Argashoes" width={90} height={72} priority className="mb-6 h-[72px] w-auto self-start" />
        <h1 className="mb-1 text-2xl font-bold">Masuk admin</h1>
        <p className="mb-6 text-sm text-redup">
          {akunPertama
            ? "Belum ada akun. Isi email kamu dan sandi awal; akun pemilik langsung dibuat."
            : "Pakai akun masing-masing, jangan berbagi password."}
        </p>
        <FormLogin />
        {/* Setelah keluar, admin mendarat di sini; jalan pulang ke toko harus ada tanpa mengetik alamat. */}
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-1 self-center px-2 text-sm font-semibold underline underline-offset-2">
          <IkonKembali ukuran={18} />
          Kembali ke toko
        </Link>
      </div>
    </main>
  );
}
