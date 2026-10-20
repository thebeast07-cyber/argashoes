// Foto produk dari Vercel Blob atau /foto lokal. Sudah dikecilkan ke 1600px saat upload, jadi cukup <img> biasa.
// Tanpa foto: kotak polos bertulisan, bukan gambar karangan (R-38).

/** `utuh`: foto tampil seluruhnya di atas latar putih (kartu katalog), bukan dipotong memenuhi kotak. */
export function Gambar({
  src,
  alt,
  className = "",
  eager = false,
  utuh = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
  utuh?: boolean;
}) {
  if (!src) {
    return (
      <div role="img" aria-label={`${alt}, foto belum ada`} className={`sempit flex items-center justify-center bg-kertas-gelap p-2 text-center text-sm font-semibold text-redup ${className}`}>
        Foto belum ada
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`${utuh ? "bg-white object-contain p-2" : "bg-kertas-gelap object-cover"} ${className}`} />;
}
