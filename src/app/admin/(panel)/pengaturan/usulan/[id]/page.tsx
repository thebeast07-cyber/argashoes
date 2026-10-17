import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonKembali } from "@/components/ikon";
import { DaftarTier } from "@/components/label-tier";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { cariTier, type FeeTier } from "@/lib/domain/fee";
import type { Rekening } from "@/lib/domain/pengaturan";
import { formatRupiah } from "@/lib/domain/produk";
import { dampakTier, LABEL_STATUS, usulanBasi, type NilaiUsulan } from "@/lib/domain/usulan";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { ambilUsulan, getTiers, nilaiSekarang, produkUntukDampak, type UsulanLengkap } from "@/lib/pengaturan/data";
import { judulUsulan } from "@/lib/pengaturan/ringkasan";
import { FormKeputusan, TombolTarik } from "./keputusan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usulan · Argashoes" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PESAN_HASIL: Record<string, string> = {
  disetujui: "Usulan disetujui dan sudah berlaku.",
  ditolak: "Usulan ditolak. Tidak ada yang berubah.",
  ditarik: "Usulan ditarik. Tidak ada yang berubah.",
};

function Judul({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-redup">{children}</h3>;
}

function BandingTier({ dari, ke, labelDari }: { dari: FeeTier[]; ke: FeeTier[]; labelDari: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Judul>{labelDari}</Judul>
        {dari.length === 0 ? <p className="text-sm text-redup">Belum ada tier.</p> : <DaftarTier tiers={dari} label={labelDari} />}
      </div>
      <div>
        <Judul>Diusulkan</Judul>
        <DaftarTier tiers={ke} label="Tier yang diusulkan" />
      </div>
    </div>
  );
}

async function DampakTier({ sekarang, ke }: { sekarang: FeeTier[]; ke: FeeTier[] }) {
  const produk = await produkUntukDampak(await getDb());
  if (produk.length === 0) return <p className="text-sm text-redup">Belum ada produk aktif, jadi belum ada fee yang terdampak.</p>;
  const d = dampakTier(produk, sekarang, ke);
  const tampil = d.berubah.slice(0, 30);
  return (
    <section aria-labelledby="judul-dampak" className="space-y-2">
      <h2 id="judul-dampak" className="text-lg font-bold">
        Dampak ke produk aktif
      </h2>
      {d.berubah.length === 0 ? (
        <p className="text-sm">Tidak ada produk aktif yang fee-nya berubah.</p>
      ) : (
        <>
          <p className="text-sm">
            {d.berubah.length} produk fee-nya berubah: {d.naik} naik, {d.turun} turun.
          </p>
          <ul className="angka divide-y divide-tinta/15 border-y border-tinta/15 text-sm">
            {tampil.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-x-3 py-2">
                <span className="min-w-0">
                  {p.brand} {p.nama} <span className="text-redup">· {formatRupiah(p.harga)}</span>
                </span>
                <span className="font-semibold">
                  {p.dari === null ? "tanpa fee" : formatRupiah(p.dari)} → {p.ke === null ? "tanpa fee" : formatRupiah(p.ke)}
                </span>
              </li>
            ))}
          </ul>
          {d.berubah.length > tampil.length && <p className="text-sm text-redup">Dan {d.berubah.length - tampil.length} produk lain.</p>}
        </>
      )}
      {d.feeKhusus > 0 && <p className="text-sm text-redup">{d.feeKhusus} produk punya fee khusus, jadi tidak terpengaruh tier.</p>}
    </section>
  );
}

