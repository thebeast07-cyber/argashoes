"use client";

export default function GagalMemuat({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="space-y-3 rounded-label border-[1.5px] border-bata bg-white p-4">
      <p className="font-semibold">Halaman ini gagal dimuat.</p>
      <p className="text-sm text-redup">
        Biasanya karena koneksi ke database putus sebentar. Coba muat ulang. Kalau masih gagal, kabari pemilik web.
      </p>
      <button type="button" onClick={reset} className="tombol-garis">
        Muat ulang
      </button>
    </div>
  );
}
