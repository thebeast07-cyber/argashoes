"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Gambar } from "@/components/gambar";
import { IkonChat, IkonKembali, IkonTambah } from "@/components/ikon";
import { PesanGalat, RingkasanGalat } from "@/components/pesan";
import { hapusItem, JUMLAH_MAKS, totalKeranjang, ubahJumlah } from "@/lib/domain/keranjang";
import { formatRupiah } from "@/lib/domain/produk";
import { bacaUtm, useKeranjang } from "@/lib/keranjang/use-keranjang";
import { kirimPesanan, type StateCheckout } from "./actions";

function TombolKirim({ mati }: { mati: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={mati || pending} className="tombol-utama min-h-[52px] w-full text-[17px]">
      <IkonChat />
      {pending ? "Mencatat pesanan..." : "Kirim pesanan ke WhatsApp"}
    </button>
  );
}

function Kolom({ id, label, error, bantuan, children }: { id: string; label: string; error?: string; bantuan?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label-form">
        {label}
      </label>
      {children}
      {bantuan && !error && (
        <p id={`${id}-bantuan`} className="mt-1 text-[13px] text-redup">
          {bantuan}
        </p>
      )}
      {error && (
        <PesanGalat id={`${id}-error`} kecil>
          {error}
        </PesanGalat>
      )}
    </div>
  );
}

