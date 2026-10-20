import Image from "next/image";

// Layar memuat yang sama untuk halaman publik dan admin: logo "bernapas" (lihat .napas di globals.css), baru
// tampil setelah 300ms supaya pindah halaman yang cepat tidak berkedip.
// Logo dekoratif (alt kosong): yang dibaca pembaca layar adalah teksnya.
export function LayarMemuat({ className = "" }: { className?: string }) {
  return (
    <div role="status" className={`muncul-telat flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 ${className}`}>
      <Image src="/logo-argashoes.png" alt="" width={120} height={96} priority className="napas h-24 w-auto" />
      <p className="font-semibold">Tunggu sebentar, brow...</p>
    </div>
  );
}
