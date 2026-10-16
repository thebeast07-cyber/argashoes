import { redirect } from "next/navigation";
import { getUserSaatIni } from "@/lib/auth/current";
import { FormLogin } from "./form-login";

export const metadata = { title: "Masuk admin · Argashoes" };

export default async function HalamanLogin() {
  if (await getUserSaatIni()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">Masuk admin</h1>
      <p className="mb-6 text-sm text-neutral-600">Pakai akun masing-masing, jangan berbagi password.</p>
      <FormLogin />
    </main>
  );
}
