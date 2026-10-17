"use client";

import { useState, useTransition } from "react";
import { buangBanner } from "../actions";

// Dua langkah supaya banner tidak terhapus karena salah ketuk.
export function TombolHapus({ id }: { id: string }) {
  const [yakin, setYakin] = useState(false);
  const [sedang, mulai] = useTransition();
  if (!yakin) {
    return (
      <button type="button" onClick={() => setYakin(true)} className="min-h-11 text-sm font-semibold text-bata underline underline-offset-2">
        Hapus banner ini
      </button>
    );
  }
  return (
    <div role="group" aria-label="Konfirmasi hapus" className="space-y-2 rounded-label border-[1.5px] border-bata bg-white p-3 text-sm">
      <p className="font-semibold">Hapus banner ini? Gambarnya ikut dihapus dan tidak bisa dikembalikan.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={sedang} onClick={() => mulai(() => buangBanner(id))} className="tombol-utama px-3 text-sm">
          {sedang ? "Menghapus..." : "Ya, hapus"}
        </button>
        <button type="button" disabled={sedang} onClick={() => setYakin(false)} className="tombol-garis px-3 text-sm">
          Batal
        </button>
      </div>
    </div>
  );
}
