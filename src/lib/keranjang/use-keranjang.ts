"use client";

import { useCallback, useEffect, useState } from "react";
import { parseKeranjang, type ItemKeranjang } from "@/lib/domain/keranjang";

// Keranjang di localStorage. Semua komponen yang memakai hook ini ikut diperbarui lewat event,
// termasuk tab lain (event "storage"). localStorage bisa dimatikan browser: tanpa itu keranjang hanya hidup di halaman ini.

const KUNCI = "argashoes_keranjang";
const EVENT = "argashoes:keranjang";

function baca(): ItemKeranjang[] {
  try {
    return parseKeranjang(localStorage.getItem(KUNCI));
  } catch {
    return [];
  }
}

export function simpanKeranjang(items: ItemKeranjang[]) {
  try {
    if (items.length === 0) localStorage.removeItem(KUNCI);
    else localStorage.setItem(KUNCI, JSON.stringify(items));
  } catch {
    // Mode privat atau penyimpanan penuh: tetap lanjut, isi keranjang ikut di event.
  }
  window.dispatchEvent(new CustomEvent<ItemKeranjang[]>(EVENT, { detail: items }));
}

/** `siap` false sampai localStorage terbaca, supaya halaman tidak sempat menampilkan "keranjang kosong". */
export function useKeranjang() {
  const [items, setItems] = useState<ItemKeranjang[]>([]);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setItems(baca());
    setSiap(true);
    const dariEvent = (e: Event) => setItems((e as CustomEvent<ItemKeranjang[]>).detail);
    const dariTabLain = (e: StorageEvent) => {
      if (e.key === KUNCI) setItems(baca());
    };
    window.addEventListener(EVENT, dariEvent);
    window.addEventListener("storage", dariTabLain);
    return () => {
      window.removeEventListener(EVENT, dariEvent);
      window.removeEventListener("storage", dariTabLain);
    };
  }, []);

  const ubah = useCallback((f: (lama: ItemKeranjang[]) => ItemKeranjang[]) => simpanKeranjang(f(baca())), []);
  return { items, siap, ubah };
}

const KUNCI_UTM = "argashoes_utm";

/** Sumber kunjungan pertama (link berlabel UTM di Instagram, status WA, Google Maps) disimpan selama sesi tab ini. */
export function catatUtm() {
  try {
    const sumber = new URLSearchParams(location.search).get("utm_source")?.trim().slice(0, 40);
    if (sumber && !sessionStorage.getItem(KUNCI_UTM)) sessionStorage.setItem(KUNCI_UTM, sumber);
  } catch {
    // sessionStorage tidak tersedia: sumber kunjungan tidak tercatat.
  }
}

export function bacaUtm(): string {
  try {
    return sessionStorage.getItem(KUNCI_UTM) ?? "";
  } catch {
    return "";
  }
}
