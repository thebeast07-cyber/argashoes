import Link from "next/link";
import { DaftarTier } from "@/components/label-tier";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { tierRapat } from "@/lib/domain/pengaturan";
import { getPengaturan, jumlahUsulanMenunggu, usulanMenungguUntuk } from "@/lib/pengaturan/data";
import { FormRekening } from "./form-rekening";
import { FormToko } from "./form-toko";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan · Argashoes" };

/** Mengubah langsung saat ada usulan menunggu membuat usulan itu basi, jadi pemilik diberi tahu dulu. */
function CatatanUsulanMenunggu({ id, hal }: { id: string; hal: string }) {
  return (
    <p className="text-sm">
      Admin toko sedang mengusulkan perubahan {hal}.{" "}
      <Link href={`/admin/pengaturan/usulan/${id}`} className="font-semibold underline underline-offset-2">
        Lihat usulannya
      </Link>{" "}
      sebelum mengubah langsung; kalau kamu ubah dari sini, usulan itu tidak bisa disetujui lagi.
    </p>
  );
}

export default async function HalamanPengaturan({ searchParams }: { searchParams: { tersimpan?: string } }) {
  const user = await wajibIzin("pengaturan.ubah");
  const pemutus = punyaIzin(user.peran, "usulan.putuskan");
  const db = await getDb();
  const [p, jumlahMenunggu, tierMenunggu, rekeningMenunggu] = await Promise.all([
    getPengaturan(db),
    jumlahUsulanMenunggu(db),
    usulanMenungguUntuk(db, "tier"),
    usulanMenungguUntuk(db, "rekening"),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Pengaturan</h1>

      {searchParams.tersimpan === "tier" && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          Tier fee tersimpan dan berlaku untuk order berikutnya.
        </p>
      )}

      {jumlahMenunggu > 0 && (
        <div className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <p className="font-semibold">
            {pemutus
              ? `${jumlahMenunggu} usulan dari admin toko menunggu keputusanmu.`
              : `${jumlahMenunggu} usulan menunggu keputusan pemilik web. Selama menunggu, angka lama tetap berlaku.`}
          </p>
          <Link href="/admin/pengaturan/usulan" className={pemutus ? "tombol-utama" : "tombol-garis"}>
            {pemutus ? "Periksa usulan" : "Lihat usulan"}
          </Link>
        </div>
      )}

      <section aria-labelledby="judul-tier" className="space-y-3">
        <h2 id="judul-tier" className="text-lg font-bold">
          Fee per pasang
        </h2>
        {p.tiers.length === 0 ? (
          <p className="text-sm text-redup">
            Belum ada tier. Selama kosong, produk tanpa fee khusus tidak punya fee, jadi order untuk produk itu belum bisa dihitung di laporan fee.
          </p>
        ) : (
          <>
            <DaftarTier tiers={p.tiers} label="Tier fee yang berlaku" />
            {!tierRapat(p.tiers) && (
              <p className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
                Ada rentang harga yang tidak masuk tier mana pun. Sepatu di rentang itu tidak punya fee kecuali diberi fee khusus.
              </p>
            )}
          </>
        )}
        {pemutus && tierMenunggu && <CatatanUsulanMenunggu id={tierMenunggu.id} hal="tier" />}
        {!pemutus && tierMenunggu ? (
          <Link href={`/admin/pengaturan/usulan/${tierMenunggu.id}`} className="tombol-garis">
            Usulan tier menunggu persetujuan
          </Link>
        ) : (
          <Link href="/admin/pengaturan/tier" className="tombol-garis">
            {pemutus ? "Ubah tier" : "Usulkan perubahan tier"}
          </Link>
        )}
        <p className="text-sm text-redup">Fee khusus untuk satu model diatur di halaman produknya dan menimpa tier.</p>
      </section>

      <section aria-labelledby="judul-rekening" className="space-y-3">
        <h2 id="judul-rekening" className="text-lg font-bold">
          Rekening yang tampil ke pelanggan
        </h2>
        {p.rekening ? (
          <dl className="angka rounded-label border-[1.5px] border-tinta bg-white px-3 py-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-redup">Bank</dt>
              <dd className="font-semibold">{p.rekening.bank}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-redup">Nomor</dt>
              <dd className="break-all text-base font-bold">{p.rekening.nomor}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-redup">Atas nama</dt>
              <dd className="font-semibold">{p.rekening.atasNama}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-redup">Belum diisi. Pelanggan belum bisa melihat ke mana harus transfer.</p>
        )}
        {pemutus ? (
          <>
            {rekeningMenunggu && <CatatanUsulanMenunggu id={rekeningMenunggu.id} hal="rekening" />}
            <FormRekening awal={p.rekening} mode="langsung" />
          </>
        ) : rekeningMenunggu ? (
          <Link href={`/admin/pengaturan/usulan/${rekeningMenunggu.id}`} className="tombol-garis">
            Usulan rekening menunggu persetujuan
          </Link>
        ) : (
          <>
            <p className="text-sm text-redup">Rekening baru berlaku setelah disetujui pemilik web, karena ke sinilah pelanggan mentransfer uang.</p>
            <FormRekening awal={p.rekening} mode="usul" />
          </>
        )}
      </section>

      <section aria-labelledby="judul-toko" className="space-y-3">
        <h2 id="judul-toko" className="text-lg font-bold">
          Kontak dan stok
        </h2>
        <FormToko nomorWa={p.nomorWa ? `+${p.nomorWa}` : ""} ambang={p.ambang.readyMin} />
      </section>

      <section aria-labelledby="judul-banner" className="space-y-3">
        <h2 id="judul-banner" className="text-lg font-bold">
          Banner promo
        </h2>
        <p className="text-sm text-redup">Gambar promo yang muncul saat pembeli membuka web, mis. promo tanggal kembar. Tampil dan berhenti sendiri sesuai jadwal.</p>
        <Link href="/admin/pengaturan/banner" className="tombol-garis">
          Atur banner
        </Link>
      </section>

      <nav aria-label="Catatan pengaturan" className="flex flex-wrap gap-x-6 gap-y-1 border-t border-tinta/20 pt-4 text-sm font-semibold">
        <Link href="/admin/pengaturan/usulan" className="inline-flex min-h-11 items-center underline underline-offset-2">
          Semua usulan
        </Link>
        <Link href="/admin/pengaturan/riwayat" className="inline-flex min-h-11 items-center underline underline-offset-2">
          Riwayat perubahan
        </Link>
      </nav>
    </div>
  );
}
