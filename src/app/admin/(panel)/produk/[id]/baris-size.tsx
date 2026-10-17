"use client";

import { useFormState, useFormStatus } from "react-dom";
import { IkonCoret } from "@/components/ikon";
import { PesanGalat } from "@/components/pesan";
import { hapusSize, simpanStok, tandaiHabis, type StateForm } from "../actions";

function Tombol({ children, kelas, proses }: { children: React.ReactNode; kelas: string; proses: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={kelas}>
      {pending ? proses : children}
    </button>
  );
}

export function BarisSize({
  productId,
  varian,
  label,
}: {
  productId: string;
  varian: { id: string; sku: string; size: string; stok: number };
  label: React.ReactNode;
}) {
  const [state, aksiStok] = useFormState<StateForm, FormData>(simpanStok.bind(null, productId, varian.id), {});
  const idStok = `stok-${varian.id}`;

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-3">
        {label}
        <div className="min-w-0 flex-1">
          <p className="sempit truncate text-sm font-semibold">{varian.sku}</p>
          <form action={aksiStok} className="mt-1 flex items-center gap-2">
            <label htmlFor={idStok} className="text-sm text-redup">
              Stok
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
              className="input angka w-20 px-2"
            />
            <Tombol kelas="tombol-garis px-3 text-sm" proses="Menyimpan...">
              Simpan
            </Tombol>
          </form>
          {/* Baris sendiri, bukan di samping tombol: di layar 320px teksnya keluar layar. */}
          {state.sukses && (
            <p role="status" className="mt-1 text-sm font-semibold">
              Stok {varian.size} tersimpan.
            </p>
          )}
          {state.pesan && (
            <div className="mt-1">
              <PesanGalat umumkan>{state.pesan}</PesanGalat>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-[4.75rem]">
        {varian.stok > 0 && (
          <form action={tandaiHabis.bind(null, productId, varian.id)}>
            <Tombol kelas="tombol-garis px-3 text-sm" proses="Menandai...">
              <IkonCoret ukuran={16} />
              Tandai habis
            </Tombol>
          </form>
        )}
        <form
          action={hapusSize.bind(null, productId, varian.id)}
          onSubmit={(e) => {
            if (!confirm(`Hapus size ${varian.size} (${varian.sku})? Riwayat order yang sudah ada tidak ikut terhapus.`)) e.preventDefault();
          }}
        >
          <Tombol kelas="min-h-11 px-2 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta" proses="Menghapus...">
            Hapus size
          </Tombol>
        </form>
      </div>
    </li>
  );
}
