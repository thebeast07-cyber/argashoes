import Link from "next/link";
import { notFound } from "next/navigation";
import { IkonKembali } from "@/components/ikon";
import { LabelSize } from "@/components/label-size";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { formatRupiah } from "@/lib/domain/produk";
import { kunciUsulan } from "@/lib/domain/usulan";
import { usulanMenungguUntuk } from "@/lib/pengaturan/data";
import { ambilProduk, getAmbangStok, opsiFilter } from "@/lib/produk/data";
import { simpanProduk } from "../actions";
import { FormProduk } from "../form-produk";
import { BarisSize } from "./baris-size";
import { FotoProduk } from "./foto-produk";
import { FormSizeBaru } from "./form-size-baru";
import { kodeArtikel } from "@/lib/domain/sku";
import { FormUsulFee } from "./form-usul-fee";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saran SKU size berikutnya: SKU terakhir tanpa bagian size-nya, mis. "NK-AM90-42" → "NK-AM90-". */
export default async function HalamanDetailProduk({ params, searchParams }: { params: { id: string }; searchParams: { baru?: string } }) {
  const user = await wajibIzin("produk.kelola");
  if (!UUID.test(params.id)) notFound();
  const db = await getDb();
  const [produk, opsi, ambang, usulanFee] = await Promise.all([
    ambilProduk(db, params.id),
    opsiFilter(db),
    getAmbangStok(db),
    usulanMenungguUntuk(db, kunciUsulan("fee_produk", params.id)),
  ]);
  if (!produk) notFound();

  const bolehUbahFee = punyaIzin(user.peran, "fee.atur");
  const infoFee = produk.feePerPasang
    ? `${formatRupiah(produk.feePerPasang)} khusus model ini. Perubahan fee lewat usulan di bawah.`
    : "Ikut tier harga. Untuk fee khusus model ini, kirim usulan di bawah.";

  return (
    <div className="space-y-6">
      <Link href="/admin/produk" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Produk
      </Link>

      <div>
        <p className="sempit text-sm font-semibold uppercase text-redup">{produk.brand}</p>
        <h1 className="text-2xl font-bold">{produk.nama}</h1>
      </div>

      {searchParams.baru && produk.varian.length === 0 && (
        <p role="status" className="rounded-label border-[1.5px] border-tinta bg-white p-3 text-sm">
          Model tersimpan. Sekarang tambahkan size dan stoknya di bawah.
        </p>
      )}

      <section aria-labelledby="judul-size" className="space-y-3">
        <h2 id="judul-size" className="text-lg font-bold">
          Size dan stok
        </h2>
        {produk.varian.length === 0 ? (
          <p className="text-sm text-redup">Belum ada size. Model tanpa size tidak bisa dipesan.</p>
        ) : (
          <ul className="divide-y divide-tinta/15 border-y border-tinta/15">
            {produk.varian.map((v) => (
              <BarisSize key={v.id} productId={produk.id} varian={v} label={<LabelSize size={v.size} stok={v.stok} ambang={ambang} besar />} />
            ))}
          </ul>
        )}
        <FormSizeBaru productId={produk.id} kodeArtikel={kodeArtikel(produk.varian)} />
      </section>

      <FotoProduk productId={produk.id} foto={produk.foto} />

      <section aria-labelledby="judul-data" className="space-y-3">
        <h2 id="judul-data" className="text-lg font-bold">
          Data model
        </h2>
        <FormProduk
          aksi={simpanProduk.bind(null, produk.id)}
          awal={{
            nama: produk.nama,
            brand: produk.brand,
            kategori: produk.kategori ?? "",
            deskripsi: produk.deskripsi ?? "",
            harga: produk.harga.toLocaleString("id-ID"),
            hargaCoret: produk.hargaCoret?.toLocaleString("id-ID") ?? "",
            feePerPasang: produk.feePerPasang?.toLocaleString("id-ID") ?? "",
            aktif: produk.aktif,
          }}
          labelSimpan="Simpan perubahan"
          bolehUbahFee={bolehUbahFee}
          infoFee={infoFee}
          brands={opsi.brands}
          kategori={opsi.kategori}
        />
      </section>

      {usulanFee ? (
        <section aria-labelledby="judul-usul-fee" className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <h2 id="judul-usul-fee" className="font-bold">
            Ada usulan fee untuk model ini
          </h2>
          <p className="text-sm">{bolehUbahFee ? "Admin toko mengusulkan fee khusus baru. Fee di atas belum berubah." : "Menunggu persetujuan pemilik web. Fee di atas belum berubah."}</p>
          <Link href={`/admin/pengaturan/usulan/${usulanFee.id}`} className={bolehUbahFee ? "tombol-utama" : "tombol-garis"}>
            {bolehUbahFee ? "Periksa usulan" : "Lihat usulan"}
          </Link>
        </section>
      ) : (
        !bolehUbahFee &&
        punyaIzin(user.peran, "usulan.ajukan") && (
          <section aria-labelledby="judul-usul-fee" className="space-y-3">
            <h2 id="judul-usul-fee" className="text-lg font-bold">
              Usulkan fee khusus
            </h2>
            <p className="text-sm text-redup">Fee khusus menimpa tier untuk model ini saja, dan baru berlaku setelah disetujui pemilik web.</p>
            <FormUsulFee productId={produk.id} awal={produk.feePerPasang?.toLocaleString("id-ID") ?? ""} />
          </section>
        )
      )}
    </div>
  );
}