async function BandingFeeProduk({ u, dari, labelDari }: { u: UsulanLengkap; dari: number | null; labelDari: string }) {
  const tiers = await getTiers(await getDb());
  const feeTier = u.produkHarga === null ? null : (cariTier(u.produkHarga, tiers)?.fee ?? null);
  const teks = (fee: number | null) =>
    fee !== null ? (
      formatRupiah(fee)
    ) : (
      <>
        Ikut tier
        <span className="block text-sm font-normal text-redup">{feeTier !== null ? formatRupiah(feeTier) : "belum ada tier yang cocok"}</span>
      </>
    );
  return (
    <div className="space-y-3">
      {u.productId && (
        <p className="text-sm">
          <Link href={`/admin/produk/${u.productId}`} className="font-semibold underline underline-offset-2">
            {u.produkBrand} {u.produkNama}
          </Link>
          {u.produkHarga !== null && <span className="angka text-redup"> · harga jual {formatRupiah(u.produkHarga)}</span>}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-label border-[1.5px] border-tinta/40 bg-white px-3 py-2">
          <Judul>{labelDari}</Judul>
          <p className="angka font-bold">{teks(dari)}</p>
        </div>
        <div className="rounded-label border-[1.5px] border-tinta bg-white px-3 py-2">
          <Judul>Diusulkan</Judul>
          <p className="angka text-xl font-bold">{teks(u.isi.nilai as number | null)}</p>
        </div>
      </div>
    </div>
  );
}

function BandingRekening({ dari, ke, labelDari }: { dari: Rekening | null; ke: Rekening; labelDari: string }) {
  const kolom = [
    { k: "bank", label: "Bank" },
    { k: "nomor", label: "Nomor" },
    { k: "atasNama", label: "Atas nama" },
  ] as const;
  return (
    <div className="overflow-x-auto">
      <table className="angka w-full text-left text-sm">
        <thead>
          <tr className="border-b border-tinta/20 text-redup">
            <th scope="col" className="py-2 pr-3 font-semibold">
              <span className="sr-only">Kolom</span>
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              {labelDari}
            </th>
            <th scope="col" className="py-2 font-semibold">
              Diusulkan
            </th>
          </tr>
        </thead>
        <tbody>
          {kolom.map(({ k, label }) => {
            const berubah = dari?.[k] !== ke[k];
            return (
              <tr key={k} className="border-b border-tinta/10 align-top">
                <th scope="row" className="py-2 pr-3 font-normal text-redup">
                  {label}
                </th>
                <td className="break-all py-2 pr-3">{dari?.[k] ?? "kosong"}</td>
                <td className="break-all py-2">
                  <span className={berubah ? "text-base font-bold" : ""}>{ke[k]}</span>
                  {berubah && <span className="block text-xs font-semibold">berubah</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function HalamanDetailUsulan({ params, searchParams }: { params: { id: string }; searchParams: { baru?: string; hasil?: string } }) {
  const user = await wajibIzin("usulan.ajukan");
  if (!UUID.test(params.id)) notFound();
  const db = await getDb();
  const u = await ambilUsulan(db, params.id);
  if (!u) notFound();

  const pemutus = punyaIzin(user.peran, "usulan.putuskan");
  const menunggu = u.status === "menunggu";
  const sekarang = menunggu ? await nilaiSekarang(db, u.jenis, u.productId) : undefined;
  const basi = menunggu && (sekarang === undefined || usulanBasi(u.jenis, u.dasar.nilai as NilaiUsulan[typeof u.jenis], sekarang));
  // Selama menunggu bandingkan dengan yang berlaku sekarang; setelah diputuskan, dengan yang berlaku saat diusulkan.
  const dari = menunggu && sekarang !== undefined ? sekarang : u.dasar.nilai;
  const labelDari = menunggu ? "Berlaku sekarang" : "Saat diusulkan";

  return (
    <div className="space-y-6">
      <Link href="/admin/pengaturan/usulan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Usulan
      </Link>

      {searchParams.baru && menunggu && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          Usulan terkirim. Pemilik web melihatnya di panel admin. Sampai diputuskan, angka lama tetap berlaku.
        </p>
      )}
      {searchParams.hasil && PESAN_HASIL[searchParams.hasil] && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          {PESAN_HASIL[searchParams.hasil]}
        </p>
      )}

      <div className="space-y-1">
        <p className="sempit inline-block rounded-label border-[1.5px] border-tinta px-1.5 py-0.5 text-xs font-semibold">{LABEL_STATUS[u.status]}</p>
        <h1 className="text-2xl font-bold">{judulUsulan(u.jenis, { nama: u.produkNama, brand: u.produkBrand })}</h1>
        <p className="text-sm text-redup">
          Diajukan {u.diajukanOleh} · {formatWaktuWib(u.diajukanPada)}
        </p>
      </div>

      {u.alasan && (
        <div>
          <Judul>Alasan dari pengaju</Judul>
          <p className="whitespace-pre-line text-sm">{u.alasan}</p>
        </div>
      )}

      {basi && (
        <p role="alert" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Nilai yang berlaku sudah berubah sejak usulan ini dibuat. Kalau disetujui, perubahan itu akan tertimpa tanpa ketahuan, jadi usulan ini tidak
          bisa disetujui lagi. {pemutus ? "Tolak, lalu minta admin toko mengusulkan ulang dari angka terbaru." : "Tarik usulan ini, lalu kirim ulang dari angka terbaru."}
        </p>
      )}

      <section aria-label="Perbandingan" className="space-y-4">
        {u.jenis === "tier" && <BandingTier dari={dari as FeeTier[]} ke={u.isi.nilai as FeeTier[]} labelDari={labelDari} />}
        {u.jenis === "fee_produk" && <BandingFeeProduk u={u} dari={dari as number | null} labelDari={labelDari} />}
        {u.jenis === "rekening" && <BandingRekening dari={dari as Rekening | null} ke={u.isi.nilai as Rekening} labelDari={labelDari} />}
      </section>

      {u.jenis === "tier" && menunggu && !basi && <DampakTier sekarang={sekarang as FeeTier[]} ke={u.isi.nilai as FeeTier[]} />}

      {!menunggu && u.diputuskanPada && (
        <div className="space-y-1 border-t border-tinta/20 pt-4 text-sm">
          <p>
            {LABEL_STATUS[u.status]} {u.diputuskanOleh} · {formatWaktuWib(u.diputuskanPada)}
          </p>
          {u.catatanKeputusan && <p className="whitespace-pre-line">Catatan: {u.catatanKeputusan}</p>}
        </div>
      )}

      {menunggu && pemutus && (
        <section aria-labelledby="judul-keputusan" className="space-y-3 border-t border-tinta/20 pt-4">
          <h2 id="judul-keputusan" className="text-lg font-bold">
            Keputusanmu
          </h2>
          {u.jenis === "rekening" && !basi && (
            <p className="text-sm font-semibold">
              Cocokkan nomor ini langsung ke retailer lewat telepon sebelum menyetujui. Kalau akun admin toko dipakai orang lain, usulan rekening adalah cara
              uang pelanggan dialihkan.
            </p>
          )}
          <FormKeputusan id={u.id} basi={basi} />
        </section>
      )}

      {menunggu && !pemutus && u.diajukanOlehId === user.id && (
        <section aria-label="Tarik usulan" className="space-y-2 border-t border-tinta/20 pt-4">
          <p className="text-sm text-redup">Salah isi? Tarik usulan ini, lalu kirim yang baru.</p>
          <TombolTarik id={u.id} />
        </section>
      )}
    </div>
  );
}
