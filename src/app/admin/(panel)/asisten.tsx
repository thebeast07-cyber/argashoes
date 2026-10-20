"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { IkonChat, IkonKirim, IkonTutup } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { PesanGalat } from "@/components/pesan";
import type { RencanaStokAsisten } from "@/lib/domain/asisten-aksi";
import { BATAS_PERTANYAAN, BATAS_RIWAYAT, uraiTeks, type BarisModel, type Giliran } from "@/lib/domain/asisten-stok";
import { BATAS_PESAN } from "@/lib/domain/pesan-admin";
import type { AmbangStok } from "@/lib/domain/stok";
import { formatWaktuWib } from "@/lib/domain/waktu";
import {
  ambilPesanBaru,
  cekPesanBaru,
  kirimPesanAdmin,
  simpanStokAsisten,
  tanyaAsisten,
  type HasilKirimPesan,
  type HasilSimpanStok,
  type HasilTanya,
} from "./asisten-actions";

// Pengecualian dari DESIGN.md atas permintaan pemilik web (18 Okt 2026): panel asisten memakai kaca buram dengan
// sudut membulat, seperti panel iPhone, supaya terasa sebagai lapisan percakapan di atas alat kerja.
// Dosis kaca dibatasi ke panel ini saja (R-10); tombol pembukanya tetap padat supaya kontrasnya aman di atas halaman apa pun.
// Putih 85%: teks redup tetap di atas 4.5:1 walau yang di belakang panel elemen gelap (mis. foto sepatu hitam).

const CONTOH = ["Stok keseluruhan berapa?", "Produk mana yang belum ada foto?", "Cara pasang banner promo?"];

// Jumlah pesan baru dicek ulang tiap pindah halaman, saat tab kembali dilihat, dan tiap menit selama halaman terbuka.
const JEDA_CEK_PESAN = 60_000;

type Penerima = { id: string; nama: string; peran: string };
type StatusSimpan = "menyimpan" | "dibatalkan" | HasilSimpanStok;
type Pesan = {
  kunci: number;
  peran: "user" | "asisten" | "masuk" | "terkirim";
  teks: string;
  hasil?: HasilTanya;
  simpan?: StatusSimpan;
  kirim?: StatusSimpan;
  /** Pesan masuk dari akun lain. */
  dari?: { id: string; nama: string; waktu: string };
  /** Pesan yang dikirim langsung lewat form Kirim pesan. */
  keNama?: string;
};

/** Catatan untuk Gemini di giliran berikutnya, supaya tidak mengusulkan ulang perubahan yang sudah diputuskan. */
function catatanSimpan(s: StatusSimpan | undefined): string {
  if (s === "dibatalkan") return "\n(Perubahan stok di kartu ini dibatalkan pengguna, stok tidak berubah.)";
  if (typeof s === "object" && s.sukses) return "\n(Perubahan stok di kartu ini sudah disimpan pengguna.)";
  return "";
}

function catatanKirim(s: StatusSimpan | undefined): string {
  if (s === "dibatalkan") return "\n(Pesan di kartu ini batal dikirim.)";
  if (typeof s === "object" && s.sukses) return "\n(Pesan di kartu ini sudah dikirim.)";
  return "";
}

/** Pesan masuk dan pesan langsung ikut diceritakan ke Gemini, supaya "balas dia: oke" bisa dipahami. */
function keRiwayat(p: Pesan): Giliran | null {
  if (p.peran === "user") return { peran: "user", teks: p.teks };
  if (p.peran === "masuk") return { peran: "user", teks: `(Pesan masuk dari ${p.dari?.nama}: ${p.teks})` };
  if (p.peran === "terkirim") return { peran: "user", teks: `(Pengguna mengirim pesan langsung ke ${p.keNama}: ${p.teks})` };
  if (!p.hasil?.teks) return null;
  return { peran: "asisten", teks: p.hasil.teks + catatanSimpan(p.simpan) + catatanKirim(p.kirim) };
}

