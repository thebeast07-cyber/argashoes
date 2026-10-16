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
      className="tombol-utama w-full"
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
      <div>
        <label htmlFor="akun-nama" className="label-form">
          Nama
        </label>
        <input id="akun-nama" name="nama" required className="input" />
      </div>
      <div>
        <label htmlFor="akun-email" className="label-form">
          Email
        </label>
        <input id="akun-email" name="email" type="email" required autoComplete="off" className="input" />
      </div>
      <div>
        <label htmlFor="akun-password" className="label-form">
          Password awal
        </label>
        <input
          id="akun-password"
          name="password"
          type="password"
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          required
          aria-describedby="akun-password-bantuan"
          className="input"
        />
        <p id="akun-password-bantuan" className="mt-1 text-xs text-redup">
          Minimal {PASSWORD_MIN} karakter. Berikan langsung ke orangnya, jangan lewat grup chat.
        </p>
      </div>
      <div>
        <label htmlFor="akun-peran" className="label-form">
          Peran
        </label>
        <select id="akun-peran" name="peran" defaultValue="admin_toko" className="input">
          <option value="admin_toko">Admin toko: produk, stok, order, pelanggan</option>
          <option value="pemilik">Pemilik web: semua, termasuk fee dan akun</option>
        </select>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-bata">
          {state.error}
        </p>
      )}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
      <TombolSimpan />
    </form>
  );
}
