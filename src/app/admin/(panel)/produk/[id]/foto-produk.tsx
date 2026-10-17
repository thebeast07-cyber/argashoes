"use client";

import { useRef, useState } from "react";
import { IkonTambah } from "@/components/ikon";
import { PesanGalat } from "@/components/pesan";
import { FOTO_MAKS } from "@/lib/domain/foto";
import { kecilkanFoto } from "@/lib/foto/kecilkan";
import { aturFoto, unggahFoto } from "../actions";

// Foto per model. Ketuk foto untuk membuka aksinya, sama seperti panel size di daftar produk.
// Urutan diatur dengan tombol, bukan seret-lepas, karena seret-lepas sulit di HP dan tidak bisa dipakai lewat keyboard.

export function FotoProduk({ productId, foto }: { productId: string; foto: string[] }) {
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [status, setStatus] = useState("");
  const [galat, setGalat] = useState("");
  const tombol = useRef<Record<string, HTMLButtonElement | null>>({});

  const idx = dipilih ? foto.indexOf(dipilih) : -1;
  const sisa = FOTO_MAKS - foto.length;

  function tutup() {
    const url = dipilih;
    setDipilih(null);
    if (url) tombol.current[url]?.focus();
  }

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const semua = Array.from(input.files ?? []);
    // Dikosongkan supaya memilih file yang sama lagi tetap memicu onChange.
    input.value = "";
    if (semua.length === 0) return;
    const file = semua.slice(0, sisa);
    setGalat("");
    setSibuk(true);
    let berhasil = 0;
    for (const [i, f] of file.entries()) {
      setStatus(`Mengunggah ${i + 1} dari ${file.length}...`);
      let kecil: Blob;
      try {
        kecil = await kecilkanFoto(f);
      } catch {
        setGalat(`${f.name} tidak bisa dibaca browser. Pakai foto JPG atau PNG.`);
        break;
      }
      const form = new FormData();
      form.append("foto", kecil, "foto.jpg");
      const hasil = await unggahFoto(productId, form);
      if (hasil.error) {
        setGalat(hasil.error);
        break;
      }
      berhasil += 1;
    }
    setSibuk(false);
    const lewat = semua.length - file.length;
    setStatus(
      [berhasil > 0 ? `${berhasil} foto terunggah.` : "", lewat > 0 ? `${lewat} foto tidak diunggah karena batas ${FOTO_MAKS} foto.` : ""]
        .filter(Boolean)
        .join(" "),
    );
  }

  async function jalankan(aksi: { jenis: "sampul" | "hapus" } | { jenis: "geser"; arah: -1 | 1 }) {
    if (!dipilih) return;
    if (aksi.jenis === "hapus" && !confirm("Hapus foto ini dari model?")) return;
    setGalat("");
    setStatus("");
    setSibuk(true);
    const hasil = await aturFoto(productId, { ...aksi, url: dipilih });
    setSibuk(false);
    if (hasil.error) return setGalat(hasil.error);
    if (aksi.jenis === "hapus") {
      setDipilih(null);
      setStatus("Foto dihapus.");
    } else {
      setStatus(aksi.jenis === "sampul" ? "Foto jadi sampul." : "Urutan foto tersimpan.");
    }
  }

  return (
    <section aria-labelledby="judul-foto" className="space-y-3">
      <h2 id="judul-foto" className="text-lg font-bold">
        Foto{" "}
        <span className="angka font-normal text-redup">
          ({foto.length}/{FOTO_MAKS})
        </span>
      </h2>

      {foto.length === 0 ? (
        <p className="text-sm text-redup">Belum ada foto. Foto pertama jadi sampul di katalog.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {foto.map((url, i) => {
            const terbuka = url === dipilih;
            return (
              <li key={url}>
                <button
                  type="button"
                  ref={(el) => {
                    tombol.current[url] = el;
                  }}
                  onClick={() => setDipilih(terbuka ? null : url)}
                  onKeyDown={(e) => {
                    // Fokus masih di foto setelah diketuk; Escape harus menutup panel dari sini juga.
                    if (e.key === "Escape" && terbuka) tutup();
                  }}
                  aria-expanded={terbuka}
                  aria-controls={terbuka ? "aksi-foto" : undefined}
                  className={`relative block w-full overflow-hidden rounded-label border-[1.5px] bg-white ${
                    terbuka ? "border-tinta outline outline-2 outline-offset-2 outline-tinta" : "border-tinta/25"
                  }`}
                >
                  {/* Thumbnail kecil dari URL Blob atau /foto; fotonya sudah dikecilkan saat upload, jadi tanpa next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}${i === 0 ? ", sampul" : ""}`} loading="lazy" className="aspect-square w-full object-cover" />
                  {i === 0 && (
                    <span className="sempit absolute left-1 top-1 rounded-label bg-tinta px-1.5 py-0.5 text-xs font-semibold text-kertas">Sampul</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {dipilih && idx !== -1 && (
        <div
          id="aksi-foto"
          role="group"
          aria-label={`Foto ${idx + 1}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") tutup();
          }}
          className="space-y-2 rounded-label border-[1.5px] border-tinta bg-white p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="angka text-sm font-semibold">
              Foto {idx + 1} dari {foto.length}
              {idx === 0 && <span className="font-normal text-redup"> · sampul</span>}
            </p>
            <button type="button" onClick={tutup} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-2">
              Tutup
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {idx > 0 && (
              <button type="button" disabled={sibuk} onClick={() => jalankan({ jenis: "sampul" })} className="tombol-garis col-span-2 text-sm">
                Jadikan sampul
              </button>
            )}
            <button type="button" disabled={sibuk || idx === 0} onClick={() => jalankan({ jenis: "geser", arah: -1 })} className="tombol-garis text-sm">
              Geser ke kiri
            </button>
            <button
              type="button"
              disabled={sibuk || idx === foto.length - 1}
              onClick={() => jalankan({ jenis: "geser", arah: 1 })}
              className="tombol-garis text-sm"
            >
              Geser ke kanan
            </button>
          </div>
          <button
            type="button"
            disabled={sibuk}
            onClick={() => jalankan({ jenis: "hapus" })}
            className="min-h-11 px-0 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta"
          >
            Hapus foto
          </button>
        </div>
      )}

      {sisa > 0 ? (
        <label
          className={`tombol-garis w-full cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bata ${
            sibuk ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <input type="file" accept="image/*" multiple disabled={sibuk} onChange={pilihFile} className="sr-only" />
          <IkonTambah ukuran={18} />
          {sibuk ? "Memproses..." : foto.length === 0 ? "Tambah foto" : `Tambah foto (sisa ${sisa})`}
        </label>
      ) : (
        <p className="text-sm text-redup">Sudah {FOTO_MAKS} foto, batas per model. Hapus satu untuk menambah.</p>
      )}

      <p role="status" className="text-sm font-semibold empty:hidden">
        {status}
      </p>
      {galat && <PesanGalat umumkan>{galat}</PesanGalat>}
    </section>
  );
}
