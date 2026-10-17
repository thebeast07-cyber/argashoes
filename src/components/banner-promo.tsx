import Link from "next/link";

// Banner promo di atas beranda publik. Juga dipakai sebagai pratinjau di form admin, jadi tanpa akses data.
// Gambar tampil utuh tanpa dipotong, karena desain promo (mis. dari Canva) sering memuat teks sampai ke tepi.

export type IsiBanner = { judul: string; keterangan: string | null; gambarUrl: string | null; tautan: string | null; teksTombol: string | null };

export function BannerPromo({ banner, pratinjau = false }: { banner: IsiBanner; pratinjau?: boolean }) {
  const { judul, keterangan, gambarUrl, tautan, teksTombol } = banner;
  const kelasTombol = "tombol-utama shrink-0 self-start min-[600px]:self-center";
  return (
    <section aria-label="Promo" className={`${pratinjau ? "px-3" : "wadah"} border-b-[1.5px] border-tinta bg-kertas-gelap py-4`}>
      <div className="flex flex-col gap-3 min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-5">
        {gambarUrl && (
          // Gambar dari Blob atau /foto, sudah dikecilkan saat diunggah; tanpa next/image karena ukuran aslinya tidak disimpan.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gambarUrl} alt="" className="h-auto w-full rounded-label border-[1.5px] border-tinta min-[600px]:max-h-80 min-[600px]:w-auto min-[600px]:max-w-[50%]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="agak-lebar break-words text-xl font-black leading-tight min-[900px]:text-2xl">{judul}</p>
          {keterangan && <p className="mt-1 break-words text-sm text-redup min-[900px]:text-base">{keterangan}</p>}
        </div>
        {tautan &&
          teksTombol &&
          (pratinjau ? (
            <span className={kelasTombol}>{teksTombol}</span>
          ) : tautan.startsWith("/") ? (
            <Link href={tautan} className={kelasTombol}>
              {teksTombol}
            </Link>
          ) : (
            <a href={tautan} rel="noopener noreferrer" className={kelasTombol}>
              {teksTombol}
            </a>
          ))}
      </div>
    </section>
  );
}
