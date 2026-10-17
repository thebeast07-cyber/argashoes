import Link from "next/link";
import { IkonCari } from "@/components/ikon";
import { LabelStatus } from "@/components/label-status";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { leadTerbengkalai, umur } from "@/lib/domain/order-admin";
import { isStatusOrder, LABEL_STATUS, STATUS_ORDER, type StatusOrder } from "@/lib/domain/order-status";
import { formatRupiah } from "@/lib/domain/produk";
import { daftarOrder, hitungPerStatus, PER_HALAMAN_ORDER } from "@/lib/orders/data";

export const metadata = { title: "Order · Admin Argashoes" };
export const dynamic = "force-dynamic";

type Cari = { status?: string; q?: string; hal?: string };

function url(cari: { status?: StatusOrder; q?: string; hal?: number }) {
  const p = new URLSearchParams();
  if (cari.status) p.set("status", cari.status);
  if (cari.q) p.set("q", cari.q);
  if (cari.hal && cari.hal > 1) p.set("hal", String(cari.hal));
  const s = p.toString();
  return s ? `/admin/order?${s}` : "/admin/order";
}

export default async function HalamanOrder({ searchParams }: { searchParams: Cari }) {
  await wajibIzin("order.kelola");
  const status = isStatusOrder(searchParams.status) ? searchParams.status : undefined;
  const q = searchParams.q?.trim().slice(0, 60) || undefined;
  const halaman = Math.max(1, Number(searchParams.hal) || 1);
  const db = await getDb();
  const [{ items, total }, perStatus] = await Promise.all([daftarOrder(db, { status, q, halaman }), hitungPerStatus(db, q)]);
  const semua = Object.values(perStatus).reduce((a, b) => a + b, 0);
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN_ORDER));
  const sekarang = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Order</h1>
        <Link href="/admin/pelanggan" className="tombol-garis px-3 text-sm">
          Pelanggan
        </Link>
      </div>

      <form role="search" action="/admin/order" className="space-y-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="label-form">
          Cari kode, nama, atau nomor WA
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" type="search" defaultValue={q} className="input" autoComplete="off" />
          <button type="submit" className="tombol-garis shrink-0 px-3" aria-label="Cari">
            <IkonCari />
          </button>
        </div>
      </form>

      <nav aria-label="Filter status" className="flex flex-wrap gap-1.5">
        {[undefined, ...STATUS_ORDER].map((s) => {
          const aktif = status === s;
          return (
            <Link
              key={s ?? "semua"}
              href={url({ status: s, q })}
              aria-current={aktif ? "true" : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-kontrol border-[1.5px] border-tinta px-3 text-sm font-bold ${aktif ? "bg-tinta text-kertas" : "bg-white"}`}
            >
              {s ? LABEL_STATUS[s] : "Semua"}
              <span className="angka font-normal">{s ? perStatus[s] : semua}</span>
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-label border-[1.5px] border-dashed border-tinta/55 p-5 text-sm">
          <p className="font-semibold">{semua === 0 && !q ? "Belum ada order." : "Tidak ada order yang cocok."}</p>
          <p className="mt-1 text-redup">{semua === 0 && !q ? "Order dari halaman checkout akan masuk di sini sebagai Lead." : "Coba kata kunci lain atau status lain."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
          {items.map((o) => {
            const lama = leadTerbengkalai(o, sekarang);
            return (
              <li key={o.id}>
                <Link href={`/admin/order/${o.kode}`} className="block py-3 hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="sempit angka text-lg font-bold">{o.kode}</span>
                    <LabelStatus status={o.status} />
                  </div>
                  <p className="mt-0.5 text-sm">
                    <span className="font-semibold">{o.nama}</span>
                    <span className="text-redup"> · {umur(o.dibuat, sekarang)}</span>
                  </p>
                  <p className="truncate text-sm text-redup">{o.barang.map((b) => `${b.jumlah}x ${b.namaProduk} ${b.size}`).join(", ")}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="angka font-semibold">{formatRupiah(o.total)}</span>
                    {lama && <span className="font-bold text-sedikit-teks">Lead lebih dari 24 jam</span>}
                    {o.status === "lead" && !o.waClickedAt && <span className="text-redup">Pembeli belum membuka WhatsApp</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalHalaman > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {halaman > 1 ? (
            <Link href={url({ status, q, hal: halaman - 1 })} className="tombol-garis">
              Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="angka text-redup">
            Halaman {halaman} dari {totalHalaman}
          </span>
          {halaman < totalHalaman ? (
            <Link href={url({ status, q, hal: halaman + 1 })} className="tombol-garis">
              Berikutnya
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
