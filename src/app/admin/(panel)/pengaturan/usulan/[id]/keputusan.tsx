"use client";

import { useFormState } from "react-dom";
import { putuskanUsulanAksi, tarikUsulanAksi, type StatePengaturan } from "../../actions";
import { Kolom, PesanState, TombolKirim } from "../../ui";

export function FormKeputusan({ id, basi }: { id: string; basi: boolean }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(putuskanUsulanAksi.bind(null, id), {});
  return (
    <form action={aksi} className="space-y-4">
      <Kolom id="catatan" label="Catatan untuk admin toko (opsional)" bantuan="Tersimpan di riwayat bersama keputusanmu.">
        <textarea id="catatan" name="catatan" rows={2} maxLength={500} className="input" aria-describedby="catatan-bantuan" />
      </Kolom>
      <PesanState state={state} />
      <div className="flex flex-wrap gap-3">
        {!basi && (
          <TombolKirim name="keputusan" value="setujui">
            Setujui dan berlakukan
          </TombolKirim>
        )}
        <TombolKirim name="keputusan" value="tolak" kelas="tombol-garis">
          Tolak
        </TombolKirim>
      </div>
    </form>
  );
}

export function TombolTarik({ id }: { id: string }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(tarikUsulanAksi.bind(null, id), {});
  return (
    <form action={aksi} className="space-y-2">
      <PesanState state={state} />
      <TombolKirim kelas="tombol-garis">Tarik usulan ini</TombolKirim>
    </form>
  );
}
