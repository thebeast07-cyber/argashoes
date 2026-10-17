import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonChat, IkonKembali } from "@/components/ikon";
import { LabelStatus } from "@/components/label-status";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { isKodeOrder } from "@/lib/domain/checkout";
import { feeItems } from "@/lib/domain/fee";
import { leadTerbengkalai, umur } from "@/lib/domain/order-admin";
import { LABEL_STATUS } from "@/lib/domain/order-status";
import { formatRupiah } from "@/lib/domain/produk";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { ambilOrder } from "@/lib/orders/data";
import { AksiStatus } from "./aksi-status";
import { CatatanInternal, FotoResi } from "./catatan-foto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { kode: string } }) {
  return { title: `${params.kode} · Admin Argashoes` };
}

export default async function DetailOrder({ params }: { params: { kode: string } }) {
  const user = await wajibIzin("order.kelola");
  if (!isKodeOrder(params.kode)) notFound();
  const o = await ambilOrder(await getDb(), params.kode);
  if (!o) notFound();
  const sekarang = new Date();
  const pasang = o.items.reduce((n, i) => n + i.jumlah, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/order" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Order
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="sempit angka text-3xl font-bold">{o.kode}</h1>
          <LabelStatus status={o.status} />
        </div>
        <p className="mt-1 text-sm text-redup">
          Masuk {formatWaktuWib(o.dibuat)} ({umur(o.dibuat, sekarang)})
        </p>
      </div>

      {leadTerbengkalai(o, sekarang) && (
        <p role="status" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm font-semibold text-sedikit-teks">
          Lead ini sudah lebih dari 24 jam. Konfirmasi di WhatsApp, atau batalkan dengan alasan.
        </p>
      )}

      <section aria-labelledby="judul-status" className="space-y-3">
        <h2 id="judul-status" className="text-lg font-bold">
          Status
        </h2>
        {o.resiNomor && (
          <p className="text-sm">
            Nomor resi: <span className="sempit angka font-bold">{o.resiNomor}</span>
          </p>
        )}
        {o.alasanBatal && <p className="text-sm">Alasan batal: {o.alasanBatal}</p>}
        <AksiStatus orderId={o.id} kode={o.kode} status={o.status} resiNomor={o.resiNomor} />
        {(o.status === "dikirim" || o.status === "selesai") && <FotoResi orderId={o.id} kode={o.kode} url={o.resiFoto} />}
      </section>

      <section aria-labelledby="judul-pembeli" className="space-y-2">
        <h2 id="judul-pembeli" className="text-lg font-bold">
          Pembeli
        </h2>
        <p className="font-semibold">
          <Link href={`/admin/pelanggan/${o.customerId}`} className="underline underline-offset-2">
            {o.nama}
          </Link>
        </p>
        <p className="angka text-sm">+{o.noWa}</p>
        <p className="whitespace-pre-line text-sm">{o.alamat}</p>
        {o.catatan && <p className="text-sm">Catatan pembeli: {o.catatan}</p>}
        <p className="text-sm text-redup">
          {o.waClickedAt ? `Membuka WhatsApp ${formatWaktuWib(o.waClickedAt)}` : "Belum membuka WhatsApp dari halaman pesanan"}
          {o.utmSource && ` · datang dari ${o.utmSource}`}
        </p>
        <a href={`https://wa.me/${o.noWa}`} target="_blank" rel="noreferrer" className="tombol-garis">
          <IkonChat ukuran={18} />
          Chat pembeli
        </a>
      </section>

      <section aria-labelledby="judul-barang" className="space-y-2">
        <h2 id="judul-barang" className="text-lg font-bold">
          Barang ({pasang} pasang)
        </h2>
        <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span>
                {i.jumlah}x {i.namaProduk}, size <span className="sempit angka font-bold">{i.size}</span>
              </span>
              <span className="angka shrink-0">{formatRupiah(i.hargaSatuan * i.jumlah)}</span>
            </li>
          ))}
        </ul>
        <p className="angka flex justify-between font-bold">
          <span>Subtotal</span>
          <span>{formatRupiah(o.total)}</span>
        </p>
        {punyaIzin(user.peran, "fee.laporan") && (
          <p className="angka text-sm text-redup">
            Fee {formatRupiah(feeItems(o.items))} ({o.items.map((i) => `${formatRupiah(i.feePerPasang)} × ${i.jumlah}`).join(" + ")}), dihitung kalau status Dikirim atau Selesai.
          </p>
        )}
      </section>

      <section aria-labelledby="judul-catatan">
        <h2 id="judul-catatan" className="sr-only">
          Catatan internal
        </h2>
        <CatatanInternal orderId={o.id} kode={o.kode} awal={o.catatanInternal} />
      </section>

      <section aria-labelledby="judul-riwayat" className="space-y-2">
        <h2 id="judul-riwayat" className="text-lg font-bold">
          Riwayat
        </h2>
        <ol className="space-y-2 border-l-[1.5px] border-tinta/25 pl-3 text-sm">
          {o.riwayat.map((r, i) => (
            <li key={i}>
              <p className="font-semibold">
                {r.dari ? `${LABEL_STATUS[r.dari]} → ${LABEL_STATUS[r.ke]}` : `Masuk sebagai ${LABEL_STATUS[r.ke]}`}
                <span className="font-normal text-redup"> · {r.oleh ?? "otomatis dari checkout"}</span>
              </p>
              <p className="text-redup">{formatWaktuWib(r.waktu)}</p>
              {r.catatan && <p>Alasan: {r.catatan}</p>}
            </li>
          ))}
        </ol>
        <p className="text-xs text-redup">Riwayat ini tidak bisa diubah atau dihapus.</p>
      </section>
    </div>
  );
}
