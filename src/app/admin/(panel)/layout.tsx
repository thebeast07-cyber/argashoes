import Link from "next/link";
import { wajibLogin } from "@/lib/auth/current";
import { LABEL_PERAN, punyaIzin } from "@/lib/auth/roles";
import { logout } from "../actions";

// Shell admin untuk HP: header ringkas + tab bawah.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibLogin();
  const tabs = [
    { href: "/admin", label: "Beranda" },
    ...(punyaIzin(user.peran, "akun.kelola") ? [{ href: "/admin/akun", label: "Akun" }] : []),
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="font-semibold">{user.nama}</p>
          <p className="text-xs text-neutral-500">{LABEL_PERAN[user.peran]}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-neutral-600 underline">
            Keluar
          </button>
        </form>
      </header>
      <main className="px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white">
        <ul className="mx-auto flex max-w-md">
          {tabs.map((t) => (
            <li key={t.href} className="flex-1">
              <Link href={t.href} className="block py-3 text-center text-sm font-medium">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
