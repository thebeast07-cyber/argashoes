"use client";

import { useFormStatus } from "react-dom";
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
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-bata">
          {error}
        </p>
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
  const adaError = state.error && Object.keys(state.error).length > 0;
  return (
    <>
      {state.pesan && (
        <p role="alert" className="text-sm font-semibold text-bata">
          {state.pesan}
        </p>
      )}
      {adaError && !state.pesan && (
        <p role="alert" className="text-sm font-semibold text-bata">
          Ada isian yang perlu dibetulkan. Lihat pesan merah di atas.
        </p>
      )}
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
