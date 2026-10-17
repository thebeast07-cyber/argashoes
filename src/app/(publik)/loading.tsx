import Image from "next/image";

// Logo dekoratif (alt kosong): yang dibaca pembaca layar adalah teksnya.
export default function Memuat() {
  return (
    <div role="status" className="wadah muncul-telat flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16">
      <Image src="/logo-argashoes.png" alt="" width={120} height={96} priority className="napas h-24 w-auto" />
      <p className="font-semibold">Tunggu sebentar, brow...</p>
    </div>
  );
}
