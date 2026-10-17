"use client";

import { useFormStatus } from "react-dom";
import { PesanGalat, RingkasanGalat } from "@/components/pesan";
import type { StatePengaturan } from "./actions";

export function TombolKirim({ children, kelas = "tombol-utama", name, value }: { children: React.ReactNode; kelas?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={kelas}>
      {pending ? "Menyimpan..." : children}
    </button>
  );
}

export function Kolom({
  id,
  label,
  error,
  bantuan,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  bantuan?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-form">
        {label}
      </label>
      {children}
      {bantuan && !error && (
        <p id={`${id}-bantuan`} className="mt-1 text-xs text-redup">
          {bantuan}
        </p>
      )}
      {error && (
        <PesanGalat id={`${id}-error`} kecil>
          {error}
        </PesanGalat>
      )}
    </div>
  );
}

/** aria-describedby untuk input: pesan error kalau ada, kalau tidak teks bantuan. */
export function keterangan(state: StatePengaturan, id: string, bantuan = false): string | undefined {
  if (state.error?.[id]) return `${id}-error`;
  return bantuan ? `${id}-bantuan` : undefined;
}

export function PesanState({ state }: { state: StatePengaturan }) {
  // "umum" bukan isian; editor tier menampilkannya sendiri.
  const jumlahError = Object.keys(state.error ?? {}).filter((k) => k !== "umum").length;
  return (
    <>
      {state.pesan && <PesanGalat umumkan>{state.pesan}</PesanGalat>}
      {!state.pesan && <RingkasanGalat jumlah={jumlahError} pemicu={state} />}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
    </>
  );
}

export function KolomAlasan({ bantuan }: { bantuan: string }) {
  return (
    <Kolom id="alasan" label="Alasan untuk pemilik (opsional)" bantuan={bantuan}>
      <textarea id="alasan" name="alasan" rows={2} maxLength={500} className="input" aria-describedby="alasan-bantuan" />
    </Kolom>
  );
}
