"use client";

// Penangkap terakhir untuk error di layout halaman (mis. database tidak terhubung), pengganti layar "Application error".
export default function GagalTotal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Halaman ini gagal dimuat.</h1>
      <p className="mt-2 text-redup">Coba muat ulang sebentar lagi.</p>
      <button type="button" onClick={reset} className="tombol-utama mt-4">
        Muat ulang
      </button>
      {error.digest && <p className="angka mt-6 text-xs text-redup">Kode untuk pemilik web: {error.digest}</p>}
    </main>
  );
}
