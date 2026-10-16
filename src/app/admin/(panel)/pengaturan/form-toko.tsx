"use client";

import { useFormState } from "react-dom";
import { simpanTokoAksi, type StatePengaturan } from "./actions";
import { keterangan, Kolom, PesanState, TombolKirim } from "./ui";

export function FormToko({ nomorWa, ambang }: { nomorWa: string; ambang: number }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(simpanTokoAksi, {});
  const e = state.error ?? {};
  return (
    <form action={aksi} className="space-y-4" noValidate>
      <Kolom id="nomorWa" label="Nomor WhatsApp toko" error={e.nomorWa} bantuan="Tujuan tombol WhatsApp di halaman checkout. Kosongkan kalau belum ada.">
        <input
          id="nomorWa"
          name="nomorWa"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          defaultValue={nomorWa}
          placeholder="0812 3456 7890"
          className="input angka"
          aria-invalid={Boolean(e.nomorWa)}
          aria-describedby={keterangan(state, "nomorWa", true)}
        />
      </Kolom>
      <Kolom id="ambang" label="Ready mulai stok" error={e.ambang} bantuan="Di bawah angka ini size tampil Sisa sedikit. Stok 0 selalu Habis.">
        <input
          id="ambang"
          name="ambang"
          type="number"
          min={2}
          max={50}
          step={1}
          inputMode="numeric"
          defaultValue={ambang}
          className="input angka w-24"
          aria-invalid={Boolean(e.ambang)}
          aria-describedby={keterangan(state, "ambang", true)}
        />
      </Kolom>
      <PesanState state={state} />
      <TombolKirim kelas="tombol-garis">Simpan kontak dan stok</TombolKirim>
    </form>
  );
}
