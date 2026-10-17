"use client";

import { useEffect, useState, useTransition } from "react";
import { PesanGalat, RingkasanGalat } from "@/components/pesan";
import { BATAS_JUDUL } from "@/lib/domain/banner";
import { kecilkanFoto } from "@/lib/foto/kecilkan";
import { Kolom } from "../ui";
import { simpanBanner, type StateBanner } from "./actions";

export type NilaiAwal = {
  judul: string;
  tautan: string;
  mulai: string;
  selesai: string;
  gambarPotret: string | null;
  gambarLanskap: string | null;
};

type KolomGambar = "gambarPotret" | "gambarLanskap";

function usePratinjau(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function KolomGambarBanner({
  id,
  label,
  bantuan,
  error,
  lama,
  file,
  setFile,
  kelasPratinjau,
}: {
  id: KolomGambar;
  label: string;
  bantuan: string;
  error?: string;
  lama: string | null;
  file: File | null;
  setFile: (f: File | null) => void;
  kelasPratinjau: string;
}) {
  const pratinjau = usePratinjau(file) ?? lama;
  return (
    <div className="space-y-2">
      <Kolom id={id} label={label} error={error} bantuan={bantuan}>
        <input
          id={id}
          name={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-bantuan`}
          className="input py-2 text-sm file:mr-3 file:rounded-kontrol file:border-0 file:bg-tinta file:px-3 file:py-2 file:font-semibold file:text-white"
        />
      </Kolom>
      {pratinjau ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pratinjau} alt="" className={`rounded-label border border-tinta/55 bg-white object-contain ${kelasPratinjau}`} />
      ) : (
        <p className="text-sm text-redup">Belum ada gambar.</p>
      )}
      {file && lama && (
        <button type="button" onClick={() => setFile(null)} className="min-h-11 text-sm font-semibold underline underline-offset-2">
          Batal, pakai gambar lama
        </button>
      )}
    </div>
  );
}

export function FormBanner({ id, awal }: { id: string | null; awal: NilaiAwal }) {
  const [nilai, setNilai] = useState(awal);
  const [potret, setPotret] = useState<File | null>(null);
  const [lanskap, setLanskap] = useState<File | null>(null);
  const [state, setState] = useState<StateBanner>({});
  const [sedang, mulai] = useTransition();

  const ubah = (k: keyof NilaiAwal) => (e: React.ChangeEvent<HTMLInputElement>) => setNilai((n) => ({ ...n, [k]: e.target.value }));
  const err = state.error ?? {};
  const desk = (k: string, bantuan = false) => (err[k] ? `${k}-error` : bantuan ? `${k}-bantuan` : undefined);

  function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.delete("gambarPotret");
    form.delete("gambarLanskap");
    mulai(async () => {
      const pilihan: [KolomGambar, File | null][] = [
        ["gambarPotret", potret],
        ["gambarLanskap", lanskap],
      ];
      for (const [k, f] of pilihan) {
        if (!f) continue;
        try {
          form.set(k, await kecilkanFoto(f), `${k}.jpg`);
        } catch {
          setState({ error: { [k]: "Gambar tidak bisa dibaca. Coba file lain." } });
          return;
        }
      }
      setState((await simpanBanner(id, form)) ?? {});
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-5" noValidate>
      <Kolom id="judul" label="Nama promo" error={err.judul} bantuan="Muncul di daftar banner dan dibacakan untuk pembeli yang memakai pembaca layar. Contoh: Promo 11.11 harga coret Samba.">
        <input id="judul" name="judul" value={nilai.judul} onChange={ubah("judul")} maxLength={BATAS_JUDUL} required aria-invalid={Boolean(err.judul)} aria-describedby={desk("judul", true)} className="input" />
      </Kolom>

      <KolomGambarBanner
        id="gambarPotret"
        label="Gambar untuk HP (potret)"
        bantuan="Disarankan 1080 x 1350 piksel (seperti post feed IG). Tampil utuh tanpa dipotong."
        error={err.gambarPotret}
        lama={awal.gambarPotret}
        file={potret}
        setFile={setPotret}
        kelasPratinjau="max-h-72 w-auto"
      />

      <KolomGambarBanner
        id="gambarLanskap"
        label="Gambar untuk desktop (lanskap)"
        bantuan="Disarankan 1600 x 900 piksel. Dipakai di layar lebar (laptop, tablet mendatar)."
        error={err.gambarLanskap}
        lama={awal.gambarLanskap}
        file={lanskap}
        setFile={setLanskap}
        kelasPratinjau="max-h-48 w-auto max-w-full"
      />

      <Kolom id="tautan" label="Tujuan saat gambar diketuk (opsional)" error={err.tautan} bantuan="Alamat halaman di web ini, mis. /?q=samba untuk hasil cari Samba, atau link https. Kosongkan kalau gambar cuma pengumuman.">
        <input id="tautan" name="tautan" value={nilai.tautan} onChange={ubah("tautan")} inputMode="url" autoCapitalize="none" autoCorrect="off" aria-invalid={Boolean(err.tautan)} aria-describedby={desk("tautan", true)} className="input" />
      </Kolom>

      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Kolom id="mulai" label="Mulai tayang (WIB)" error={err.mulai}>
          <input id="mulai" name="mulai" type="datetime-local" value={nilai.mulai} onChange={ubah("mulai")} required aria-invalid={Boolean(err.mulai)} aria-describedby={desk("mulai")} className="input" />
        </Kolom>
        <Kolom id="selesai" label="Selesai tayang (WIB)" error={err.selesai}>
          <input id="selesai" name="selesai" type="datetime-local" value={nilai.selesai} onChange={ubah("selesai")} required aria-invalid={Boolean(err.selesai)} aria-describedby={desk("selesai")} className="input" />
        </Kolom>
      </div>
      <p className="text-sm text-redup">Di web, banner muncul sebagai gambar di tengah layar saat pembeli membuka beranda. Kalau ditutup, banner yang sama baru muncul lagi 24 jam kemudian.</p>

      {state.pesan && <PesanGalat umumkan>{state.pesan}</PesanGalat>}
      {!state.pesan && <RingkasanGalat jumlah={Object.keys(err).length} pemicu={state} />}
      <button type="submit" disabled={sedang} className="tombol-utama w-full">
        {sedang ? "Menyimpan..." : "Simpan banner"}
      </button>
    </form>
  );
}
