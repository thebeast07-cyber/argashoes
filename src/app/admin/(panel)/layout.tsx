import { wajibLogin } from "@/lib/auth/current";
import { LABEL_PERAN, punyaIzin } from "@/lib/auth/roles";
import { logout } from "../actions";
import { NavBawah } from "./nav-bawah";

// Shell admin untuk HP: header ringkas + tab bawah.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibLogin();

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <header className="flex items-center justify-between border-b border-tinta/20 px-4 py-2">
        <div className="text-sm">
          <span className="font-semibold">{user.nama}</span>
          <span className="text-redup"> · {LABEL_PERAN[user.peran]}</span>
        </div>
        <form action={logout}>
          <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta">
            Keluar
          </button>
        </form>
      </header>
      <main className="px-4 py-4">{children}</main>
      <NavBawah pemilik={punyaIzin(user.peran, "akun.kelola")} />
    </div>
  );
}
