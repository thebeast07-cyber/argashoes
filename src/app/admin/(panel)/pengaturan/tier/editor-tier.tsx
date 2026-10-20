"use client";

import { useState } from "react";
import { InputRupiah } from "@/components/input-rupiah";
import { useFormState } from "react-dom";
import { IkonTambah } from "@/components/ikon";
import { PesanGalat } from "@/components/pesan";
import type { BarisTier } from "@/lib/domain/pengaturan";
import { formatRupiah, parseRupiah } from "@/lib/domain/produk";
import { simpanTierAksi, type StatePengaturan } from "../actions";
import { Kolom, KolomAlasan, PesanState, TombolKirim } from "../ui";

const MAKS_TIER = 20;

type Baris = BarisTier & { kunci: number };

/** Titik mulai tiap baris untuk ditampilkan; null kalau batas baris sebelumnya belum valid. */
function titikMulai(baris: readonly Baris[]): (number | null)[] {
  let mulai: number | null = 0;
  return baris.map((b) => {
    const ini = mulai;
    const batas = parseRupiah(b.batasAtas);
    mulai = ini !== null && batas !== null && batas > ini ? batas : null;
    return ini;
  });
}

export function EditorTier({ awal, mode }: { awal: BarisTier[]; mode: "langsung" | "usul" }) {
  const [state, aksi] = useFormState<StatePengaturan, FormData>(simpanTierAksi, {});
  const [baris, setBaris] = useState<Baris[]>(() => awal.map((b, i) => ({ ...b, kunci: i })));
  const [kunciBerikut, setKunciBerikut] = useState(awal.length);
  // Error dari server berindeks baris; setelah baris ditambah/dihapus indeksnya tidak cocok lagi.
  const [strukturBerubah, setStrukturBerubah] = useState(false);
  const error = strukturBerubah ? {} : (state.error ?? {});
  const mulai = titikMulai(baris);

  function ubah(i: number, kolom: keyof BarisTier, nilai: string) {
    setBaris((b) => b.map((x, j) => (j === i ? { ...x, [kolom]: nilai } : x)));
  }
  function tambah() {
    setBaris((b) => [...b, { batasAtas: "", fee: "", kunci: kunciBerikut }]);
    setKunciBerikut((k) => k + 1);
    setStrukturBerubah(true);
  }
  function hapus(i: number) {
    setBaris((b) => b.filter((_, j) => j !== i));
    setStrukturBerubah(true);
  }

  return (
    <form action={aksi} onSubmit={() => setStrukturBerubah(false)} className="space-y-4" noValidate>
      <input type="hidden" name="jumlah" value={baris.length} />
      <ol className="space-y-3">
        {baris.map((b, i) => {
          const terakhir = i === baris.length - 1;
          const eBatas = error[`batas.${i}`];
          const eFee = error[`fee.${i}`];
          return (
            <li key={b.kunci} className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
              <p className="angka font-semibold">
                Tier {i + 1}: mulai {mulai[i] === null ? "dari batas tier sebelumnya" : formatRupiah(mulai[i]!)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {terakhir ? (
                  <div>
                    <p className="label-form">Sampai</p>
                    <p className="flex min-h-11 items-center text-sm">Ke atas, tanpa batas</p>
                  </div>
                ) : (
                  <Kolom id={`batas-${i}`} label="Sampai di bawah" error={eBatas}>
                    <InputRupiah
                      id={`batas-${i}`}
                      name={`batas.${i}`}
                      value={b.batasAtas}
                      onChange={(e) => ubah(i, "batasAtas", e.target.value)}
                      placeholder="Contoh 1.000.000"
                      className="input angka"
                      aria-invalid={Boolean(eBatas)}
                      aria-describedby={eBatas ? `batas-${i}-error` : undefined}
                    />
                  </Kolom>
                )}
                <Kolom id={`fee-${i}`} label="Fee per pasang" error={eFee}>
                  <InputRupiah
                    id={`fee-${i}`}
                    name={`fee.${i}`}
                    value={b.fee}
                    onChange={(e) => ubah(i, "fee", e.target.value)}
                    placeholder="50.000 sampai 100.000"
                    className="input angka"
                    aria-invalid={Boolean(eFee)}
                    aria-describedby={eFee ? `fee-${i}-error` : undefined}
                  />
                </Kolom>
              </div>
              {baris.length > 1 && (
                <button type="button" onClick={() => hapus(i)} className="min-h-11 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta">
                  Hapus tier {i + 1}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {baris.length < MAKS_TIER && (
        <button type="button" onClick={tambah} className="tombol-garis w-full">
          <IkonTambah ukuran={18} />
          Tambah tier
        </button>
      )}

      {error.umum && <PesanGalat umumkan>{error.umum}</PesanGalat>}
      {mode === "usul" && <KolomAlasan bantuan="Misalnya harga modal naik, atau model baru masuk di rentang harga tertentu." />}
      <PesanState state={strukturBerubah ? { pesan: state.pesan } : state} />
      <TombolKirim kelas="tombol-utama w-full sm:w-auto">{mode === "usul" ? "Kirim usulan ke pemilik" : "Simpan tier"}</TombolKirim>
    </form>
  );
}
