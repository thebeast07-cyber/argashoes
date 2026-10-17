"use client";

import { useFormState } from "react-dom";
import type { Rekening } from "@/lib/domain/pengaturan";
import { simpanRekeningAksi, type StatePengaturan } from "./actions";
import { keterangan, Kolom, KolomAlasan, PesanState, TombolKirim } from "./ui";

/** Langsung: pemilik menyimpan. Usul: admin toko mengirim usulan yang harus disetujui pemilik. */
export function FormRekening({ awal, mode }: { awal: Rekening | null; mode: "langsung" | "usul" }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(simpanRekeningAksi, {});
  const e = state.error ?? {};
  return (
    <form action={aksi} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom id="bank" label="Bank" error={e.bank}>
          <input id="bank" name="bank" defaultValue={awal?.bank} placeholder="Nama bank" className="input" aria-invalid={Boolean(e.bank)} aria-describedby={keterangan(state, "bank")} />
        </Kolom>
        <Kolom id="nomor" label="Nomor rekening" error={e.nomor}>
          <input
            id="nomor"
            name="nomor"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={awal?.nomor}
            placeholder="Angka saja"
            className="input angka"
            aria-invalid={Boolean(e.nomor)}
            aria-describedby={keterangan(state, "nomor")}
          />
        </Kolom>
      </div>
      <Kolom id="atasNama" label="Atas nama" error={e.atasNama}>
        <input
          id="atasNama"
          name="atasNama"
          defaultValue={awal?.atasNama}
          placeholder="Nama di buku tabungan"
          className="input"
          aria-invalid={Boolean(e.atasNama)}
          aria-describedby={keterangan(state, "atasNama")}
        />
      </Kolom>
      {mode === "usul" && <KolomAlasan bantuan="Misalnya kenapa rekeningnya diganti. Pemilik akan mengecek ke kamu sebelum menyetujui." />}
      <PesanState state={state} />
      {/* Garis, bukan aksen: di halaman Pengaturan aksen dipakai untuk usulan yang menunggu keputusan. */}
      <TombolKirim kelas="tombol-garis">{mode === "usul" ? "Kirim usulan rekening" : "Simpan rekening"}</TombolKirim>
    </form>
  );
}
