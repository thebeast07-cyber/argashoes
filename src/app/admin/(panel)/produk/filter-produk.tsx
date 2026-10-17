"use client";

// Filter dilipat supaya daftar produk naik ke atas layar HP. Pilihan langsung diterapkan, tanpa tombol terpisah.
export function FilterProduk({ brands, sizes, brand, size }: { brands: string[]; sizes: string[]; brand?: string; size?: string }) {
  const aktif = [brand && `Brand ${brand}`, size && `Size ${size}`].filter(Boolean).join(", ");
  const terapkan = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

  return (
    <details open={Boolean(aktif)} className="group rounded-label border border-tinta/55 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">Filter</span>
        <span className="min-w-0 flex-1 truncate text-right text-redup">{aktif || "Semua brand dan size"}</span>
        <span aria-hidden="true" className="w-3 text-center text-lg font-semibold leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <div>
          <label htmlFor="brand" className="label-form">
            Brand
          </label>
          <select id="brand" name="brand" defaultValue={brand ?? ""} onChange={terapkan} className="input">
            <option value="">Semua</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="size" className="label-form">
            Size
          </label>
          <select id="size" name="size" defaultValue={size ?? ""} onChange={terapkan} className="input">
            <option value="">Semua</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </details>
  );
}
