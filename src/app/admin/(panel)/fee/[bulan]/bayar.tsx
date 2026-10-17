"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PesanGalat } from "@/components/pesan";
import { batalkanDibayar, tandaiDibayar, type StateFee } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="tombol-utama">
      {pending ? "Menyimpan..." : "Tandai sudah dibayar"}
    </button>
  );
}

export function FormBayar({ bulan, hariIni, ulang }: { bulan: string; hariIni: string; ulang: boolean }) {
  const [state, aksi] = useFormState<StateFee, FormData>(tandaiDibayar.bind(null, bulan), {});
  return (
    <form action={aksi} className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
      {ulang && <p className="text-sm">Tandai ulang supaya total yang tercatat sama dengan rekap sekarang.</p>}
      <div className="grid gap-3 min-[600px]:grid-cols-2">
        <div>
          <label htmlFor="tanggal" className="label-form">
            Tanggal diterima
          </label>
          <input id="tanggal" name="tanggal" type="date" defaultValue={hariIni} max={hariIni} required className="input angka" />
        </div>
        <div>
          <label htmlFor="catatan" className="label-form">
            Catatan (opsional)
          </label>
          <input id="catatan" name="catatan" maxLength={300} placeholder="Mis. transfer BCA" className="input" />
        </div>
      </div>
      <Tombol />
      {state.error && <PesanGalat umumkan>{state.error}</PesanGalat>}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
    </form>
  );
}

export function BatalkanBayar({ bulan }: { bulan: string }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={sibuk}
        onClick={async () => {
          if (!confirm("Batalkan tanda sudah dibayar untuk bulan ini?")) return;
          setSibuk(true);
          const r = await batalkanDibayar(bulan);
          setSibuk(false);
          setGalat(r.error ?? "");
        }}
        className="min-h-11 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta"
      >
        {sibuk ? "Membatalkan..." : "Batalkan tanda dibayar"}
      </button>
      {galat && <PesanGalat umumkan>{galat}</PesanGalat>}
    </div>
  );
}
