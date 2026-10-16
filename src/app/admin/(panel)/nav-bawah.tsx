"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IkonKardus, IkonKartuNama, IkonSepatu } from "@/components/ikon";

const SEMUA_TAB = [
  { href: "/admin", label: "Beranda", Ikon: IkonKardus, pemilikSaja: false },
  { href: "/admin/produk", label: "Produk", Ikon: IkonSepatu, pemilikSaja: false },
  { href: "/admin/akun", label: "Akun", Ikon: IkonKartuNama, pemilikSaja: true },
];

export function NavBawah({ pemilik }: { pemilik: boolean }) {
  const path = usePathname();
  const tabs = SEMUA_TAB.filter((t) => pemilik || !t.pemilikSaja);
  return (
    <nav aria-label="Menu admin" className="fixed inset-x-0 bottom-0 z-10 border-t-[1.5px] border-tinta bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map(({ href, label, Ikon }) => {
          const aktif = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={aktif ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  aktif ? "text-bata" : "text-redup hover:text-tinta"
                }`}
              >
                <Ikon />
                <span className={aktif ? "underline decoration-2 underline-offset-4" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