function TeksBalasan({ teks, tutup }: { teks: string; tutup: () => void }) {
  const baris = uraiTeks(teks);
  const isi = (b: (typeof baris)[number]) =>
    b.isi.map((p, i) =>
      p.jenis === "tautan" ? (
        // Pindah halaman sambil menutup panel; riwayat obrolan tetap ada saat dibuka lagi.
        <Link key={i} href={p.href} onClick={tutup} className="font-semibold underline underline-offset-2">
          {p.teks}
        </Link>
      ) : p.jenis === "tebal" ? (
        <strong key={i}>{p.teks}</strong>
      ) : (
        <Fragment key={i}>{p.teks}</Fragment>
      ),
    );
  // Butir atau langkah yang berurutan digabung jadi satu daftar.
  const blok: React.ReactNode[] = [];
  for (let i = 0; i < baris.length; i++) {
    const jenis = baris[i].daftar;
    if (jenis) {
      const butir = [];
      while (i < baris.length && baris[i].daftar === jenis) butir.push(<li key={i}>{isi(baris[i++])}</li>);
      i--;
      blok.push(
        jenis === "nomor" ? (
          <ol key={`d${i}`} className="list-decimal space-y-1 pl-5">
            {butir}
          </ol>
        ) : (
          <ul key={`d${i}`} className="list-disc space-y-0.5 pl-5">
            {butir}
          </ul>
        ),
      );
    } else if (baris[i].isi.length > 0) {
      blok.push(<p key={i}>{isi(baris[i])}</p>);
    }
  }
  return <div className="space-y-2 break-words">{blok}</div>;
}

