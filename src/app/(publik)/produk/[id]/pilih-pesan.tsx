"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tambahItem } from "@/lib/domain/keranjang";
import { formatRupiah } from "@/lib/domain/produk";
import { labelStok, statusStok, type AmbangStok } from "@/lib/domain/stok";
import { useKeranjang } from "@/lib/keranjang/use-keranjang";

const GAYA = {
  ready: "border-tinta bg-white",
  sisa_sedikit: "border-sedikit-teks bg-sedikit-latar text-sedikit-teks",
  habis: "border-habis/60 bg-kertas text-habis",
} as const;

export function PilihPesan({
  produk,
  varian,
  ambang,
  sizeAwal,
}: {
  produk: { id: string; nama: string; brand: string; harga: number; foto: string | null };
  varian: { size: string; stok: number }[];
  ambang: AmbangStok;
  sizeAwal?: string;
}) {
  const router = useRouter();
  const { ubah } = useKeranjang();
  const bolehAwal = varian.some((v) => v.size === sizeAwal && v.stok > 0);
  const [dipilih, setDipilih] = useState<string | null>(bolehAwal ? sizeAwal! : null);
  const stok = dipilih ? (varian.find((v) => v.size === dipilih)?.stok ?? 0) : null;
  const sisaSedikit = stok !== null && statusStok(stok, ambang) === "sisa_sedikit";
  const bisaPesan = stok !== null && stok > 0;

  function pesan() {
    if (!dipilih || !bisaPesan) return;
    ubah((items) => tambahItem(items, { productId: produk.id, size: dipilih, nama: produk.nama, brand: produk.brand, harga: produk.harga, foto: produk.foto }));
    router.push("/keranjang");
  }

  return (
    <>
      <section aria-labelledby="judul-size" className="px-4 pt-6 min-[900px]:order-2 min-[900px]:px-0">
        <h2 id="judul-size" className="mb-2.5 text-lg font-extrabold">
          Pilih size
        </h2>
        {varian.length === 0 ? (
          <p className="text-redup">Size untuk model ini belum tersedia.</p>
        ) : (
          <ul className="grid grid-cols-4 gap-2">
            {varian.map((v) => {
              const st = statusStok(v.stok, ambang);
              const aktif = dipilih === v.size;
              return (
                <li key={v.size}>
                  <button
                    type="button"
                    onClick={() => setDipilih(aktif ? null : v.size)}
                    aria-pressed={aktif}
                    aria-label={`Size ${v.size}, ${labelStok(v.stok, ambang)}`}
                    className={`flex min-h-[68px] w-full flex-col items-center justify-center rounded-label border-[1.5px] px-1 py-1.5 leading-none ${
                      aktif ? "border-tinta bg-tinta text-kertas" : `${GAYA[st]} hover:bg-kertas-gelap`
                    }`}
                  >
                    <span className={`sempit angka text-[30px] font-extrabold ${st === "habis" ? "line-through decoration-[3px]" : ""}`}>{v.size}</span>
                    <span className="sempit mt-1 text-[13px] font-semibold">{aktif ? "Dipilih" : labelStok(v.stok, ambang)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {/* Label size sudah menulis Ready/Habis; yang perlu ditulis lagi hanya stok tipis. */}
        <p role="status" aria-live="polite" className="mt-3 min-h-6 font-bold text-sedikit-teks">
          {sisaSedikit ? `Tinggal ${stok} pasang.` : dipilih ? <span className="sr-only">Size {dipilih} dipilih.</span> : null}
        </p>
      </section>

      {/* Di HP bar ini menempel di bawah layar; mulai 900px ikut alur di kolom kanan. */}
      <div className="sticky bottom-0 z-[5] mt-4 flex items-center gap-3 border-t-[1.5px] border-tinta bg-white px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 min-[900px]:static min-[900px]:order-3 min-[900px]:mt-0 min-[900px]:block min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:pt-4">
        <div className="shrink-0 leading-tight min-[900px]:hidden">
          <small className="block text-xs text-redup">Harga</small>
          <b className="angka text-lg">{formatRupiah(produk.harga)}</b>
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={pesan}
            disabled={!bisaPesan}
            className="tombol-utama min-h-[52px] w-full text-[17px] disabled:border-[1.5px] disabled:border-habis disabled:bg-kertas-gelap disabled:text-redup disabled:opacity-100"
          >
            {dipilih ? `Pesan size ${dipilih}` : "Pilih size dulu"}
          </button>
        </div>
      </div>
    </>
  );
}
