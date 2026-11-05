import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import { IkonChat, IkonKamera, IkonKardus } from "@/components/ikon";
import { daftarTautan, type IkonTautan } from "@/lib/domain/tautan";

export const metadata = {
  title: "Argashoes · semua tautan",
  description: "Katalog sepatu Argashoes, chat WhatsApp, dan Instagram.",
};

const IKON: Record<IkonTautan, ComponentType<SVGProps<SVGSVGElement> & { ukuran?: number }>> = {
  katalog: IkonKardus,
  chat: IkonChat,
  kamera: IkonKamera,
};

// Halaman tautan untuk bio Instagram/TikTok. Satu kolom saja, tanpa header dan keranjang toko:
// pengunjung datang dari HP dan hanya perlu memilih ke mana. Statis, tidak menyentuh database.
export default function HalamanLink() {
  const tautan = daftarTautan();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-[var(--sisi)] pb-10 pt-8 min-[900px]:pt-16">
      <header className="text-center">
        <h1 className="sr-only">Argashoes</h1>
        <Image src="/logo-argashoes.png" alt="" width={360} height={289} priority className="mx-auto h-auto w-[168px]" />
        <p className="mt-2 text-lg text-redup">Cek size dan stok, pesan lewat WhatsApp.</p>
      </header>

      <ul className="mt-8 flex flex-col gap-3">
        {tautan.map((t) => {
          const Ikon = IKON[t.ikon];
          return (
            <li key={t.kunci}>
              <a
                href={t.href}
                {...(t.tabBaru ? { target: "_blank", rel: "noreferrer" } : {})}
                className={`${t.utama ? "tombol-utama" : "tombol-garis"} min-h-16 w-full justify-start gap-3.5 px-4 py-3 text-left`}
              >
                <Ikon ukuran={26} className="shrink-0" />
                <span className="flex flex-col">
                  <span className="text-[18px] font-bold leading-tight">
                    {t.judul}
                    {t.tabBaru && <span className="sr-only"> (buka di tab baru)</span>}
                  </span>
                  {t.keterangan && <span className={`text-sm font-normal ${t.utama ? "text-white" : "text-redup"}`}>{t.keterangan}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
