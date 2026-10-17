"use client";

export default function GagalMemuat({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className="wadah py-12">
      <h1 className="text-2xl font-bold">Katalog gagal dimuat.</h1>
      <p className="mt-2 text-redup">Biasanya karena koneksi putus sebentar. Coba muat ulang.</p>
      <button type="button" onClick={reset} className="tombol-utama mt-4">
        Muat ulang
      </button>
    </main>
  );
}
