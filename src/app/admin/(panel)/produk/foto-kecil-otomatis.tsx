"use client";

import { useEffect, useState } from "react";
import { lengkapiFotoKecil } from "./actions";

// Foto yang diunggah sebelum ada versi kecil dikerjakan otomatis selama halaman Produk terbuka, beberapa foto per
// panggilan. Tidak ada yang perlu diklik; kalau halaman ditutup, sisanya lanjut saat halaman ini dibuka lagi.
export function FotoKecilOtomatis({ awal }: { awal: number }) {
  const [sisa, setSisa] = useState(awal);
  const [gagal, setGagal] = useState(0);

  useEffect(() => {
    let batal = false;
    (async () => {
      const lewati: string[] = [];
      for (;;) {
        let hasil;
        try {
          hasil = await lengkapiFotoKecil(lewati);
        } catch {
          return;
        }
        if (batal) return;
        lewati.push(...hasil.gagal);
        setGagal(lewati.length);
        setSisa(hasil.sisa);
        if (hasil.sisa === 0 || (hasil.dibuat === 0 && hasil.gagal.length === 0)) return;
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  if (sisa > 0) {
    return (
      <p role="status" className="text-sm text-redup">
        Menyiapkan foto katalog versi ringan untuk foto lama, {sisa} foto lagi. Halaman ini tetap bisa dipakai.
      </p>
    );
  }
  return (
    <p role="status" className="text-sm text-redup">
      {gagal > 0
        ? `Foto katalog versi ringan sudah disiapkan, kecuali ${gagal} foto yang tetap tampil dengan ukuran aslinya.`
        : "Foto katalog versi ringan sudah siap."}
    </p>
  );
}
