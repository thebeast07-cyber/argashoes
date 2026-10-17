"use client";

import { useEffect, useRef } from "react";
import { IkonGalat } from "./ikon";

// Galat selalu ikon + teks, bukan warna saja. Warna bata tetap dipakai supaya terbaca sebagai masalah.

export function PesanGalat({
  id,
  umumkan = false,
  kecil = false,
  children,
}: {
  id?: string;
  /** role="alert" untuk pesan yang muncul setelah submit, bukan untuk galat per kolom. */
  umumkan?: boolean;
  kecil?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p id={id} role={umumkan ? "alert" : undefined} className={`flex items-start gap-1.5 font-semibold text-bata ${kecil ? "mt-1 text-sm" : "text-sm"}`}>
      <IkonGalat ukuran={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Ringkasan di dekat tombol simpan. Di HP pengguna sedang di bawah form saat menekan simpan,
 * jadi fokus dipindah ke kolom pertama yang salah (atau ke ringkasan ini kalau kolomnya tidak ketemu).
 * `pemicu` adalah objek state form: berubah tiap submit, jadi fokus pindah lagi walau jumlah galat sama.
 */
export function RingkasanGalat({ jumlah, pemicu }: { jumlah: number; pemicu: unknown }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (jumlah === 0) return;
    const kolom = ref.current?.closest("form")?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (kolom ?? ref.current)?.focus();
  }, [jumlah, pemicu]);
  if (jumlah === 0) return null;
  return (
    <p ref={ref} tabIndex={-1} role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-bata">
      <IkonGalat ukuran={18} className="mt-px shrink-0" />
      <span>{jumlah === 1 ? "Ada 1 isian yang perlu dibetulkan." : `Ada ${jumlah} isian yang perlu dibetulkan.`}</span>
    </p>
  );
}
