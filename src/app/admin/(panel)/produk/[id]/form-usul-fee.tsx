"use client";

import { useFormState } from "react-dom";
import { InputRupiah } from "@/components/input-rupiah";
import { usulkanFeeProdukAksi, type StatePengaturan } from "../../pengaturan/actions";
import { Kolom, KolomAlasan, PesanState, TombolKirim } from "../../pengaturan/ui";

export function FormUsulFee({ productId, awal }: { productId: string; awal: string }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(usulkanFeeProdukAksi.bind(null, productId), {});
  const e = state.error ?? {};
  return (
    <form action={aksi} className="space-y-4" noValidate>
      <Kolom id="usul-fee" label="Fee khusus yang diusulkan" error={e.fee} bantuan="Rp 50.000 sampai Rp 100.000. Kosongkan untuk kembali ikut tier.">
        <InputRupiah
          id="usul-fee"
          name="fee"
          defaultValue={awal}
          className="input angka"
          aria-invalid={Boolean(e.fee)}
          aria-describedby={e.fee ? "usul-fee-error" : "usul-fee-bantuan"}
        />
      </Kolom>
      <KolomAlasan bantuan="Misalnya model ini margin-nya tipis, atau sedang laris." />
      <PesanState state={state} />
      <TombolKirim kelas="tombol-garis">Kirim usulan fee</TombolKirim>
    </form>
  );
}
