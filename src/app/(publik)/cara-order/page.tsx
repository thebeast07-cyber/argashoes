import Link from "next/link";
import { IkonKembali } from "@/components/ikon";

export const metadata = { title: "Cara order · Argashoes" };
// Footer membaca brand dari database; tanpa ini halaman dibangun statis dan nama brand-nya beku sejak build.
export const dynamic = "force-dynamic";

// Empat langkah karena prosesnya memang empat (PRD: alur order lewat WhatsApp).
const LANGKAH = [
  ["Pilih size, isi data pengiriman", "Tanpa akun. Cukup nama, nomor WhatsApp, dan alamat."],
  ["Pesanan tercatat dengan kode", "Sebut kode ini saat chat dengan toko."],
  ["Toko membalas di WhatsApp", "Cek stok dan hitung ongkir ke alamatmu."],
  ["Kamu bayar, toko mengirim", "Nomor resi dikirim lewat WhatsApp."],
];

export default function CaraOrder() {
  return (
    <main className="px-[max(var(--sisi),calc((100%-640px)/2))] pb-10 pt-2">
      <Link href="/" className="inline-flex min-h-12 items-center gap-1.5 font-bold">
        <IkonKembali ukuran={20} />
        Katalog
      </Link>
      <h1 className="mb-3.5 mt-2 text-[32px] font-black leading-[1.02] tracking-tight min-[900px]:text-[44px]">Cara order</h1>
      <ol>
        {LANGKAH.map(([judul, isi], i) => (
          <li key={judul} className="grid grid-cols-[52px_1fr] gap-3.5 border-t border-tinta/25 py-3.5">
            <span aria-hidden="true" className="sempit flex h-[52px] items-center justify-center rounded-label border-[1.5px] border-tinta bg-white text-[28px] font-extrabold">
              {i + 1}
            </span>
            <div>
              <b className="block text-[17px]">{judul}</b>
              <span className="text-[15px] text-redup">{isi}</span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
