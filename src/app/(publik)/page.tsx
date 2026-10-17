import Link from "next/link";
import { Gambar } from "@/components/gambar";
import { getDb } from "@/db";
import {
  halamanKatalog,
  LABEL_URUT,
  opsiKatalog,
  parseCariKatalog,
  ringkasSizeKartu,
  saringKatalog,
  URUT_KATALOG,
  urlKatalog,
  type CariKatalog,
  type ItemKatalog,
} from "@/lib/domain/katalog";
import { formatRupiah } from "@/lib/domain/produk";
import { statusStok, labelStok, type AmbangStok } from "@/lib/domain/stok";
import { semuaProdukAktif } from "@/lib/katalog/data";
import { getAmbangStok } from "@/lib/produk/data";

// Stok selalu terbaru (PRD: data stok tidak di-cache lama).
export const dynamic = "force-dynamic";

export const metadata = { title: "Argashoes · cari size, pesan lewat WhatsApp" };

export default async function Beranda({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const cari = parseCariKatalog(searchParams);
  const db = await getDb();
  const [semua, ambang] = await Promise.all([semuaProdukAktif(db), getAmbangStok(db)]);
  const opsi = opsiKatalog(semua);
  const hasil = saringKatalog(semua, cari);
  const halaman = halamanKatalog(hasil, cari.hal);
  const katalogKosong = opsi.brand.length === 0;
  const filterLain = Boolean(cari.q || cari.kategori || cari.hargaMin !== undefined || cari.hargaMax !== undefined || cari.urut !== "baru");

  return (
    <main>
      {/* Satu fokus: pencari size. Size adalah hambatan terbesar sebelum beli. */}
      <section aria-labelledby="judul-cari" className="wadah bg-tinta pb-6 pt-7 text-kertas min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,520px)] min-[900px]:items-end min-[900px]:gap-x-14 min-[900px]:py-14">
        <div>
          <h1 id="judul-cari" className="agak-lebar mb-2 text-[clamp(44px,14vw,60px)] font-black leading-[0.95] tracking-tight min-[900px]:text-[clamp(64px,7vw,96px)]">
            Cari size kamu.
          </h1>
          <p className="mb-5 max-w-[30ch] text-redup-gelap min-[900px]:mb-0 min-[900px]:text-lg">Pilih size, kami tampilkan model Nike dan Adidas yang masih ada stoknya.</p>
        </div>
        <div>
          {opsi.size.length > 0 ? (
            <ul aria-label="Pilih size" className="grid grid-cols-4 gap-2 min-[600px]:grid-cols-8 min-[900px]:grid-cols-4 min-[900px]:gap-2.5">
              {opsi.size.map((s) => {
                const dipilih = cari.size === s;
                return (
                  <li key={s}>
                    <Link
                      href={urlKatalog(cari, { size: dipilih ? undefined : s })}
                      scroll={false}
                      aria-current={dipilih ? "true" : undefined}
                      className={`sempit angka flex min-h-16 items-center justify-center rounded-label border-[1.5px] border-kertas text-[30px] font-extrabold leading-none min-[900px]:min-h-[76px] ${
                        dipilih ? "bg-kertas text-tinta" : "hover:bg-kertas/15"
                      }`}
                    >
                      {s}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-bold">Stok sedang diperbarui. Cek lagi sebentar.</p>
          )}
          <div role="status" aria-live="polite">
            {cari.size &&
              (hasil.length > 0 ? (
                <a href="#daftar" className="mt-3 inline-flex min-h-12 items-center rounded-kontrol border-[1.5px] border-kertas bg-kertas px-4 font-bold text-tinta">
                  Lihat {hasil.length} model di size {cari.size}
                </a>
              ) : (
                <p className="mt-4 font-bold">Size {cari.size} belum ada yang ready.</p>
              ))}
          </div>
        </div>
      </section>

      <section id="daftar" aria-labelledby="judul-daftar" className="wadah scroll-mt-2 pt-7 min-[900px]:pt-12">
        <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="judul-daftar" className="text-[26px] font-extrabold tracking-tight min-[900px]:text-[32px]">
            {cari.size ? `Ready di size ${cari.size}` : "Semua model"}
          </h2>
          {opsi.brand.length > 1 && (
            <nav aria-label="Filter merek" className="flex flex-wrap gap-1.5">
              {[undefined, ...opsi.brand].map((b) => {
                const aktif = cari.brand === b;
                return (
                  <Link
                    key={b ?? "semua"}
                    href={urlKatalog(cari, { brand: b })}
                    scroll={false}
                    aria-current={aktif ? "true" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-kontrol border-[1.5px] border-tinta px-3.5 font-bold ${aktif ? "bg-tinta text-kertas" : "hover:bg-white"}`}
                  >
                    {b ?? "Semua"}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {!katalogKosong && <FormCari cari={cari} kategori={opsi.kategori} terbuka={filterLain} />}

        {katalogKosong ? (
          <div className="rounded-label border-[1.5px] border-tinta bg-white p-5">
            <p className="font-semibold">Katalog sedang disiapkan.</p>
            <p className="mt-1 text-redup">Model baru tampil di sini begitu toko selesai mengunggah.</p>
          </div>
        ) : hasil.length === 0 ? (
          <div className="rounded-label border-[1.5px] border-tinta bg-white p-5">
            <p className="mb-3">Belum ada model yang cocok{cari.size ? ` di size ${cari.size}` : ""}.</p>
            <Link href="/" scroll={false} className="tombol-garis">
              Lihat semua model
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3 min-[600px]:gap-4 min-[900px]:grid-cols-4 min-[900px]:gap-5">
              {halaman.items.map((it) => (
                <li key={it.id} className="flex">
                  <Kartu item={it} size={cari.size} ambang={ambang} />
                </li>
              ))}
            </ul>
            {halaman.totalHalaman > 1 && (
              <nav aria-label="Halaman katalog" className="mt-6 flex items-center justify-between gap-3 text-sm">
                {halaman.hal > 1 ? (
                  <Link href={`${urlKatalog(cari, { hal: halaman.hal - 1 })}#daftar`} className="tombol-garis">
                    Sebelumnya
                  </Link>
                ) : (
                  <span />
                )}
                <span className="angka text-redup">
                  Halaman {halaman.hal} dari {halaman.totalHalaman}
                </span>
                {halaman.hal < halaman.totalHalaman ? (
                  <Link href={`${urlKatalog(cari, { hal: halaman.hal + 1 })}#daftar`} className="tombol-garis">
                    Berikutnya
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function FormCari({ cari, kategori, terbuka }: { cari: CariKatalog; kategori: string[]; terbuka: boolean }) {
  return (
    <form role="search" action="/#daftar" className="mb-4 space-y-2">
      {cari.size && <input type="hidden" name="size" value={cari.size} />}
      {cari.brand && <input type="hidden" name="brand" value={cari.brand} />}
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Cari model
        </label>
        <input id="q" name="q" type="search" defaultValue={cari.q} placeholder="Cari model, misalnya Samba" className="input" autoComplete="off" />
        <button type="submit" className="tombol-garis shrink-0">
          Cari
        </button>
      </div>
      <details open={terbuka} className="group rounded-label border border-tinta/55 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-semibold">Filter lain</span>
          <span className="min-w-0 flex-1 truncate text-right text-redup">{ringkasFilter(cari) || "Kategori, harga, urutan"}</span>
          <span aria-hidden="true" className="w-3 text-center text-lg font-semibold leading-none">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>
        <div className="grid gap-3 px-3 pb-3 min-[600px]:grid-cols-2 min-[900px]:grid-cols-4 min-[900px]:items-end">
          {kategori.length > 0 && (
            <div>
              <label htmlFor="kategori" className="label-form">
                Kategori
              </label>
              <select id="kategori" name="kategori" defaultValue={cari.kategori ?? ""} className="input">
                <option value="">Semua</option>
                {kategori.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="min" className="label-form">
                Harga dari
              </label>
              <input id="min" name="min" inputMode="numeric" defaultValue={cari.hargaMin?.toLocaleString("id-ID")} className="input angka" />
            </div>
            <div>
              <label htmlFor="maks" className="label-form">
                Sampai
              </label>
              <input id="maks" name="maks" inputMode="numeric" defaultValue={cari.hargaMax?.toLocaleString("id-ID")} className="input angka" />
            </div>
          </div>
          <div>
            <label htmlFor="urut" className="label-form">
              Urutkan
            </label>
            <select id="urut" name="urut" defaultValue={cari.urut} className="input">
              {URUT_KATALOG.map((u) => (
                <option key={u} value={u}>
                  {LABEL_URUT[u]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="tombol-utama">
              Terapkan
            </button>
            <Link href={urlKatalog({ urut: "baru", hal: 1, size: cari.size })} scroll={false} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
              Hapus filter
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}

function ringkasFilter(cari: CariKatalog): string {
  const harga =
    cari.hargaMin !== undefined || cari.hargaMax !== undefined
      ? `${cari.hargaMin !== undefined ? formatRupiah(cari.hargaMin) : "Rp 0"} sampai ${cari.hargaMax !== undefined ? formatRupiah(cari.hargaMax) : "berapa saja"}`
      : "";
  return [cari.q && `"${cari.q}"`, cari.kategori, harga, cari.urut !== "baru" && LABEL_URUT[cari.urut]].filter(Boolean).join(", ");
}

function Kartu({ item, size, ambang }: { item: ItemKatalog; size?: string; ambang: AmbangStok }) {
  const ringkas = ringkasSizeKartu(item.varian, ambang);
  const stokSize = size ? (item.varian.find((v) => v.size === size)?.stok ?? 0) : 0;
  const href = size ? `/produk/${item.id}?size=${encodeURIComponent(size)}` : `/produk/${item.id}`;
  return (
    <Link href={href} className="flex flex-1 flex-col rounded-label border border-tinta/25 bg-white hover:border-tinta">
      <Gambar src={item.sampul} alt={`${item.brand} ${item.nama}`} className="aspect-[4/5] w-full min-[900px]:aspect-square" />
      <div className="px-2.5 pb-3 pt-2.5">
        <p className="sempit text-[13px] font-bold uppercase text-redup">{item.brand}</p>
        <h3 className="mb-1.5 mt-0.5 font-bold leading-tight">{item.nama}</h3>
        <p className="angka text-[17px] font-extrabold">{formatRupiah(item.harga)}</p>
        {item.hargaCoret && item.hargaCoret > item.harga && <p className="angka text-sm text-redup line-through">{formatRupiah(item.hargaCoret)}</p>}
        {size ? (
          <p className={`mt-2 text-sm font-bold ${statusStok(stokSize, ambang) === "sisa_sedikit" ? "text-sedikit-teks" : ""}`}>
            Size {size}: {labelStok(stokSize, ambang)}
          </p>
        ) : (
          <>
            <ul aria-label="Size yang ada" className="mt-2 flex flex-wrap gap-1">
              {ringkas.tampil.map((v) => (
                <li
                  key={v.size}
                  className={`sempit angka min-w-[30px] rounded-label border-[1.5px] px-1.5 py-0.5 text-center text-sm font-bold leading-tight ${
                    v.sisaSedikit ? "border-sedikit-teks bg-sedikit-latar text-sedikit-teks" : "border-tinta"
                  }`}
                >
                  {v.size}
                </li>
              ))}
              {ringkas.lebih > 0 && <li className="sempit px-1 py-0.5 text-sm font-bold text-redup">+{ringkas.lebih}</li>}
            </ul>
            {ringkas.sisaSedikit.length > 0 && <p className="mt-1.5 text-[13px] font-bold text-sedikit-teks">Sisa sedikit: {ringkas.sisaSedikit.join(", ")}</p>}
          </>
        )}
      </div>
    </Link>
  );
}
