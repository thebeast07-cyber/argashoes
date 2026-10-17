import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonChat } from "@/components/ikon";
import { getDb } from "@/db";
import { isKodeOrder } from "@/lib/domain/checkout";
import { formatRupiah } from "@/lib/domain/produk";
import { orderPublik } from "@/lib/orders/buat-order";
import { getNomorWa } from "@/lib/pengaturan/data";
import { LanjutKeWa } from "./lanjut-ke-wa";

export const metadata = { title: "Pesanan tercatat · Argashoes", robots: { index: false } };
export const dynamic = "force-dynamic";

// Halaman ini bisa dibuka siapa saja yang tahu kodenya, jadi tidak menampilkan nomor WA atau alamat pembeli.
export default async function HalamanPesanan({ params, searchParams }: { params: { kode: string }; searchParams: { baru?: string } }) {
  if (!isKodeOrder(params.kode)) notFound();
  const db = await getDb();
  const [order, nomor] = await Promise.all([orderPublik(db, params.kode), getNomorWa(db)]);
  if (!order) notFound();
  const keWa = `/pesanan/${order.kode}/wa`;

  return (
    <main className="px-[max(var(--sisi),calc((100%-640px)/2))] pb-10 pt-4">
      {searchParams.baru && nomor && <LanjutKeWa kode={order.kode} href={keWa} />}
      <h1 className="mb-3.5 text-[32px] font-black leading-[1.02] tracking-tight min-[900px]:text-[44px]">Pesananmu sudah tercatat</h1>
      <div className="mb-5 rounded-label border-[1.5px] border-tinta bg-white p-4">
        <p className="text-sm font-semibold text-redup">Kode pesanan</p>
        <p className="sempit angka text-[40px] font-extrabold leading-tight tracking-wide">{order.kode}</p>
        <p className="mt-2 inline-block rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar px-2 py-0.5 text-sm font-bold text-sedikit-teks">
          Menunggu balasan toko
        </p>
      </div>
      <ul className="mb-2 space-y-1">
        {order.items.map((i) => (
          <li key={`${i.namaProduk}-${i.size}`} className="angka">
            {i.jumlah} × {i.namaProduk}, size {i.size}
          </li>
        ))}
      </ul>
      <p className="angka mb-6 font-extrabold">
        Subtotal {formatRupiah(order.total)} <span className="font-normal text-redup">(belum termasuk ongkir)</span>
      </p>
      <div className="grid gap-2.5">
        {nomor ? (
          // <a> biasa, bukan Link: Link bisa memuat lebih dulu dan tercatat sebagai klik WhatsApp.
          <a href={keWa} rel="nofollow" className="tombol-utama min-h-[52px] w-full text-[17px]">
            <IkonChat />
            Buka WhatsApp
          </a>
        ) : (
          <p className="font-semibold">Toko belum memasang nomor WhatsApp. Simpan kode di atas.</p>
        )}
        <Link href="/" className="tombol-garis min-h-[52px] w-full text-[17px]">
          Cari model lain
        </Link>
      </div>
    </main>
  );
}
