import { wajibLogin } from "@/lib/auth/current";
import { LABEL_PERAN, punyaIzin } from "@/lib/auth/roles";
import { getDb } from "@/db";
import { asistenAktif } from "@/lib/asisten/gemini";
import { penerimaPesan } from "@/lib/domain/pesan-admin";
import { jumlahUsulanMenunggu } from "@/lib/pengaturan/data";
import { daftarAkunPesan, jumlahPesanBaru } from "@/lib/pesan/data";
import { logout } from "../actions";
import { Asisten } from "./asisten";
import { NavBawah } from "./nav-bawah";

// Shell admin untuk HP: header ringkas + tab bawah.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await wajibLogin();
  const db = await getDb();
  const adaAsisten = asistenAktif() && punyaIzin(user.peran, "produk.kelola");
  const [usulanMenunggu, akun, pesanBaru] = await Promise.all([
    punyaIzin(user.peran, "usulan.putuskan") ? jumlahUsulanMenunggu(db) : 0,
    adaAsisten ? daftarAkunPesan(db) : [],
    adaAsisten ? jumlahPesanBaru(db, user.id) : 0,
  ]);

  return (
    // pb-40: isi paling bawah tetap bisa digulir ke atas tab bawah dan tombol Asisten.
    <div className="mx-auto min-h-screen max-w-2xl pb-40">
      <header className="flex items-center justify-between border-b border-tinta/20 px-4 py-2">
        <div className="text-sm">
          <span className="font-semibold">{user.nama}</span>
          <span className="text-redup"> · {LABEL_PERAN[user.peran]}</span>
        </div>
        <form action={logout}>
          <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-redup underline underline-offset-2 hover:text-tinta">
            Keluar
          </button>
        </form>
      </header>
      <main className="px-4 py-4">{children}</main>
      {adaAsisten && (
        <Asisten
          penerima={penerimaPesan(akun, user.id).map((a) => ({ id: a.id, nama: a.nama, peran: LABEL_PERAN[a.peran] }))}
          pesanBaruAwal={pesanBaru}
        />
      )}
      <NavBawah pemilik={punyaIzin(user.peran, "akun.kelola")} usulanMenunggu={usulanMenunggu} />
    </div>
  );
}