// Stok baru berubah setelah tombol Simpan stok ditekan. Kartu sekali pakai: setelah disimpan atau dibatalkan, tombolnya hilang.
function KartuStok({ rencana, status, simpan, batal }: { rencana: RencanaStokAsisten; status?: StatusSimpan; simpan: () => void; batal: () => void }) {
  const perModel = new Map<string, RencanaStokAsisten["baris"]>();
  for (const b of rencana.baris) perModel.set(b.productId, [...(perModel.get(b.productId) ?? []), b]);
  const hasil = typeof status === "object" ? status : null;
  const selesai = status === "dibatalkan" || Boolean(hasil?.sukses);
  return (
    <div className="mt-2 space-y-2 rounded-xl border-[1.5px] border-tinta bg-white p-3">
      {rencana.baris.length > 0 && <p className="text-sm font-semibold">Perubahan stok, cek dulu sebelum disimpan</p>}
      {[...perModel.values()].map((baris) => (
        <div key={baris[0].productId}>
          <p className="font-semibold">{baris[0].model}</p>
          <ul className="angka text-sm">
            {baris.map((b) => (
              <li key={b.variantId}>
                Size {b.size}: {b.dari} → <strong>{b.ke}</strong>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {rencana.masalah.map((m) => (
        <PesanGalat key={m}>{m}</PesanGalat>
      ))}
      {status === "dibatalkan" && <p className="text-sm font-semibold">Dibatalkan. Stok tidak berubah.</p>}
      {hasil?.sukses && <p className="text-sm font-semibold">{hasil.sukses}</p>}
      {hasil?.galat && <PesanGalat>{hasil.galat}</PesanGalat>}
      {rencana.baris.length > 0 && !selesai && (
        <div className="flex gap-2">
          <button type="button" onClick={simpan} disabled={status === "menyimpan"} className="tombol-utama min-h-11 flex-1 rounded-xl">
            {status === "menyimpan" ? "Menyimpan..." : "Simpan stok"}
          </button>
          <button type="button" onClick={batal} disabled={status === "menyimpan"} className="tombol-garis min-h-11 rounded-xl px-4">
            Batal
          </button>
        </div>
      )}
    </div>
  );
}

// Pesan yang disusun Gemini untuk akun lain. Baru terkirim setelah tombol Kirim ditekan.
function KartuPesan({
  pesan,
  status,
  kirim,
  batal,
}: {
  pesan: NonNullable<HasilTanya["pesan"]>;
  status?: StatusSimpan;
  kirim: () => void;
  batal: () => void;
}) {
  if ("masalah" in pesan) {
    return (
      <div className="mt-2">
        <PesanGalat>{pesan.masalah}</PesanGalat>
      </div>
    );
  }
  const r = pesan.rencana;
  const hasil = typeof status === "object" ? status : null;
  const selesai = status === "dibatalkan" || Boolean(hasil?.sukses);
  return (
    <div className="mt-2 space-y-2 rounded-xl border-[1.5px] border-tinta bg-white p-3">
      <p className="text-sm font-semibold">
        Pesan untuk {r.keNama} ({r.kePeran})
      </p>
      <p className="whitespace-pre-line break-words border-l-[3px] border-tinta/30 pl-3">{r.isi}</p>
      {status === "dibatalkan" && <p className="text-sm font-semibold">Tidak dikirim.</p>}
      {hasil?.sukses && <p className="text-sm font-semibold">{hasil.sukses}</p>}
      {hasil?.galat && <PesanGalat>{hasil.galat}</PesanGalat>}
      {!selesai && (
        <div className="flex gap-2">
          <button type="button" onClick={kirim} disabled={status === "menyimpan"} className="tombol-utama min-h-11 flex-1 rounded-xl">
            {status === "menyimpan" ? "Mengirim..." : `Kirim ke ${r.keNama}`}
          </button>
          <button type="button" onClick={batal} disabled={status === "menyimpan"} className="tombol-garis min-h-11 rounded-xl px-4">
            Batal
          </button>
        </div>
      )}
    </div>
  );
}

// Tulis pesan sendiri tanpa AI: tetap bisa dipakai saat kuota Gemini habis.
function FormKirimPesan({
  penerima,
  awalKe,
  batal,
  terkirim,
}: {
  penerima: Penerima[];
  awalKe: string;
  batal: () => void;
  terkirim: (keNama: string, isi: string) => void;
}) {
  const [ke, setKe] = useState(awalKe || (penerima.length === 1 ? penerima[0].id : ""));
  const [isi, setIsi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    area.current?.focus();
  }, []);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMengirim(true);
    setGalat(null);
    const hasil = await kirimPesanAdmin(ke, isi).catch((): HasilKirimPesan => ({ galat: "Koneksi terputus. Pesan belum terkirim." }));
    setMengirim(false);
    if (hasil.sukses) terkirim(penerima.find((a) => a.id === ke)?.nama ?? "", isi.trim());
    else setGalat(hasil.galat ?? "Pesan belum terkirim. Coba lagi.");
  }

  return (
    <form onSubmit={kirim} className="space-y-2 border-t border-tinta/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <p className="text-sm font-semibold">Kirim pesan langsung, tanpa AI</p>
      <div className="flex items-center gap-2">
        <label htmlFor="pesan-ke" className="text-sm">
          Ke
        </label>
        <select id="pesan-ke" value={ke} onChange={(e) => setKe(e.target.value)} className="input min-h-11 flex-1 rounded-xl bg-white">
          {penerima.length > 1 && <option value="">Pilih akun</option>}
          {penerima.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama} ({a.peran})
            </option>
          ))}
        </select>
      </div>
      <label htmlFor="pesan-isi" className="sr-only">
        Isi pesan
      </label>
      <textarea
        ref={area}
        id="pesan-isi"
        rows={3}
        value={isi}
        onChange={(e) => setIsi(e.target.value)}
        maxLength={BATAS_PESAN}
        placeholder="Tulis pesan..."
        className="input resize-none rounded-xl bg-white leading-snug"
      />
      {galat && <PesanGalat>{galat}</PesanGalat>}
      <div className="flex gap-2">
        <button type="submit" disabled={mengirim || !ke || !isi.trim()} className="tombol-utama min-h-11 flex-1 rounded-xl">
          {mengirim ? "Mengirim..." : "Kirim pesan"}
        </button>
        <button type="button" onClick={batal} disabled={mengirim} className="tombol-garis min-h-11 rounded-xl px-4">
          Batal
        </button>
      </div>
    </form>
  );
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

export function Asisten({ penerima, pesanBaruAwal }: { penerima: Penerima[]; pesanBaruAwal: number }) {
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
  const [baru, setBaru] = useState(pesanBaruAwal);
  /** null = form Kirim pesan tertutup; selain itu id penerima yang dipilih ("" = belum dipilih). */
  const [tulis, setTulis] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const cek = () => {
      if (document.visibilityState !== "visible" || dialog.current?.open) return;
      cekPesanBaru()
        .then(setBaru)
        .catch(() => {});
    };
    cek();
    const jeda = setInterval(cek, JEDA_CEK_PESAN);
    document.addEventListener("visibilitychange", cek);
    return () => {
      clearInterval(jeda);
      document.removeEventListener("visibilitychange", cek);
    };
  }, [pathname]);

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

  const tambah = (p: Omit<Pesan, "kunci">) => setPesan((s) => [...s, { ...p, kunci: ++urutan.current }].slice(-60));

  function buka() {
    dialog.current?.showModal();
    setTerbuka(true);
    input.current?.focus();
    if (baru > 0) {
      ambilPesanBaru()
        .then((daftar) => {
          setBaru(0);
          for (const m of daftar) tambah({ peran: "masuk", teks: m.isi, dari: { id: m.dariId, nama: m.dariNama, waktu: formatWaktuWib(new Date(m.dibuat)) } });
        })
        .catch(() => {});
    }
  }
  function tutup() {
    dialog.current?.close();
  }

  function kirim(pertanyaan: string) {
    const q = pertanyaan.trim();
    if (!q || sedang) return;
    const riwayat = pesan
      .map(keRiwayat)
      .filter((g): g is Giliran => g !== null)
      .slice(-BATAS_RIWAYAT);
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

  function aturSimpan(kunci: number, simpan: StatusSimpan) {
    setPesan((s) => s.map((p) => (p.kunci === kunci ? { ...p, simpan } : p)));
  }
  function aturKirim(kunci: number, kirim: StatusSimpan) {
    setPesan((s) => s.map((p) => (p.kunci === kunci ? { ...p, kirim } : p)));
  }

  function kirimKartu(p: Pesan) {
    const r = p.hasil?.pesan && "rencana" in p.hasil.pesan ? p.hasil.pesan.rencana : null;
    if (!r) return;
    aturKirim(p.kunci, "menyimpan");
    kirimPesanAdmin(r.keId, r.isi)
      .catch((): HasilKirimPesan => ({ galat: "Koneksi terputus. Pesan belum terkirim, coba lagi." }))
      .then((hasil) => aturKirim(p.kunci, hasil));
  }

  function simpanStok(p: Pesan) {
    const baris = p.hasil?.rencana?.baris;
    if (!baris || baris.length === 0) return;
    aturSimpan(p.kunci, "menyimpan");
    simpanStokAsisten(baris.map(({ variantId, dari, ke }) => ({ variantId, dari, ke })))
      .catch((): HasilSimpanStok => ({ galat: "Koneksi terputus. Stok belum tersimpan, coba lagi." }))
      .then((hasil) => aturSimpan(p.kunci, hasil));
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
        {baru > 0 && (
          <span className="angka -mr-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-bata px-1.5 text-sm font-bold text-white">
            {baru > 9 ? "9+" : baru}
            <span className="sr-only"> pesan baru</span>
          </span>
        )}
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
              <p className="truncate text-xs text-redup">Ubah stok dan pesan lewat konfirmasimu</p>
            </div>
            {penerima.length > 0 && tulis === null && (
              <button type="button" onClick={() => setTulis("")} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-2">
                Kirim pesan
              </button>
            )}
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
                <p>Mau cek atau ubah stok, tanya cara pakai fitur web, titip pesan ke akun lain, atau sekadar ngobrol? Tanya aja. Contoh ubah stok: “AF1 putih 42 tambah 3, 43 jadi 0”. Jangan ketik data pembeli di sini ya.</p>
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
              ) : p.peran === "terkirim" ? (
                <div key={p.kunci} className="ml-auto w-fit max-w-[85%] space-y-0.5 rounded-2xl rounded-br-md bg-tinta px-3 py-2 text-kertas">
                  <p className="text-xs font-semibold">Terkirim ke {p.keNama}</p>
                  <p className="whitespace-pre-line break-words">{p.teks}</p>
                </div>
              ) : p.peran === "masuk" && p.dari ? (
                <div key={p.kunci} className="max-w-[92%] space-y-1.5 rounded-2xl rounded-bl-md border-[1.5px] border-tinta bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-redup">
                    Pesan dari {p.dari.nama} · {p.dari.waktu}
                  </p>
                  <p className="whitespace-pre-line break-words">{p.teks}</p>
                  {penerima.some((a) => a.id === p.dari?.id) && (
                    <button type="button" onClick={() => setTulis(p.dari!.id)} className="tombol-garis min-h-11 rounded-xl px-3 text-sm">
                      Balas
                    </button>
                  )}
                </div>
              ) : (
                <div key={p.kunci} className="max-w-[92%] rounded-2xl rounded-bl-md border border-tinta/10 bg-white px-3 py-2">
                  {p.hasil?.galat ? (
                    <PesanGalat>{p.hasil.galat}</PesanGalat>
                  ) : (
                    <>
                      {p.hasil?.teks && <TeksBalasan teks={p.hasil.teks} tutup={tutup} />}
                      {p.hasil?.rencana && (
                        <KartuStok
                          rencana={p.hasil.rencana}
                          status={p.simpan}
                          simpan={() => simpanStok(p)}
                          batal={() => aturSimpan(p.kunci, "dibatalkan")}
                        />
                      )}
                      {p.hasil?.pesan && (
                        <KartuPesan pesan={p.hasil.pesan} status={p.kirim} kirim={() => kirimKartu(p)} batal={() => aturKirim(p.kunci, "dibatalkan")} />
                      )}
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

          {tulis !== null ? (
            <FormKirimPesan
              key={tulis}
              penerima={penerima}
              awalKe={tulis}
              batal={() => {
                setTulis(null);
                input.current?.focus();
              }}
              terkirim={(keNama, isi) => {
                setTulis(null);
                tambah({ peran: "terkirim", teks: isi, keNama });
              }}
            />
          ) : (
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
          )}
        </div>
      </dialog>
    </>
  );
}
