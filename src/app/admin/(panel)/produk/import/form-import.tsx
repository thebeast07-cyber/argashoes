"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { BATAS_UKURAN_CSV } from "@/lib/csv";
import { PesanGalat } from "@/components/pesan";
import { pratinjauImport, terapkanImport, type HasilImport, type JenisImport } from "../actions";

const KOLOM: Record<JenisImport, string> = {
  stok: "sku, size, stok",
  katalog: "sku, brand, nama, kategori, harga, harga_coret, fee_per_pasang, size, stok",
};

function Tombol({ children, utama, mati }: { children: React.ReactNode; utama?: boolean; mati?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || mati} className={`${utama ? "tombol-utama" : "tombol-garis"} w-full`}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

function Laporan({ hasil }: { hasil: HasilImport }) {
  // Kalau ada baris error, tidak ada yang disimpan: ringkasan perubahan disembunyikan supaya tidak menyesatkan.
  const adaError = Boolean(hasil.totalError);
  return (
    <div className="space-y-3">
      {hasil.pesan && <PesanGalat umumkan>{hasil.pesan}</PesanGalat>}
      {hasil.sukses && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm font-semibold">
          {hasil.sukses}
        </p>
      )}
      {hasil.ringkasan && !adaError && (
        <ul className="angka space-y-1 text-sm">
          {hasil.ringkasan.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {hasil.peringatan?.map((p) => (
        <p key={p} className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          {p}
        </p>
      ))}
      {hasil.totalError ? (
        <div role="alert" className="space-y-2 rounded-label border-[1.5px] border-bata bg-white p-3">
          <p className="text-sm font-semibold">
            {hasil.totalError} baris bermasalah. Betulkan di file, lalu pilih ulang. Tidak ada yang disimpan.
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {hasil.error?.map((e) => (
              <li key={`${e.baris}-${e.pesan}`}>
                <span className="angka font-semibold">Baris {e.baris}:</span> {e.pesan}
              </li>
            ))}
          </ul>
          {hasil.totalError > (hasil.error?.length ?? 0) && <p className="text-xs text-redup">Hanya 100 masalah pertama yang ditampilkan.</p>}
        </div>
      ) : null}
      {!hasil.sukses && !adaError && hasil.contoh && hasil.contoh.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Lihat rincian perubahan</summary>
          <ul className="angka max-h-72 space-y-1 overflow-y-auto">
            {hasil.contoh.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function FormImport() {
  const [jenis, setJenisState] = useState<JenisImport>("stok");
  const [file, setFile] = useState<{ nama: string; isi: string } | null>(null);
  // Token baru tiap ganti file/jenis: hasil pratinjau dan simpan hanya tampil untuk pilihan yang sedang aktif.
  const [urutan, setUrutan] = useState(0);
  const token = String(urutan);
  const tokenBaru = () => setUrutan((n) => n + 1);
  const setJenis = (j: JenisImport) => {
    setJenisState(j);
    tokenBaru();
  };
  const [errorFile, setErrorFile] = useState("");
  const [pratinjau, aksiPratinjau] = useFormState<HasilImport, FormData>(pratinjauImport, {});
  const [hasil, aksiTerapkan] = useFormState<HasilImport, FormData>(terapkanImport, {});

  const sudahDisimpan = hasil.token === token;
  const pratinjauBerlaku = pratinjau.token === token && !sudahDisimpan;

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorFile("");
    tokenBaru();
    const input = e.target;
    const f = input.files?.[0];
    // Dikosongkan supaya memilih file yang sama (setelah dibetulkan) tetap terbaca ulang.
    input.value = "";
    if (!f) return;
    if (f.size > BATAS_UKURAN_CSV) {
      setFile(null);
      return setErrorFile("File terlalu besar (maksimal sekitar 1,5 MB). Pecah jadi beberapa file.");
    }
    setFile({ nama: f.name, isi: await f.text() });
  }

  const dataTersembunyi = (
    <>
      <input type="hidden" name="jenis" value={jenis} />
      <input type="hidden" name="isi" value={file?.isi ?? ""} />
      <input type="hidden" name="namaFile" value={file?.nama ?? ""} />
      <input type="hidden" name="token" value={token} />
    </>
  );

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="label-form">Jenis import</legend>
        {(
          [
            ["stok", "Update stok", "Untuk update rutin tiap pagi. Hanya mengubah stok size yang sudah ada."],
            ["katalog", "Katalog lengkap", "Menambah model dan size baru, mengubah harga dan stok."],
          ] as const
        ).map(([nilai, judul, ket]) => (
          <label key={nilai} className={`flex cursor-pointer gap-3 rounded-label border-[1.5px] p-3 ${jenis === nilai ? "border-tinta bg-white" : "border-tinta/55"}`}>
            <input type="radio" name="jenis-pilihan" value={nilai} checked={jenis === nilai} onChange={() => setJenis(nilai)} className="mt-1 size-5 accent-bata" />
            <span className="text-sm">
              <span className="block font-semibold">{judul}</span>
              <span className="block text-redup">{ket}</span>
              <span className="sempit mt-1 block text-xs">Kolom: {KOLOM[nilai]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="text-sm text-redup">
        Paling gampang: unduh{" "}
        <a href={`/admin/produk/ekspor?format=${jenis}`} className="font-semibold text-tinta underline underline-offset-2">
          file {jenis === "stok" ? "stok" : "katalog"} saat ini
        </a>
        , ubah di Excel atau Google Sheets, lalu simpan sebagai CSV dan pilih di bawah. Pemisah koma dan titik koma sama-sama bisa.
      </p>

      <div>
        <label htmlFor="file-csv" className="label-form">
          File CSV
        </label>
        <input
          id="file-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={pilihFile}
          aria-describedby="file-terpilih"
          className="input py-2 text-sm file:mr-3 file:rounded-kontrol file:border-0 file:bg-tinta file:px-3 file:py-2 file:font-semibold file:text-white"
        />
        <p id="file-terpilih" className="mt-1 text-sm">
          {file ? (
            <>
              Terpilih: <span className="font-semibold">{file.nama}</span>
            </>
          ) : (
            <span className="text-redup">Belum ada file dipilih.</span>
          )}
        </p>
        {errorFile && (
          <PesanGalat umumkan kecil>
            {errorFile}
          </PesanGalat>
        )}
      </div>

      <form action={aksiPratinjau}>
        {dataTersembunyi}
        <Tombol mati={!file}>Periksa file</Tombol>
      </form>

      {pratinjauBerlaku && <Laporan hasil={pratinjau} />}

      {pratinjauBerlaku && pratinjau.bisaDiterapkan && (
        <form action={aksiTerapkan}>
          {dataTersembunyi}
          <Tombol utama>Simpan semua perubahan</Tombol>
        </form>
      )}
      {pratinjauBerlaku && pratinjau.totalError === 0 && !pratinjau.bisaDiterapkan && !pratinjau.pesan && (
        <p className="text-sm text-redup">Isi file sama dengan data sekarang. Tidak ada yang perlu disimpan.</p>
      )}

      {sudahDisimpan && <Laporan hasil={hasil} />}
    </div>
  );
}