export function Keranjang({ bisaPesan }: { bisaPesan: boolean }) {
  const { items, siap, ubah } = useKeranjang();
  const [state, aksi] = useFormState<StateCheckout, FormData>(kirimPesanan, {});
  const e = state.error ?? {};
  const desc = (id: string, bantuan = false) => (e[id] ? `${id}-error` : bantuan ? `${id}-bantuan` : undefined);
  const { subtotal } = totalKeranjang(items);
  const masalahItem = (productId: string, size: string) => state.masalah?.find((m) => m.productId === productId && m.size === size)?.pesan;

  return (
    <main className="px-[max(var(--sisi),calc((100%-1200px)/2))] pb-10 pt-2">
      <Link href="/" className="inline-flex min-h-12 items-center gap-1.5 font-bold">
        <IkonKembali ukuran={20} />
        {items.length > 0 ? "Tambah model lain" : "Katalog"}
      </Link>
      <h1 className="mb-3.5 mt-2 text-[32px] font-black leading-[1.02] tracking-tight min-[900px]:text-[44px]">Keranjang</h1>

      {!siap ? (
        <p role="status" className="text-redup">
          Memuat keranjang...
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-label border-[1.5px] border-tinta bg-white p-5">
          <p className="mb-3">Keranjang masih kosong.</p>
          <Link href="/" className="tombol-utama">
            Cari size di katalog
          </Link>
        </div>
      ) : (
        <div className="min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)] min-[900px]:items-start min-[900px]:gap-14">
          <div>
            <ul className="space-y-2.5">
              {items.map((i) => {
                const kunci = { productId: i.productId, size: i.size };
                const masalah = masalahItem(i.productId, i.size);
                return (
                  <li key={`${i.productId}-${i.size}`} className={`rounded-label border bg-white p-3 ${masalah ? "border-[1.5px] border-bata" : "border-tinta/25"}`}>
                    <div className="grid grid-cols-[76px_1fr] gap-3">
                      <Link href={`/produk/${i.productId}`} tabIndex={-1} aria-hidden="true">
                        <Gambar src={i.foto} alt="" className="aspect-square w-full" />
                      </Link>
                      <div className="min-w-0">
                        <h2 className="font-bold leading-tight">
                          <Link href={`/produk/${i.productId}`} className="hover:underline">
                            {i.brand} {i.nama}
                          </Link>
                        </h2>
                        <p className="angka mb-2 mt-0.5 text-sm text-redup">
                          Size {i.size} · {formatRupiah(i.harga)}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div role="group" aria-label={`Jumlah pasang ${i.nama} size ${i.size}`} className="inline-flex items-center rounded-kontrol border-[1.5px] border-tinta bg-white">
                            <button
                              type="button"
                              onClick={() => ubah((xs) => ubahJumlah(xs, kunci, i.jumlah - 1))}
                              disabled={i.jumlah <= 1}
                              aria-label="Kurangi satu pasang"
                              className="flex size-11 items-center justify-center text-2xl leading-none hover:bg-kertas-gelap disabled:text-habis"
                            >
                              −
                            </button>
                            <output aria-live="polite" className="angka min-w-7 text-center font-bold">
                              {i.jumlah}
                            </output>
                            <button
                              type="button"
                              onClick={() => ubah((xs) => ubahJumlah(xs, kunci, i.jumlah + 1))}
                              disabled={i.jumlah >= JUMLAH_MAKS}
                              aria-label="Tambah satu pasang"
                              className="flex size-11 items-center justify-center hover:bg-kertas-gelap disabled:text-habis"
                            >
                              <IkonTambah ukuran={20} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => ubah((xs) => hapusItem(xs, kunci))}
                            className="min-h-11 px-1.5 font-semibold text-redup underline underline-offset-[3px] hover:text-tinta"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                    {masalah && (
                      <div className="mt-2">
                        <PesanGalat umumkan>{masalah}</PesanGalat>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3.5 flex items-baseline justify-between border-t-[1.5px] border-tinta py-3 text-lg font-extrabold">
              <span>Subtotal</span>
              <span className="angka">{formatRupiah(subtotal)}</span>
            </div>
            <p className="text-[15px] text-redup">Belum termasuk ongkir.</p>
          </div>

          <form action={aksi} noValidate className="mt-6 space-y-4 min-[900px]:mt-0">
            <h2 className="text-[22px] font-extrabold">Data pengiriman</h2>
            {!bisaPesan && <PesanGalat>Pemesanan belum dibuka: toko belum memasang nomor WhatsApp.</PesanGalat>}
            <input type="hidden" name="items" value={JSON.stringify(items.map(({ productId, size, jumlah }) => ({ productId, size, jumlah })))} />
            <input type="hidden" name="utm" value={siap ? bacaUtm() : ""} />
            {/* Jebakan bot: tidak terlihat dan tidak bisa difokus oleh orang. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="situs">Situs web</label>
              <input id="situs" name="situs" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <Kolom id="nama" label="Nama penerima" error={e.nama}>
              <input id="nama" name="nama" autoComplete="name" className="input" aria-invalid={Boolean(e.nama)} aria-describedby={desc("nama")} />
            </Kolom>
            <Kolom id="wa" label="Nomor WhatsApp" error={e.wa}>
              <input id="wa" name="wa" type="tel" inputMode="tel" autoComplete="tel" className="input" aria-invalid={Boolean(e.wa)} aria-describedby={desc("wa")} />
            </Kolom>
            <Kolom id="alamat" label="Alamat lengkap" error={e.alamat} bantuan="Jalan, nomor, kecamatan, kota, kode pos.">
              <textarea id="alamat" name="alamat" rows={3} autoComplete="street-address" className="input" aria-invalid={Boolean(e.alamat)} aria-describedby={desc("alamat", true)} />
            </Kolom>
            <Kolom id="catatan" label="Catatan untuk toko (opsional)" error={e.catatan}>
              <textarea id="catatan" name="catatan" rows={2} className="input" aria-invalid={Boolean(e.catatan)} aria-describedby={desc("catatan")} />
            </Kolom>
            <div>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  id="setuju"
                  name="setuju"
                  className="mt-2 size-6 shrink-0 accent-bata"
                  aria-invalid={Boolean(e.setuju)}
                  aria-describedby={e.setuju ? "setuju-error" : undefined}
                />
                <span className="pt-1 text-[15px]">Saya setuju data ini dipakai toko untuk memproses pesanan ini.</span>
              </label>
              {e.setuju && (
                <PesanGalat id="setuju-error" kecil>
                  {e.setuju}
                </PesanGalat>
              )}
            </div>
            <RingkasanGalat jumlah={Object.keys(e).length} pemicu={state} />
            {state.pesan && <PesanGalat umumkan>{state.pesan}</PesanGalat>}
            {/* Masalah stok ditulis lengkap di dekat tombol, karena di HP pembeli sedang di bawah form. */}
            {state.masalah?.map((m) => (
              <PesanGalat key={`${m.productId}-${m.size}-${m.pesan}`} umumkan>
                {m.pesan}
              </PesanGalat>
            ))}
            <TombolKirim mati={!bisaPesan} />
            {/* Satu baris, bukan paragraf: menjawab ragu bayar ke rekening pribadi (risiko konversi di PRD). */}
            <p className="text-center text-sm font-semibold text-redup">Belum bayar. Stok dan ongkir dicek dulu di WhatsApp.</p>
          </form>
        </div>
      )}
    </main>
  );
}
