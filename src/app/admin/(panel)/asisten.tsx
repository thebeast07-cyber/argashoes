"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { IkonChat, IkonKirim, IkonTutup } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { PesanGalat } from "@/components/pesan";
import {
  BATAS_PERTANYAAN,
  BATAS_RIWAYAT,
  TEKS_TIDAK_PAHAM,
  TEKS_UBAH_DATA,
  type BarisModel,
  type Giliran,
  type Jawaban,
  type ModelStok,
} from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { tanyaAsisten, type HasilTanya } from "./asisten-actions";

// Pengecualian dari DESIGN.md atas permintaan pemilik web (18 Okt 2026): panel asisten memakai kaca buram dengan
// sudut membulat, seperti panel iPhone, supaya terasa sebagai lapisan percakapan di atas alat kerja.
// Dosis kaca dibatasi ke panel ini saja (R-10); tombol pembukanya tetap padat supaya kontrasnya aman di atas halaman apa pun.
// Putih 85%: teks redup tetap di atas 4.5:1 walau yang di belakang panel elemen gelap (mis. foto sepatu hitam).

const CONTOH = ["Apa yang mau habis?", "Size 42 apa aja yang ready?", "Ide caption IG buat sepatu baru"];

type Pesan = { kunci: number; peran: "user" | "asisten"; teks: string; hasil?: HasilTanya };

