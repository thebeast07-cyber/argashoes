"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PesanGalat } from "@/components/pesan";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { resetSandiAkun, ubahAktifAkun, type StateForm } from "../../actions";

function Tombol({ kelas, label, labelProses }: { kelas: string; label: string; labelProses: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={kelas}>
      {pending ? labelProses : label}
    </button>
  );
}

function Hasil({ state }: { state: StateForm }) {
  if (state.error) return <PesanGalat umumkan>{state.error}</PesanGalat>;
  if (state.sukses)
    return (
      <p role="status" className="text-sm font-semibold">
        {state.sukses}
      </p>
    );
  return null;
}

function FormResetSandi({ userId, nama, diriSendiri }: { userId: string; nama: string; diriSendiri: boolean }) {
  const [state, action] = useFormState<StateForm, FormData>(resetSandiAkun, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sukses) formRef.current?.reset();
  }, [state]);
  const idInput = `sandi-${userId}`;

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label htmlFor={idInput} className="label-form">
          Password baru<span className="sr-only"> untuk {nama}</span>
        </label>
        <input
          id={idInput}
          name="password"
          type="password"
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          required
          aria-describedby={`${idInput}-bantuan`}
          className="input"
        />
        <p id={`${idInput}-bantuan`} className="mt-1 text-xs text-redup">
          {diriSendiri
            ? `Minimal ${PASSWORD_MIN} karakter. Setelah disimpan kamu keluar dan perlu login lagi dengan password ini.`
            : `Minimal ${PASSWORD_MIN} karakter. Akun ini langsung keluar dari semua HP dan perlu login lagi.`}
        </p>
      </div>
      <Hasil state={state} />
      <Tombol kelas="tombol-garis w-full" label="Ganti password" labelProses="Menyimpan..." />
    </form>
  );
}

function FormAktif({ userId, aktif }: { userId: string; aktif: boolean }) {
  const [state, action] = useFormState<StateForm, FormData>(ubahAktifAkun, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="aktif" value={aktif ? "false" : "true"} />
      <p className="text-sm text-redup">
        {aktif
          ? "Akun nonaktif tidak bisa login dan langsung keluar. Riwayatnya tetap tersimpan, dan bisa diaktifkan lagi kapan saja."
          : "Akun ini tidak bisa login. Aktifkan lagi untuk memakai password terakhirnya."}
      </p>
      <Hasil state={state} />
      <Tombol
        kelas="tombol-garis w-full"
        label={aktif ? "Nonaktifkan akun" : "Aktifkan lagi"}
        labelProses="Menyimpan..."
      />
    </form>
  );
}

export function KelolaAkun({ userId, nama, aktif, diriSendiri }: { userId: string; nama: string; aktif: boolean; diriSendiri: boolean }) {
  return (
    <details className="group mt-2 rounded-label border border-tinta/55 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-semibold">
          Kelola akun<span className="sr-only"> {nama}</span>
        </span>
        <span aria-hidden="true" className="w-3 text-center text-lg font-semibold leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="space-y-5 border-t border-tinta/15 px-3 pb-4 pt-3">
        <FormResetSandi userId={userId} nama={nama} diriSendiri={diriSendiri} />
        {!diriSendiri && (
          <div className="border-t border-tinta/15 pt-4">
            <FormAktif userId={userId} aktif={aktif} />
          </div>
        )}
      </div>
    </details>
  );
}
