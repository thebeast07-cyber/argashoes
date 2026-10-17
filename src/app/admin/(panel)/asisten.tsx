"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { IkonChat, IkonKirim, IkonTutup } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { PesanGalat } from "@/components/pesan";
import { BATAS_PERTANYAAN, BATAS_RIWAYAT, uraiTeks, type BarisModel, type Giliran } from "@/lib/domain/asisten-stok";
import type { AmbangStok } from "@/lib/domain/stok";
import { tanyaAsisten, type HasilTanya } from "./asisten-actions";

// Pengecualian dari DESIGN.md atas permintaan pemilik web (18 Okt 2026): panel asisten memakai kaca buram dengan
// sudut membulat, seperti panel iPhone, supaya terasa sebagai lapisan percakapan di atas alat kerja.
// Dosis kaca dibatasi ke panel ini saja (R-10); tombol pembukanya tetap padat supaya kontrasnya aman di atas halaman apa pun.
// Putih 85%: teks redup tetap di atas 4.5:1 walau yang di belakang panel elemen gelap (mis. foto sepatu hitam).

const CONTOH = ["Stok keseluruhan berapa?", "Size apa yang mau habis?", "Ide caption IG buat sepatu baru"];

type Pesan = { kunci: number; peran: "user" | "asisten"; teks: string; hasil?: HasilTanya };

function TeksBalasan({ teks }: { teks: string }) {
  const baris = uraiTeks(teks);
  const isi = (b: (typeof baris)[number]) =>
    b.isi.map((p, i) => (p.tebal ? <strong key={i}>{p.teks}</strong> : <Fragment key={i}>{p.teks}</Fragment>));
  // Butir daftar yang berurutan digabung jadi satu <ul>.
  const blok: React.ReactNode[] = [];
  for (let i = 0; i < baris.length; i++) {
    if (baris[i].daftar) {
      const butir = [];
      while (i < baris.length && baris[i].daftar) butir.push(<li key={i}>{isi(baris[i++])}</li>);
      i--;
      blok.push(
        <ul key={`d${i}`} className="list-disc space-y-0.5 pl-5">
          {butir}
        </ul>,
      );
    } else if (baris[i].isi.length > 0) {
      blok.push(<p key={i}>{isi(baris[i])}</p>);
    }
  }
  return <div className="space-y-2 break-words">{blok}</div>;
}

