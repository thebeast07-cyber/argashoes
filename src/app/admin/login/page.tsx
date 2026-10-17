import { redirect } from "next/navigation";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">Masuk admin</h1>
      <p className="mb-6 text-sm text-redup">
        {akunPertama
          ? "Belum ada akun. Isi email kamu dan sandi awal; akun pemilik langsung dibuat."
          : "Pakai akun masing-masing, jangan berbagi password."}
      </p>
      <FormLogin />
    </main>
  );
}
