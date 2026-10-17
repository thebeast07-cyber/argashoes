"use client";

import { useEffect, useState, useTransition } from "react";
import { BannerPromo } from "@/components/banner-promo";
import { PesanGalat, RingkasanGalat } from "@/components/pesan";
import { BATAS_JUDUL, BATAS_KETERANGAN, BATAS_TEKS_TOMBOL, TEKS_TOMBOL_BAWAAN } from "@/lib/domain/banner";
import { kecilkanFoto } from "@/lib/foto/kecilkan";
import { Kolom } from "../ui";
import { simpanBanner, type StateBanner } from "./actions";

export type NilaiAwal = {
  judul: string;
  keterangan: string;
  tautan: string;
  teksTombol: string;
  mulai: string;
  selesai: string;
  gambarUrl: string | null;
};

export function FormBanner({ id, awal }: { id: string | null; awal: NilaiAwal }) {
  const [nilai, setNilai] = useState(awal);
  const [file, setFile] = useState<File | null>(null);
  const [urlPratinjau, setUrlPratinjau] = useState<string | null>(null);
  const [hapusGambar, setHapusGambar] = useState(false);
  const [state, setState] = useState<StateBanner>({});
  const [sedang, mulai] = useTransition();

  useEffect(() => {
    if (!file) return setUrlPratinjau(null);
    const url = URL.createObjectURL(file);
    setUrlPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const ubah = (k: keyof NilaiAwal) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNilai((n) => ({ ...n, [k]: e.target.value }));
  const err = state.error ?? {};
  const desk = (k: string, bantuan = false) => (err[k] ? `${k}-error` : bantuan ? `${k}-bantuan` : undefined);
  const gambarTampil = urlPratinjau ?? (hapusGambar ? null : awal.gambarUrl);

  function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.delete("gambar");
    if (hapusGambar) form.set("hapusGambar", "1");
    mulai(async () => {
      if (file) {
        try {
          form.set("gambar", await kecilkanFoto(file), "banner.jpg");
        } catch {
          setState({ error: { gambar: "Gambar tidak bisa dibaca. Coba file lain." } });
          return;
        }
      }
      setState((await simpanBanner(id, form)) ?? {});
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      <div className="space-y-1">
        <p className="label-form">Pratinjau di web</p>
        <div className="overflow-hidden rounded-label border border-tinta/55">
          <BannerPromo
            pratinjau
            banner={{
              judul: nilai.judul.trim() || "Judul promo",
              keterangan: nilai.keterangan.trim() || null,
              gambarUrl: gambarTampil,
              tautan: nilai.tautan.trim() || null,
              teksTombol: nilai.tautan.trim() ? nilai.teksTombol.trim() || TEKS_TOMBOL_BAWAAN : null,
            }}
          />
        </div>
      </div>

      <Kolom id="judul" label="Judul" error={err.judul} bantuan={`Singkat dan jelas, maksimal ${BATAS_JUDUL} huruf. Contoh: Promo 11.11, harga coret semua Samba.`}>
        <input id="judul" name="judul" value={nilai.judul} onChange={ubah("judul")} maxLength={BATAS_JUDUL} required aria-invalid={Boolean(err.judul)} aria-describedby={desk("judul", true)} className="input" />
      </Kolom>

      <Kolom id="keterangan" label="Keterangan (opsional)" error={err.keterangan} bantuan={`Maksimal ${BATAS_KETERANGAN} huruf.`}>
        <textarea id="keterangan" name="keterangan" rows={2} value={nilai.keterangan} onChange={ubah("keterangan")} maxLength={BATAS_KETERANGAN} aria-invalid={Boolean(err.keterangan)} aria-describedby={desk("keterangan", true)} className="input" />
      </Kolom>

      <Kolom id="gambar" label="Gambar (opsional)" error={err.gambar} bantuan="Gambar tampil utuh tanpa dipotong. Ukuran yang enak dilihat di HP: 1200 x 600 piksel.">
        <input
          id="gambar"
          name="gambar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setHapusGambar(false);
          }}
          aria-invalid={Boolean(err.gambar)}
          aria-describedby={desk("gambar", true)}
          className="input py-2 text-sm file:mr-3 file:rounded-kontrol file:border-0 file:bg-tinta file:px-3 file:py-2 file:font-semibold file:text-white"
        />
      </Kolom>
      {(file || (awal.gambarUrl && !hapusGambar)) && (
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setHapusGambar(Boolean(awal.gambarUrl));
          }}
          className="min-h-11 text-sm font-semibold underline underline-offset-2"
        >
          {file ? "Batal pakai gambar ini" : "Hapus gambar"}
        </button>
      )}

      <Kolom id="tautan" label="Tujuan tombol (opsional)" error={err.tautan} bantuan="Alamat halaman di web ini, mis. /?q=samba untuk hasil cari Samba, atau link https. Kosongkan kalau banner tanpa tombol.">
        <input id="tautan" name="tautan" value={nilai.tautan} onChange={ubah("tautan")} inputMode="url" autoCapitalize="none" autoCorrect="off" aria-invalid={Boolean(err.tautan)} aria-describedby={desk("tautan", true)} className="input" />
      </Kolom>

      <Kolom id="teksTombol" label="Teks tombol (opsional)" error={err.teksTombol} bantuan={`Kosong berarti "${TEKS_TOMBOL_BAWAAN}". Maksimal ${BATAS_TEKS_TOMBOL} huruf.`}>
        <input id="teksTombol" name="teksTombol" value={nilai.teksTombol} onChange={ubah("teksTombol")} maxLength={BATAS_TEKS_TOMBOL} aria-invalid={Boolean(err.teksTombol)} aria-describedby={desk("teksTombol", true)} className="input" />
      </Kolom>

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Kolom id="mulai" label="Mulai tayang (WIB)" error={err.mulai}>
          <input id="mulai" name="mulai" type="datetime-local" value={nilai.mulai} onChange={ubah("mulai")} required aria-invalid={Boolean(err.mulai)} aria-describedby={desk("mulai")} className="input" />
        </Kolom>
        <Kolom id="selesai" label="Selesai tayang (WIB)" error={err.selesai}>
          <input id="selesai" name="selesai" type="datetime-local" value={nilai.selesai} onChange={ubah("selesai")} required aria-invalid={Boolean(err.selesai)} aria-describedby={desk("selesai")} className="input" />
        </Kolom>
      </div>

      {state.pesan && <PesanGalat umumkan>{state.pesan}</PesanGalat>}
      {!state.pesan && <RingkasanGalat jumlah={Object.keys(err).length} pemicu={state} />}
      <button type="submit" disabled={sedang} className="tombol-utama w-full">
        {sedang ? "Menyimpan..." : "Simpan banner"}
      </button>
    </form>
  );
}
