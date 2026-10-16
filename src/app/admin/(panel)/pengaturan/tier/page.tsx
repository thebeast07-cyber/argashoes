import Link from "next/link";
import { IkonKembali } from "@/components/ikon";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { barisDariTier, tierRapat } from "@/lib/domain/pengaturan";
import { getTiers, usulanMenungguUntuk } from "@/lib/pengaturan/data";
import { EditorTier } from "./editor-tier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tier fee · Argashoes" };

export default async function HalamanTier() {
  const user = await wajibIzin("usulan.ajukan");
  const langsung = punyaIzin(user.peran, "fee.atur");
  const db = await getDb();
  const [tiers, menunggu] = await Promise.all([getTiers(db), usulanMenungguUntuk(db, "tier")]);

  return (
    <div className="space-y-5">
      <Link href="/admin/pengaturan" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <IkonKembali ukuran={18} />
        Pengaturan
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{langsung ? "Ubah tier fee" : "Usulkan tier fee"}</h1>
        <p className="text-sm text-redup">
          Tier pertama mulai Rp 0, tiap tier mulai dari batas tier sebelumnya, dan tier terakhir berlaku untuk semua harga di atasnya. Jadi
          tidak ada harga sepatu yang terlewat. Yang dipakai harga jual, bukan harga coret.
        </p>
        {!langsung && <p className="text-sm text-redup">Tier yang berlaku tidak berubah sampai pemilik web menyetujui usulanmu.</p>}
      </div>

      {tiers.length > 0 && !tierRapat(tiers) && (
        <p role="note" className="rounded-label border-[1.5px] border-sedikit-teks bg-sedikit-latar p-3 text-sm text-sedikit-teks">
          Tier yang tersimpan sekarang punya rentang bolong atau tidak mulai dari Rp 0. Setelah disimpan dari sini, rentangnya jadi menyambung.
        </p>
      )}

      {!langsung && menunggu ? (
        <div className="space-y-3 rounded-label border-[1.5px] border-tinta bg-white p-3">
          <p className="text-sm">Sudah ada usulan tier yang menunggu keputusan pemilik. Satu usulan tier diproses sekali jalan.</p>
          <Link href={`/admin/pengaturan/usulan/${menunggu.id}`} className="tombol-garis">
            Lihat usulan itu
          </Link>
        </div>
      ) : (
        <EditorTier awal={barisDariTier(tiers)} mode={langsung ? "langsung" : "usul"} />
      )}

      <p className="text-sm text-redup">
        Order yang sudah masuk tetap memakai fee saat order dibuat. Fee khusus per model diatur di halaman tiap produk.
      </p>
    </div>
  );
}
