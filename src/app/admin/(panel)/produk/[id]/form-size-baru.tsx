"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PesanGalat } from "@/components/pesan";
import { usulSku } from "@/lib/domain/sku";
import { simpanVarianBaru, type StateForm } from "../actions";

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol-garis w-full">
      {pending ? "Menambah..." : "Tambah size"}
    </button>
  );
}

// SKU mengikuti size yang diketik (kode artikel + strip + size) sampai pengguna mengubah SKU sendiri.
export function FormSizeBaru({ productId, kodeArtikel }: { productId: string; kodeArtikel: string | null }) {
  const [state, action] = useFormState<StateForm, FormData>(simpanVarianBaru.bind(null, productId), {});
  const ref = useRef<HTMLFormElement>(null);
  const [size, setSize] = useState("");
  const [skuManual, setSkuManual] = useState<string | null>(null);
  const sku = skuManual ?? usulSku(kodeArtikel, size);
  const e = state.error ?? {};

  useEffect(() => {
    if (state.sukses) {
      ref.current?.reset();
      setSize("");
      setSkuManual(null);
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
          <input
            id="size-baru"
            name="size"
            value={size}
            onChange={(ev) => setSize(ev.target.value)}
            required
            className="input angka px-2"
            aria-invalid={Boolean(e.size)}
          />
        </div>
        <div>
          <label htmlFor="sku-baru" className="label-form">
            SKU
          </label>
          <input
            id="sku-baru"
            name="sku"
            value={sku}
            onChange={(ev) => setSkuManual(ev.target.value)}
            required
            autoCapitalize="characters"
            autoCorrect="off"
            aria-describedby="sku-baru-bantuan"
            className="input sempit px-2"
            aria-invalid={Boolean(e.sku)}
          />
        </div>
        <div>
          <label htmlFor="stok-baru" className="label-form">
            Stok
          </label>
          <input id="stok-baru" name="stok" type="number" min={0} inputMode="numeric" defaultValue={0} required className="input angka px-2" aria-invalid={Boolean(e.stok)} />
        </div>
      </div>
      <p id="sku-baru-bantuan" className="text-xs text-redup">
        {kodeArtikel ? (
          <>
            SKU terisi otomatis: kode artikel <span className="sempit font-semibold text-tinta">{kodeArtikel}</span>, strip, lalu size. Boleh diubah.
          </>
        ) : (
          <>Size pertama: isi SKU dengan kode artikel dari label dus, strip, lalu size, mis. HM9451-600-40. Size berikutnya terisi otomatis.</>
        )}
        {skuManual !== null && kodeArtikel && (
          <>
            {" "}
            <button type="button" onClick={() => setSkuManual(null)} className="font-semibold text-tinta underline underline-offset-2">
              Pakai SKU otomatis lagi
            </button>
          </>
        )}
      </p>
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
