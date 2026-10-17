"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Gambar } from "@/components/gambar";
import { PesanGalat } from "@/components/pesan";
import { kecilkanFoto } from "@/lib/foto/kecilkan";
import { CATATAN_INTERNAL_MAKS } from "@/lib/domain/order-admin";
import { hapusFotoResi, simpanCatatan, unggahFotoResi, type StateOrder } from "../actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol-garis">
      {pending ? "Menyimpan..." : "Simpan catatan"}
    </button>
  );
}

export function CatatanInternal({ orderId, kode, awal }: { orderId: string; kode: string; awal: string | null }) {
  const [state, aksi] = useFormState<StateOrder, FormData>(simpanCatatan.bind(null, orderId, kode), {});
  return (
    <form action={aksi} className="space-y-2">
      <label htmlFor="catatan" className="label-form">
        Catatan internal
      </label>
      <textarea id="catatan" name="catatan" defaultValue={awal ?? ""} rows={3} maxLength={CATATAN_INTERNAL_MAKS} className="input" aria-describedby="catatan-bantuan" />
      <p id="catatan-bantuan" className="text-xs text-redup">
        Hanya terlihat di admin. Misalnya ongkir yang disepakati atau janji kirim.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <TombolSimpan />
        {state.sukses && (
          <span role="status" className="text-sm font-semibold">
            {state.sukses}
          </span>
        )}
      </div>
      {state.error && <PesanGalat umumkan>{state.error}</PesanGalat>}
    </form>
  );
}

/** PRD: foto resi disarankan, bukan wajib. Satu foto; foto baru menggantikan yang lama. */
export function FotoResi({ orderId, kode, url }: { orderId: string; kode: string; url: string | null }) {
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<StateOrder>({});

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    setSibuk(true);
    setHasil({});
    try {
      const form = new FormData();
      form.append("foto", await kecilkanFoto(f), "resi.jpg");
      setHasil(await unggahFotoResi(orderId, kode, form));
    } catch {
      setHasil({ error: `${f.name} tidak bisa dibaca browser. Pakai foto JPG atau PNG.` });
    }
    setSibuk(false);
  }

  async function hapus() {
    if (!confirm("Hapus foto resi?")) return;
    setSibuk(true);
    setHasil(await hapusFotoResi(orderId, kode));
    setSibuk(false);
  }

  return (
    <div className="space-y-2">
      <p className="label-form">Foto resi (opsional)</p>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="block w-40">
          <Gambar src={url} alt={`Foto resi ${kode}`} className="aspect-square w-full rounded-label border border-tinta/25" />
        </a>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`tombol-garis cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bata ${sibuk ? "pointer-events-none opacity-60" : ""}`}
        >
          <input type="file" accept="image/*" disabled={sibuk} onChange={pilih} className="sr-only" />
          {sibuk ? "Memproses..." : url ? "Ganti foto resi" : "Unggah foto resi"}
        </label>
        {url && !sibuk && (
          <button type="button" onClick={hapus} className="min-h-11 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta">
            Hapus foto
          </button>
        )}
      </div>
      {hasil.error && <PesanGalat umumkan>{hasil.error}</PesanGalat>}
      {hasil.sukses && (
        <p role="status" className="text-sm font-semibold">
          {hasil.sukses}
        </p>
      )}
    </div>
  );
}