function NamaModel({ model, tutup }: { model: ModelStok; tutup: () => void }) {
  return (
    <Link href={`/admin/produk/${model.id}`} onClick={tutup} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
      {model.brand} {model.nama}
      {!model.aktif && <span className="ml-1.5 font-normal no-underline">(nonaktif)</span>}
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

function IsiJawaban({ jawaban, ambang, tutup }: { jawaban: Jawaban; ambang: AmbangStok; tutup: () => void }) {
  switch (jawaban.jenis) {
    case "model":
      return (
        <div className="space-y-3">
          {jawaban.baris.map((b) => (
            <div key={b.model.id} className="space-y-1">
              <NamaModel model={b.model} tutup={tutup} />
              {b.size.length > 0 ? (
                <>
                  <DaftarSize baris={b} ambang={ambang} />
                  <p className="angka">Total {b.total} pasang</p>
                </>
              ) : (
                <p>{jawaban.size ? `Size ${jawaban.size} tidak tercatat di model ini.` : "Belum ada size yang tercatat."}</p>
              )}
            </div>
          ))}
        </div>
      );
    case "size":
      return (
        <div className="space-y-1">
          <p className="font-semibold">Size {jawaban.size} yang masih ada:</p>
          <ul className="divide-y divide-tinta/20">
            {jawaban.baris.map((b) => (
              <li key={b.model.id} className="flex items-center justify-between gap-3">
                <NamaModel model={b.model} tutup={tutup} />
                <span className="angka shrink-0">{b.stok} psg</span>
              </li>
            ))}
          </ul>
          {jawaban.lebih > 0 && <p>Dan {jawaban.lebih} model lagi. Sebut brandnya supaya lebih sempit.</p>}
        </div>
      );
    case "mau_habis":
      return (
        <div className="space-y-3">
          <p className="font-semibold">Size yang Sisa sedikit atau Habis:</p>
          {jawaban.baris.map((b) => (
            <div key={b.model.id} className="space-y-1">
              <NamaModel model={b.model} tutup={tutup} />
              <DaftarSize baris={b} ambang={ambang} />
            </div>
          ))}
          {jawaban.lebih > 0 && <p>Dan {jawaban.lebih} model lagi. Sebut brand atau modelnya supaya lebih sempit.</p>}
        </div>
      );
    case "tidak_ketemu":
      return <p>{jawaban.pesan}</p>;
    case "obrolan":
      return (
        <div className="space-y-1">
          <p className="whitespace-pre-line">{jawaban.teks}</p>
          <p className="text-xs text-redup">Jawaban umum dari AI, bisa keliru.</p>
        </div>
      );
    case "ubah_data":
      return <p>{TEKS_UBAH_DATA}</p>;
    case "tidak_paham":
      return <p>{TEKS_TIDAK_PAHAM}</p>;
  }
}

export function Asisten() {
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBuka = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const bawah = useRef<HTMLDivElement>(null);
  const urutan = useRef(0);
  const [teks, setTeks] = useState("");
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [sedang, mulai] = useTransition();

  useEffect(() => {
    bawah.current?.scrollIntoView({ block: "end" });
  }, [pesan, sedang]);

  function buka() {
    dialog.current?.showModal();
    input.current?.focus();
  }
  function tutup() {
    dialog.current?.close();
  }

  function kirim(pertanyaan: string) {
    const q = pertanyaan.trim();
    if (!q || sedang) return;
    // Riwayat untuk Gemini: pertanyaan + ringkasan jawaban dari server, bukan tampilan lengkapnya.
    const riwayat: Giliran[] = pesan
      .filter((p) => p.peran === "user" || p.hasil?.ringkas)
      .map((p) => ({ peran: p.peran, teks: p.peran === "user" ? p.teks : p.hasil!.ringkas! }))
      .slice(-BATAS_RIWAYAT);
    const tambah = (p: Omit<Pesan, "kunci">) => setPesan((s) => [...s, { ...p, kunci: ++urutan.current }].slice(-40));
    tambah({ peran: "user", teks: q });
    setTeks("");
    mulai(async () => {
      let hasil: HasilTanya;
      try {
        hasil = await tanyaAsisten(q, riwayat);
      } catch {
        hasil = { galat: "Koneksi terputus. Coba lagi." };
      }
      tambah({ peran: "asisten", teks: "", hasil });
    });
  }

  return (
    <>
      <button
        ref={tombolBuka}
        type="button"
        onClick={buka}
        aria-haspopup="dialog"
        className="fixed z-20 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-tinta px-4 font-semibold text-kertas shadow-lg hover:bg-[#33302B] active:bg-black"
        // Di atas tab bawah (56px + garis + area aman), sejajar tepi kanan kolom isi yang dibatasi max-w-2xl.
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))", right: "max(1rem, calc((100vw - 42rem) / 2 + 1rem))" }}
      >
        <IkonChat ukuran={20} />
        Asisten
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="judul-asisten"
        onClose={() => tombolBuka.current?.focus()}
        onClick={(e) => e.target === dialog.current && tutup()}
        className="fixed inset-x-2 bottom-2 top-auto m-0 h-[min(85dvh,640px)] max-h-none w-auto max-w-none overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-0 text-tinta shadow-2xl ring-1 ring-tinta/10 backdrop-blur-2xl backdrop-saturate-150 backdrop:bg-tinta/30 backdrop:backdrop-blur-sm sm:left-auto sm:right-[max(1rem,calc((100vw-42rem)/2+1rem))] sm:bottom-4 sm:w-[400px]"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-2 border-b border-tinta/10 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 id="judul-asisten" className="text-lg font-bold">
                Asisten
              </h2>
              <p className="text-xs text-redup">Stok dibaca langsung dari data toko. Jangan ketik data pembeli di sini.</p>
            </div>
            {pesan.length > 0 && (
              <button type="button" onClick={() => setPesan([])} disabled={sedang} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-2">
                Mulai ulang
              </button>
            )}
            <button type="button" onClick={tutup} aria-label="Tutup asisten" className="inline-flex size-11 shrink-0 items-center justify-center rounded-kontrol hover:bg-tinta/10">
              <IkonTutup ukuran={20} />
            </button>
          </header>

          <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {pesan.length === 0 && (
              <div className="space-y-3">
                <p>Halo! Tanya soal stok, atau apa saja yang bisa bantu kerjaan toko.</p>
                <div className="flex flex-wrap gap-2">
                  {CONTOH.map((c) => (
                    <button key={c} type="button" onClick={() => kirim(c)} className="tombol-garis min-h-11 rounded-xl bg-white/80 px-3 text-sm">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pesan.map((p) =>
              p.peran === "user" ? (
                <p key={p.kunci} className="ml-auto w-fit max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-tinta px-3 py-2 text-kertas">
                  {p.teks}
                </p>
              ) : (
                <div key={p.kunci} className="max-w-[92%] rounded-2xl rounded-bl-md border border-tinta/10 bg-white px-3 py-2">
                  {p.hasil?.galat ? (
                    <PesanGalat>{p.hasil.galat}</PesanGalat>
                  ) : (
                    p.hasil?.jawaban && p.hasil.ambang && <IsiJawaban jawaban={p.hasil.jawaban} ambang={p.hasil.ambang} tutup={tutup} />
                  )}
                </div>
              ),
            )}
            {sedang && (
              <p role="status" className="w-fit rounded-2xl rounded-bl-md border border-tinta/10 bg-white px-3 py-2 text-redup">
                Sebentar, aku cek dulu...
              </p>
            )}
            <div ref={bawah} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-tinta/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              kirim(teks);
            }}
          >
            <label htmlFor="tanya-asisten" className="sr-only">
              Pesan untuk asisten
            </label>
            <input
              ref={input}
              id="tanya-asisten"
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              maxLength={BATAS_PERTANYAAN}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="mis. af1 putih sisa berapa?"
              className="input rounded-xl bg-white"
            />
            <button type="submit" disabled={sedang || !teks.trim()} aria-label="Kirim" className="tombol-utama size-11 shrink-0 rounded-xl px-0">
              <IkonKirim ukuran={20} />
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
