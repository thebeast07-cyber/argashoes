"use client";

import { useEffect } from "react";
import { simpanKeranjang } from "@/lib/keranjang/use-keranjang";

// Tepat setelah checkout: keranjang dikosongkan dan WhatsApp dibuka sekali (PRD: order tercatat, lalu diarahkan ke WA).
// Penanda di sessionStorage mencegah dibuka ulang saat pembeli kembali ke halaman ini dengan tombol Back.
export function LanjutKeWa({ kode, href }: { kode: string; href: string }) {
  useEffect(() => {
    simpanKeranjang([]);
    const penanda = `argashoes_wa_${kode}`;
    try {
      if (sessionStorage.getItem(penanda)) return;
      sessionStorage.setItem(penanda, "1");
    } catch {
      // Tanpa sessionStorage tetap diteruskan; tombol Buka WhatsApp ada di halaman.
    }
    window.location.assign(href);
  }, [kode, href]);
  return null;
}
