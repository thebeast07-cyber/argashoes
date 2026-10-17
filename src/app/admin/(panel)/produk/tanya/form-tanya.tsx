"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { LabelSize } from "@/components/label-size";
import { PesanGalat } from "@/components/pesan";
import { BATAS_PERTANYAAN, type BarisModel, type Jawaban, type ModelStok } from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { tanyaStok, type HasilTanya } from "./actions";

const CONTOH = ["Apa yang mau habis?", "Size 42 apa aja yang ready?"];

function NamaModel({ model }: { model: ModelStok }) {
  return (
    <Link href={`/admin/produk/${model.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
      {model.brand} {model.nama}
      {!model.aktif && <span className="ml-1.5 font-normal text-redup no-underline">(nonaktif)</span>}
    </Link>
  );
}

function DaftarSize({ baris, ambang }: { baris: BarisModel; ambang: AmbangStok }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {baris.size.map((s) => (
        <li key={s.size}>
          <LabelSize size={s.size} stok={s.stok} ambang={ambang} keterangan={s.stok > 0 ? `${s.stok} psg` : "Habis"} />
        </li>
      ))}
    </ul>
  );
}

function IsiJawaban({ jawaban, ambang }: { jawaban: Jawaban; ambang: AmbangStok }) {
  switch (jawaban.jenis) {
    case "model":
      return (
        <div className="space-y-3">
          {jawaban.baris.map((b) => (
            <div key={b.model.id} className="space-y-1">
              <NamaModel model={b.model} />
              {b.size.length > 0 ? (
                <>
                  <DaftarSize baris={b} ambang={ambang} />
                  <p className="angka text-sm">Total {b.total} pasang</p>
                </>
              ) : (
                <p className="text-sm">{jawaban.size ? `Size ${jawaban.size} tidak tercatat di model ini.` : "Belum ada size yang tercatat."}</p>
              )}
            </div>
          ))}
        </div>
      );
    case "size":
      return (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Size {jawaban.size} yang masih ada:</p>
          <ul className="divide-y divide-tinta/20">
            {jawaban.baris.map((b) => (
              <li key={b.model.id} className="flex items-center justify-between gap-3">
                <NamaModel model={b.model} />
                <span className="angka shrink-0 text-sm">{b.stok} psg</span>
              </li>
            ))}
          </ul>
          {jawaban.lebih > 0 && <p className="text-sm text-redup">Dan {jawaban.lebih} model lagi. Sebut brandnya supaya lebih sempit.</p>}
        </div>
      );
    case "mau_habis":
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Size yang Sisa sedikit atau Habis:</p>
          {jawaban.baris.map((b) => (
            <div key={b.model.id} className="space-y-1">
              <NamaModel model={b.model} />
              <DaftarSize baris={b} ambang={ambang} />
            </div>
          ))}
          {jawaban.lebih > 0 && <p className="text-sm text-redup">Dan {jawaban.lebih} model lagi. Sebut brand atau modelnya supaya lebih sempit.</p>}
        </div>
      );
    case "tidak_ketemu":
      return <p className="text-sm">{jawaban.pesan}</p>;
    case "tidak_paham":
      return (
        <p className="text-sm">
          Asisten hanya bisa menjawab soal stok: sisa per model, model apa saja di satu size, dan size yang mau habis. Coba tulis ulang.
        </p>
      );
  }
}

export function FormTanya() {
  const [teks, setTeks] = useState("");
  const [riwayat, setRiwayat] = useState<(HasilTanya & { kunci: number })[]>([]);
  const [sedang, mulai] = useTransition();
  const urutan = useRef(0);

  function kirim(pertanyaan: string) {
    if (!pertanyaan.trim() || sedang) return;
    mulai(async () => {
      let hasil: HasilTanya;
      try {
        hasil = await tanyaStok(pertanyaan);
      } catch {
        hasil = { pertanyaan, galat: "Koneksi terputus. Coba lagi." };
      }
      urutan.current += 1;
      setRiwayat((r) => [{ ...hasil, kunci: urutan.current }, ...r].slice(0, 20));
      if (!hasil.galat) setTeks("");
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          kirim(teks);
        }}
      >
        <label htmlFor="tanya" className="label-form">
          Pertanyaan
        </label>
        <input
          id="tanya"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          maxLength={BATAS_PERTANYAAN}
          autoComplete="off"
          enterKeyHint="send"
          aria-describedby="tanya-bantuan"
          className="input"
        />
        <p id="tanya-bantuan" className="text-sm text-redup">
          Sebut sepatunya, mis. af1 putih sisa berapa? Bisa juga lewat tombol mikrofon di keyboard HP.
        </p>
        <button type="submit" disabled={sedang || !teks.trim()} className="tombol-utama w-full">
          {sedang ? "Mencari..." : "Tanya"}
        </button>
      </form>

      {riwayat.length === 0 && !sedang && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Atau ketuk salah satu:</p>
          <div className="flex flex-wrap gap-2">
            {CONTOH.map((c) => (
              <button key={c} type="button" onClick={() => kirim(c)} className="tombol-garis px-3 text-sm">
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div aria-live="polite" className="space-y-3">
        {sedang && (
          <p role="status" className="text-sm text-redup">
            Mencari jawaban...
          </p>
        )}
        {riwayat.map((h) => (
          <article key={h.kunci} className="space-y-2 rounded-label border border-tinta/55 bg-white p-3">
            <p className="text-sm text-redup">{h.pertanyaan}</p>
            {h.galat ? <PesanGalat>{h.galat}</PesanGalat> : h.jawaban && h.ambang && <IsiJawaban jawaban={h.jawaban} ambang={h.ambang} />}
          </article>
        ))}
      </div>
    </div>
  );
}
