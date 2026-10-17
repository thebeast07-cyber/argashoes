"use client";

import { useRef, useState } from "react";
import { Gambar } from "@/components/gambar";

// Di HP foto digeser (scroll-snap) dengan penanda posisi; mulai 900px ada deret foto kecil untuk lompat.
export function Galeri({ foto, alt }: { foto: string[]; alt: string }) {
  const [aktif, setAktif] = useState(0);
  const jalur = useRef<HTMLUListElement>(null);

  if (foto.length <= 1) return <Gambar src={foto[0] ?? null} alt={alt} eager className="aspect-square w-full" />;

  function lompat(i: number) {
    const el = jalur.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth });
    setAktif(i);
  }

  return (
    <div>
      <div className="relative">
        <ul
          ref={jalur}
          tabIndex={0}
          aria-label={`Foto produk, geser untuk melihat ${foto.length} foto`}
          onScroll={(e) => setAktif(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {foto.map((src, i) => (
            <li key={src} className="w-full shrink-0 snap-start">
              <Gambar src={src} alt={`${alt}, foto ${i + 1} dari ${foto.length}`} eager={i === 0} className="aspect-square w-full" />
            </li>
          ))}
        </ul>
        <p aria-hidden="true" className="angka absolute bottom-3 right-3 rounded-label bg-tinta px-2 py-1 text-sm font-bold text-kertas">
          {aktif + 1}/{foto.length}
        </p>
      </div>
      <ul aria-label="Pilih foto" className="mt-2.5 hidden grid-cols-6 gap-2 min-[900px]:grid">
        {foto.map((src, i) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => lompat(i)}
              aria-label={`Lihat foto ${i + 1}`}
              aria-current={i === aktif ? "true" : undefined}
              className={`block w-full overflow-hidden rounded-label border-[1.5px] ${i === aktif ? "border-tinta" : "border-transparent"}`}
            >
              <Gambar src={src} alt="" className="aspect-square w-full" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