function DataStok({ data, ambang, tutup }: { data: BarisModel[]; ambang: AmbangStok; tutup: () => void }) {
  return (
    <details className="group mt-2 border-t border-tinta/10 pt-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-semibold text-redup [&::-webkit-details-marker]:hidden">
        <span className="flex-1">Cek data stok dari database ({data.length} model)</span>
        <span aria-hidden="true" className="w-3 text-center text-base leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="space-y-3 pb-1">
        {data.map((b) => (
          <div key={b.model.id} className="space-y-1">
            <Link href={`/admin/produk/${b.model.id}`} onClick={tutup} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
              {b.model.brand} {b.model.nama}
              {!b.model.aktif && <span className="ml-1.5 font-normal no-underline">(nonaktif)</span>}
            </Link>
            {b.size.length > 0 ? (
              <>
                <ul className="flex flex-wrap gap-1.5">
                  {b.size.map((s) => (
                    <li key={s.size}>
                      <LabelSize size={s.size} stok={s.stok} ambang={ambang} keterangan={s.stok > 0 ? `${s.stok} psg` : "Habis"} />
                    </li>
                  ))}
                </ul>
                <p className="angka text-xs">Total {b.total} pasang</p>
              </>
            ) : (
              <p className="text-xs">Belum ada size yang tercatat.</p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Di HP, keyboard menutupi bagian bawah layar tanpa mengecilkan halaman (terutama Safari iPhone), sehingga panel
 * setinggi layar terdorong dan headernya hilang. Selama panel terbuka, tinggi dan posisinya mengikuti visualViewport.
 */
function useUkuranPanelHp(terbuka: boolean): React.CSSProperties | undefined {
  const [gaya, setGaya] = useState<React.CSSProperties>();
  useEffect(() => {
    const vv = window.visualViewport;
    if (!terbuka || !vv) return setGaya(undefined);
    const hp = window.matchMedia("(max-width: 639px)");
    const atur = () => {
      if (!hp.matches) return setGaya(undefined);
      const keyboardTerbuka = vv.height < window.innerHeight * 0.8;
      const tinggi = keyboardTerbuka ? vv.height - 16 : Math.min(vv.height * 0.85, 640);
      setGaya({ top: vv.offsetTop + vv.height - tinggi - 8, height: tinggi, bottom: "auto" });
    };
    atur();
    vv.addEventListener("resize", atur);
    vv.addEventListener("scroll", atur);
    hp.addEventListener("change", atur);
    return () => {
      vv.removeEventListener("resize", atur);
      vv.removeEventListener("scroll", atur);
      hp.removeEventListener("change", atur);
    };
  }, [terbuka]);
  return gaya;
}

export function Asisten() {
  const dialog = useRef<HTMLDialogElement>(null);
  const tombolBuka = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bawah = useRef<HTMLDivElement>(null);
  const urutan = useRef(0);
  const [terbuka, setTerbuka] = useState(false);
  const [teks, setTeks] = useState("");
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [sedang, mulai] = useTransition();
  const gayaHp = useUkuranPanelHp(terbuka);

  useEffect(() => {
    bawah.current?.scrollIntoView({ block: "end" });
  }, [pesan, sedang, gayaHp?.height]);

  // Kolom ketik ikut tinggi isinya sampai 5 baris, lalu menggulir.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [teks]);

  function buka() {
    dialog.current?.showModal();
    setTerbuka(true);
    input.current?.focus();
  }
  function tutup() {
    dialog.current?.close();
  }

  function kirim(pertanyaan: string) {
    const q = pertanyaan.trim();
    if (!q || sedang) return;
    const riwayat: Giliran[] = pesan
      .filter((p) => p.peran === "user" || p.hasil?.teks)
      .map((p) => ({ peran: p.peran, teks: p.peran === "user" ? p.teks : p.hasil!.teks! }))
      .slice(-BATAS_RIWAYAT);
    const tambah = (p: Omit<Pesan, "kunci">) => setPesan((s) => [...s, { ...p, kunci: ++urutan.current }].slice(-60));
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
        onClose={() => {
          setTerbuka(false);
          tombolBuka.current?.focus();
        }}
        onClick={(e) => e.target === dialog.current && tutup()}
        style={gayaHp}
        className="fixed inset-x-2 bottom-2 top-auto m-0 h-[min(85dvh,640px)] max-h-none w-auto max-w-none overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-0 text-tinta shadow-2xl ring-1 ring-tinta/10 backdrop-blur-2xl backdrop-saturate-150 backdrop:bg-tinta/30 backdrop:backdrop-blur-sm sm:left-auto sm:right-[max(1rem,calc((100vw-42rem)/2+1rem))] sm:bottom-4 sm:w-[420px]"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-1 border-b border-tinta/10 py-1 pl-4 pr-1">
            <div className="min-w-0 flex-1">
              <h2 id="judul-asisten" className="text-base font-bold">
                Asisten
              </h2>
              <p className="truncate text-xs text-redup">Hanya baca, tidak ubah data</p>
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

          <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 text-[15px] leading-relaxed">
            {pesan.length === 0 && (
              <div className="space-y-3">
                <p>Mau cek stok, cari ide, atau sekadar ngobrol? Tanya aja. Jangan ketik data pembeli di sini ya.</p>
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
                    <>
                      {p.hasil?.teks && <TeksBalasan teks={p.hasil.teks} />}
                      {p.hasil?.data && p.hasil.data.length > 0 && p.hasil.ambang && <DataStok data={p.hasil.data} ambang={p.hasil.ambang} tutup={tutup} />}
                    </>
                  )}
                </div>
              ),
            )}
            {sedang && (
              <p role="status" className="w-fit rounded-2xl rounded-bl-md border border-tinta/10 bg-white px-3 py-2 text-redup">
                Lagi ngecek...
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
            <textarea
              ref={input}
              id="tanya-asisten"
              rows={1}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              onKeyDown={(e) => {
                // Enter kirim, Shift+Enter baris baru (keyboard fisik). Di HP, tombol kirim dipakai.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  kirim(teks);
                }
              }}
              maxLength={BATAS_PERTANYAAN}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Tulis pesan..."
              className="input resize-none rounded-xl bg-white leading-snug"
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
