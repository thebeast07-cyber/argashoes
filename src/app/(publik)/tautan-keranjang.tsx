"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IkonKeranjang } from "@/components/ikon";
import { totalKeranjang } from "@/lib/domain/keranjang";
import { catatUtm, useKeranjang } from "@/lib/keranjang/use-keranjang";

export function TautanKeranjang() {
  const { items } = useKeranjang();
  const { pasang } = totalKeranjang(items);
  // Header ada di semua halaman publik, jadi di sinilah sumber kunjungan (utm_source) ditangkap.
  useEffect(catatUtm, []);

  return (
    <Link
      href="/keranjang"
      aria-label={`Keranjang, ${pasang} pasang`}
      className="inline-flex min-h-11 items-center gap-2 rounded-kontrol border-[1.5px] border-tinta bg-white px-3 font-bold hover:bg-kertas-gelap"
    >
      <IkonKeranjang />
      {/* Di bawah 360px tulisannya disembunyikan; tanpa ini header luber di layar 320px. */}
      <span aria-hidden="true" className="max-[359px]:hidden">
        Keranjang
      </span>
      <span aria-hidden="true" className="angka min-w-[22px] rounded-label bg-tinta px-1.5 text-center text-[13px] leading-[22px] text-kertas">
        {pasang}
      </span>
    </Link>
  );
}
