"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PesanGalat } from "@/components/pesan";
import { simpanVarianBaru, type StateForm } from "../actions";

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol-garis w-full">
      {pending ? "Menambah..." : "Tambah size"}
    </button>
  );
}

export function FormSizeBaru({ productId, skuAwal }: { productId: string; skuAwal: string }) {
  const [state, action] = useFormState<StateForm, FormData>(simpanVarianBaru.bind(null, productId), {});
  const ref = useRef<HTMLFormElement>(null);
  const e = state.error ?? {};
  useEffect(() => {
    if (state.sukses) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("#size-baru")?.focus();
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3" noValidate>
      <h3 className="font-semibold">Tambah size</h3>
      <div className="grid grid-cols-[5rem_1fr_5rem] gap-2">
        <div>
          <label htmlFor="size-baru" className="label-form">
            Size
          </label>
          <input id="size-baru" name="size" required className="input angka px-2" aria-invalid={Boolean(e.size)} />
        </div>
        <div>
          <label htmlFor="sku-baru" className="label-form">
            SKU
          </label>
          <input id="sku-baru" name="sku" defaultValue={skuAwal} required autoCapitalize="characters" className="input sempit px-2" aria-invalid={Boolean(e.sku)} />
        </div>
        <div>
          <label htmlFor="stok-baru" className="label-form">
            Stok
          </label>
          <input id="stok-baru" name="stok" type="number" min={0} inputMode="numeric" defaultValue={0} required className="input angka px-2" aria-invalid={Boolean(e.stok)} />
        </div>
      </div>
      {Object.values(e).map((pesan) => (
        <PesanGalat key={pesan} umumkan>
          {pesan}
        </PesanGalat>
      ))}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
      <TombolTambah />
    </form>
  );
}
