"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { IkonCoret } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { PesanGalat } from "@/components/pesan";
import type { AmbangStok } from "@/lib/domain/stok";
import { simpanStok, tandaiHabis, type StateForm } from "./actions";

type Varian = { id: string; sku: string; size: string; stok: number };

function Tombol({ children, kelas, proses }: { children: React.ReactNode; kelas: string; proses: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={kelas}>
      {pending ? proses : children}
    </button>
  );
}

// Aksi stok langsung dari daftar produk (PRD: Tandai habis satu ketuk dari HP),
// tanpa harus membuka halaman detail model.
export function SizeCepat({
  productId,
  namaProduk,
  varian,
  ambang,
}: {
  productId: string;
  namaProduk: string;
  varian: Varian[];
  ambang: AmbangStok;
}) {
  const [bukaId, setBukaId] = useState<string | null>(null);
  const tombol = useRef<Record<string, HTMLButtonElement | null>>({});
  const dipilih = varian.find((v) => v.id === bukaId);
  const idPanel = `aksi-size-${productId}`;

  function tutup() {
    const id = bukaId;
    setBukaId(null);
    if (id) tombol.current[id]?.focus();
  }

  return (
    <div className="mt-1">
      <ul className="flex flex-wrap gap-1.5" aria-label={`Size ${namaProduk}`}>
        {varian.map((v) => {
          const terbuka = v.id === bukaId;
          return (
            <li key={v.id}>
              <button
                type="button"
                ref={(el) => {
                  tombol.current[v.id] = el;
                }}
                onClick={() => setBukaId(terbuka ? null : v.id)}
                onKeyDown={(e) => {
                  // Fokus masih di label size setelah diketuk; Escape harus menutup panel dari sini juga.
                  if (e.key === "Escape" && terbuka) tutup();
                }}
                aria-expanded={terbuka}
                aria-controls={terbuka ? idPanel : undefined}
                className={`block rounded-label ${terbuka ? "outline outline-2 outline-offset-2 outline-tinta" : ""}`}
              >
                <LabelSize size={v.size} stok={v.stok} ambang={ambang} />
                <span className="sr-only">, ubah stok</span>
              </button>
            </li>
          );
        })}
      </ul>
      {dipilih && <PanelSize key={dipilih.id} id={idPanel} productId={productId} varian={dipilih} onTutup={tutup} />}
    </div>
  );
}

function PanelSize({ id, productId, varian, onTutup }: { id: string; productId: string; varian: Varian; onTutup: () => void }) {
  const [state, aksiStok] = useFormState<StateForm, FormData>(simpanStok.bind(null, productId, varian.id), {});
  // Setelah Tandai habis, stok di props jadi 0 lewat revalidasi; penanda ini membedakan "baru ditandai" dari "memang sudah habis".
  const [baruDitandai, setBaruDitandai] = useState(false);
  const idStok = `stok-cepat-${varian.id}`;

  return (
    <div
      id={id}
      role="group"
      aria-label={`Stok size ${varian.size}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onTutup();
      }}
      className="mt-2 space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-sm">
          <span className="font-semibold">Size {varian.size}</span> <span className="sempit text-redup">{varian.sku}</span>
        </p>
        <button type="button" onClick={onTutup} className="min-h-11 shrink-0 px-2 text-sm font-semibold underline underline-offset-2">
          Tutup
        </button>
      </div>

      {varian.stok > 0 ? (
        <form action={tandaiHabis.bind(null, productId, varian.id)} onSubmit={() => setBaruDitandai(true)}>
          <Tombol kelas="tombol-utama w-full" proses="Menandai...">
            <IkonCoret ukuran={18} />
            Tandai size {varian.size} habis
          </Tombol>
        </form>
      ) : baruDitandai ? (
        <p role="status" className="text-sm font-semibold">
          Size {varian.size} sekarang Habis.
        </p>
      ) : (
        <p className="text-sm text-redup">Size ini sedang habis. Isi stok baru kalau ada barang masuk.</p>
      )}

      <form action={aksiStok} className="flex items-end gap-2">
        <div>
          <label htmlFor={idStok} className="label-form">
            Ubah stok
          </label>
          <input
            id={idStok}
            name="stok"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={varian.stok}
            key={varian.stok}
            className="input angka w-24"
          />
        </div>
        <Tombol kelas="tombol-garis" proses="Menyimpan...">
          Simpan
        </Tombol>
      </form>
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          Stok {varian.size} tersimpan.
        </p>
      )}
      {state.pesan && <PesanGalat umumkan>{state.pesan}</PesanGalat>}

      <Link href={`/admin/produk/${productId}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
        Buka detail model
      </Link>
    </div>
  );
}
