"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { StateForm } from "./actions";

export type NilaiProduk = {
  nama: string;
  brand: string;
  kategori: string;
  deskripsi: string;
  harga: string;
  hargaCoret: string;
  feePerPasang: string;
  aktif: boolean;
};

function TombolSimpan({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol-utama w-full sm:w-auto">
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

function Kolom({
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

export function FormProduk({
  aksi,
  awal,
  labelSimpan,
  bolehUbahFee,
  infoFee,
  brands,
  kategori,
}: {
  aksi: (prev: StateForm, form: FormData) => Promise<StateForm>;
  awal: NilaiProduk;
  labelSimpan: string;
  bolehUbahFee: boolean;
  infoFee: string;
  brands: string[];
  kategori: string[];
}) {
  const [state, action] = useFormState(aksi, {});
  const e = state.error ?? {};
  const desc = (id: string, bantuan?: boolean) => (e[id] ? `${id}-error` : bantuan ? `${id}-bantuan` : undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom id="brand" label="Brand" error={e.brand}>
          <input id="brand" name="brand" defaultValue={awal.brand} list="daftar-brand" required className="input" aria-invalid={Boolean(e.brand)} aria-describedby={desc("brand")} />
          <datalist id="daftar-brand">
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Kolom>
        <Kolom id="kategori" label="Kategori (opsional)" error={e.kategori}>
          <input id="kategori" name="kategori" defaultValue={awal.kategori} list="daftar-kategori" className="input" />
          <datalist id="daftar-kategori">
            {kategori.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Kolom>
      </div>

      <Kolom id="nama" label="Nama model" error={e.nama}>
        <input id="nama" name="nama" defaultValue={awal.nama} required className="input" aria-invalid={Boolean(e.nama)} aria-describedby={desc("nama")} />
      </Kolom>

      <div className="grid grid-cols-2 gap-3">
        <Kolom id="harga" label="Harga jual" error={e.harga} bantuan="Rupiah, contoh 1.299.000">
          <input
            id="harga"
            name="harga"
            defaultValue={awal.harga}
            inputMode="numeric"
            required
            className="input angka"
            aria-invalid={Boolean(e.harga)}
            aria-describedby={desc("harga", true)}
          />
        </Kolom>
        <Kolom id="hargaCoret" label="Harga coret (opsional)" error={e.hargaCoret} bantuan="Harga sebelum diskon">
          <input
            id="hargaCoret"
            name="hargaCoret"
            defaultValue={awal.hargaCoret}
            inputMode="numeric"
            className="input angka"
            aria-invalid={Boolean(e.hargaCoret)}
            aria-describedby={desc("hargaCoret", true)}
          />
        </Kolom>
      </div>

      {bolehUbahFee ? (
        <Kolom id="feePerPasang" label="Fee per pasang (opsional)" error={e.feePerPasang} bantuan="Rp 50.000 sampai Rp 100.000. Kosongkan untuk ikut tier harga.">
          <input
            id="feePerPasang"
            name="feePerPasang"
            defaultValue={awal.feePerPasang}
            inputMode="numeric"
            className="input angka"
            aria-invalid={Boolean(e.feePerPasang)}
            aria-describedby={desc("feePerPasang", true)}
          />
        </Kolom>
      ) : (
        <div>
          <p className="label-form">Fee per pasang</p>
          <p className="text-sm text-redup">{infoFee}</p>
        </div>
      )}

      <Kolom id="deskripsi" label="Deskripsi (opsional)" error={e.deskripsi}>
        <textarea id="deskripsi" name="deskripsi" defaultValue={awal.deskripsi} rows={3} className="input" />
      </Kolom>

      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="aktif" defaultChecked={awal.aktif} className="size-5 accent-bata" />
        <span className="text-sm">
          <span className="font-semibold">Tampil di katalog</span>
          <span className="block text-redup">Matikan untuk menyembunyikan model tanpa menghapusnya.</span>
        </span>
      </label>

      {state.pesan && (
        <p role="alert" className="text-sm font-semibold text-bata">
          {state.pesan}
        </p>
      )}
      {Object.keys(e).length > 0 && (
        <p role="alert" className="text-sm font-semibold text-bata">
          Ada isian yang perlu dibetulkan. Lihat pesan merah di atas.
        </p>
      )}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
      <TombolSimpan label={labelSimpan} />
    </form>
  );
}
