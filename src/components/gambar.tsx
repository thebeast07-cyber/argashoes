// Foto produk dari Vercel Blob atau /foto lokal. Sudah dikecilkan ke 1600px saat upload, jadi cukup <img> biasa.
// Tanpa foto: kotak polos bertulisan, bukan gambar karangan (R-38).

export function Gambar({ src, alt, className = "", eager = false }: { src: string | null; alt: string; className?: string; eager?: boolean }) {
  if (!src) {
    return (
      <div role="img" aria-label={`${alt}, foto belum ada`} className={`sempit flex items-center justify-center bg-kertas-gelap p-2 text-center text-sm font-semibold text-redup ${className}`}>
        Foto belum ada
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`bg-kertas-gelap object-cover ${className}`} />;
}
