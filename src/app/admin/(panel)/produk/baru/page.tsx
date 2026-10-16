import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { opsiFilter } from "@/lib/produk/data";
import { simpanProdukBaru } from "../actions";
import { FormProduk } from "../form-produk";

export const metadata = { title: "Model baru · Admin Argashoes" };

export default async function HalamanProdukBaru() {
  const user = await wajibIzin("produk.kelola");
  const opsi = await opsiFilter(await getDb());
  return (
    <div className="space-y-4">
      <Link href="/admin/produk" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Produk
      </Link>
      <h1 className="text-2xl font-bold">Model sepatu baru</h1>
      <p className="text-sm text-redup">Size dan stok diisi setelah model tersimpan.</p>
      <FormProduk
        aksi={simpanProdukBaru}
        awal={{ nama: "", brand: "", kategori: "", deskripsi: "", harga: "", hargaCoret: "", feePerPasang: "", aktif: true }}
        labelSimpan="Simpan, lanjut isi size"
        bolehUbahFee={punyaIzin(user.peran, "fee.atur")}
        infoFee="Ikut tier harga. Fee khusus per model diatur pemilik web."
        brands={opsi.brands}
        kategori={opsi.kategori}
      />
    </div>
  );
}
