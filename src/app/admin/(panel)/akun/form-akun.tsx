"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { tambahAkun, type StateForm } from "../../actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Tambah akun"}
    </button>
  );
}

export function FormAkun() {
  const [state, action] = useFormState<StateForm, FormData>(tambahAkun, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input name="nama" placeholder="Nama" required className="input" />
      <input name="email" type="email" placeholder="Email" required className="input" />
      <input
        name="password"
        type="password"
        placeholder={`Password awal (min. ${PASSWORD_MIN} karakter)`}
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
        required
        className="input"
      />
      <select name="peran" defaultValue="admin_toko" className="input">
        <option value="admin_toko">Admin toko</option>
        <option value="pemilik">Pemilik web</option>
      </select>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.sukses && <p className="text-sm text-green-700">{state.sukses}</p>}
      <TombolSimpan />
    </form>
  );
}
