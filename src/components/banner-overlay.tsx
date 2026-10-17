"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { IkonTutup } from "@/components/ikon";
import { perluTampilOverlay } from "@/lib/domain/banner";

// Overlay promo di beranda. Gambar potret untuk HP, lanskap mulai 768px; gambar tampil utuh tanpa dipotong.
// Sekali ditutup, banner yang sama tidak muncul lagi selama 24 jam di browser itu (localStorage, boleh gagal).
// Sudut membulat dan tombol tutup bulat mengikuti pengecualian panel kaca di DESIGN.md: lapisan di atas halaman, bukan label kardus.

export type IsiOverlay = { id: string; judul: string; gambarPotret: string; gambarLanskap: string; tautan: string | null };

const kunci = (id: string) => `argashoes:banner-ditutup:${id}`;

export function BannerOverlay({ banner }: { banner: IsiOverlay }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let ditutup: number | null = null;
    try {
      const nilai = localStorage.getItem(kunci(banner.id));
      ditutup = nilai === null ? null : Number(nilai);
    } catch {}
    if (perluTampilOverlay(ditutup, Date.now())) dialog.current?.showModal();
  }, [banner.id]);

  function catatDitutup() {
    try {
      localStorage.setItem(kunci(banner.id), String(Date.now()));
    } catch {}
  }

  const gambar = (
    <picture>
      <source media="(min-width: 768px)" srcSet={banner.gambarLanskap} />
      {/* Sudah dikecilkan saat diunggah; ukuran asli tidak disimpan, jadi tanpa next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.gambarPotret} alt={banner.judul} className="block max-h-[80dvh] w-auto max-w-full rounded-xl object-contain" />
    </picture>
  );

  return (
    <dialog
      ref={dialog}
      aria-label={banner.judul}
      onClose={catatDitutup}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 backdrop:bg-tinta/50 backdrop:backdrop-blur-sm"
    >
      <div className="relative mx-auto w-fit max-w-[92vw] md:max-w-[min(92vw,1100px)]">
        {/* Fokus awal di tombol tutup (showModal memakai autofocus), lalu Tab ke gambar. Ditaruh sebelum gambar supaya urutan Tab ikut. */}
        <button
          type="button"
          autoFocus
          onClick={() => dialog.current?.close()}
          aria-label="Tutup promo"
          className="absolute -right-2 -top-2 inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-tinta bg-white text-tinta shadow-md hover:bg-kertas"
        >
          <IkonTutup ukuran={20} />
        </button>
        {banner.tautan ? (
          banner.tautan.startsWith("/") ? (
            <Link href={banner.tautan} onClick={() => dialog.current?.close()} className="block">
              {gambar}
            </Link>
          ) : (
            <a href={banner.tautan} rel="noopener noreferrer" onClick={() => dialog.current?.close()} className="block">
              {gambar}
            </a>
          )
        ) : (
          gambar
        )}
      </div>
    </dialog>
  );
}
