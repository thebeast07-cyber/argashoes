"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PesanGalat } from "@/components/pesan";
import { ALASAN_BATAL, type StatusOrder } from "@/lib/domain/order-status";
import { ubahStatus, type StateOrder } from "../actions";

function Tombol({ children, kelas = "tombol-utama w-full" }: { children: React.ReactNode; kelas?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={kelas}>
      {pending ? "Menyimpan..." : children}
    </button>
  );
}

// Satu langkah utama per status, sesuai urutan kerja: konfirmasi di WA → kirim + resi → selesai.
export function AksiStatus({ orderId, kode, status, resiNomor }: { orderId: string; kode: string; status: StatusOrder; resiNomor: string | null }) {
  const [state, aksi] = useFormState<StateOrder, FormData>(ubahStatus.bind(null, orderId, kode), {});
  const [bukaBatal, setBukaBatal] = useState(false);
  const [alasan, setAlasan] = useState<string>("");
  const bisaBatal = status === "lead" || status === "dikonfirmasi";

  if (status === "selesai" || status === "batal") return null;

  return (
    <div className="space-y-3">
      {status === "lead" && (
        <form action={aksi} className="space-y-1">
          <input type="hidden" name="ke" value="dikonfirmasi" />
          <Tombol>Konfirmasi order</Tombol>
          <p className="text-xs text-redup">Setelah stok dan ongkir disepakati dengan pembeli di WhatsApp.</p>
        </form>
      )}

      {status === "dikonfirmasi" && (
        <form action={aksi} className="space-y-2">
          <input type="hidden" name="ke" value="dikirim" />
          <label htmlFor="resi" className="label-form">
            Nomor resi
          </label>
          <input id="resi" name="resi" defaultValue={resiNomor ?? ""} required autoCapitalize="characters" className="input sempit angka" />
          <Tombol>Tandai dikirim</Tombol>
        </form>
      )}

      {status === "dikirim" && (
        <form action={aksi}>
          <input type="hidden" name="ke" value="selesai" />
          <Tombol kelas="tombol-garis w-full">Tandai selesai: barang sudah diterima</Tombol>
        </form>
      )}

      {bisaBatal &&
        (bukaBatal ? (
          <form action={aksi} className="space-y-2 rounded-label border-[1.5px] border-tinta bg-white p-3">
            <input type="hidden" name="ke" value="batal" />
            <fieldset className="space-y-1">
              <legend className="label-form">Alasan batal</legend>
              {ALASAN_BATAL.map((a) => (
                <label key={a} className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="radio" name="alasan" value={a} checked={alasan === a} onChange={() => setAlasan(a)} className="size-5 accent-bata" />
                  {a}
                </label>
              ))}
            </fieldset>
            {alasan === "Lainnya" && (
              <div>
                <label htmlFor="alasanLain" className="label-form">
                  Tulis alasannya
                </label>
                <input id="alasanLain" name="alasanLain" maxLength={200} className="input" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Tombol kelas="tombol-garis">Batalkan order</Tombol>
              <button type="button" onClick={() => setBukaBatal(false)} className="min-h-11 px-1 text-sm font-semibold underline underline-offset-2">
                Tidak jadi
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setBukaBatal(true)} className="min-h-11 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta">
            Batalkan order...
          </button>
        ))}

      {state.error && <PesanGalat umumkan>{state.error}</PesanGalat>}
      {state.sukses && (
        <p role="status" className="text-sm font-semibold">
          {state.sukses}
        </p>
      )}
    </div>
  );
}
