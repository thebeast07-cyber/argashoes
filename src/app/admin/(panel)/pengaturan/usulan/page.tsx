import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { LABEL_STATUS } from "@/lib/domain/usulan";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { daftarUsulan, type UsulanLengkap } from "@/lib/pengaturan/data";
import { judulUsulan, ringkasNilai } from "@/lib/pengaturan/ringkasan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usulan · Argashoes" };

function Item({ u }: { u: UsulanLengkap }) {
  const waktu = u.status === "menunggu" ? u.diajukanPada : (u.diputuskanPada ?? u.diajukanPada);
  return (
    <li>
      <Link href={`/admin/pengaturan/usulan/${u.id}`} className="block py-3 hover:bg-white">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-semibold">{judulUsulan(u.jenis, { nama: u.produkNama, brand: u.produkBrand })}</span>
            <span className="angka block text-sm">
              {ringkasNilai(u.jenis, u.dasar.nilai)} → {ringkasNilai(u.jenis, u.isi.nilai)}
            </span>
            <span className="block text-xs text-redup">
              {u.diajukanOleh} · {formatWaktuWib(waktu)}
            </span>
          </span>
          <span className="sempit shrink-0 rounded-label border-[1.5px] border-tinta px-1.5 py-0.5 text-xs font-semibold">{LABEL_STATUS[u.status]}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function HalamanUsulan() {
  const user = await wajibIzin("usulan.ajukan");
  const pemutus = punyaIzin(user.peran, "usulan.putuskan");
  const { menunggu, riwayat } = await daftarUsulan(await getDb(), { batasRiwayat: 30 });

  return (
    <div className="space-y-6">
      <Link href="/admin/pengaturan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Pengaturan
      </Link>
      <h1 className="text-2xl font-bold">Usulan perubahan</h1>

      <section aria-labelledby="judul-menunggu" className="space-y-2">
        <h2 id="judul-menunggu" className="text-lg font-bold">
          Menunggu keputusan
        </h2>
        {menunggu.length === 0 ? (
          <p className="text-sm text-redup">
            {pemutus
              ? "Tidak ada yang menunggu. Usulan muncul di sini saat admin toko mengusulkan perubahan tier, fee khusus produk, atau rekening."
              : "Tidak ada yang menunggu. Usulan tier dan rekening dikirim dari halaman Pengaturan, usulan fee khusus dari halaman produk."}
          </p>
        ) : (
          <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
            {menunggu.map((u) => (
              <Item key={u.id} u={u} />
            ))}
          </ul>
        )}
      </section>

      {riwayat.length > 0 && (
        <section aria-labelledby="judul-riwayat-usulan" className="space-y-2">
          <h2 id="judul-riwayat-usulan" className="text-lg font-bold">
            Sudah diputuskan
          </h2>
          <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
            {riwayat.map((u) => (
              <Item key={u.id} u={u} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
