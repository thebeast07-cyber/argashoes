"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IkonKardus, IkonKartuNama, IkonNota, IkonPengaturan, IkonSepatu } from "@/components/ikon";

const SEMUA_TAB = [
  { href: "/admin", label: "Beranda", Ikon: IkonKardus, pemilikSaja: false },
  { href: "/admin/produk", label: "Produk", Ikon: IkonSepatu, pemilikSaja: false },
  { href: "/admin/order", label: "Order", Ikon: IkonNota, pemilikSaja: false },
  { href: "/admin/pengaturan", label: "Pengaturan", Ikon: IkonPengaturan, pemilikSaja: false },
  { href: "/admin/akun", label: "Akun", Ikon: IkonKartuNama, pemilikSaja: true },
];

/** usulanMenunggu: hanya diisi untuk pemilik, yang memutuskan usulan. */
export function NavBawah({ pemilik, usulanMenunggu = 0 }: { pemilik: boolean; usulanMenunggu?: number }) {
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
                <span className="relative">
                  <Ikon />
                  {href === "/admin/pengaturan" && usulanMenunggu > 0 && (
                    <span className="angka absolute -right-3 -top-1.5 min-w-5 rounded-label bg-bata px-1 text-center text-[11px] font-bold leading-4 text-white">
                      {usulanMenunggu}
                      <span className="sr-only"> usulan menunggu</span>
                    </span>
                  )}
                </span>
                <span className={aktif ? "underline decoration-2 underline-offset-4" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
