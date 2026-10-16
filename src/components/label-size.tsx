import { labelStok, statusStok, type AmbangStok } from "@/lib/domain/stok";

// Motif identitas (DESIGN.md): size seperti label ujung kardus sepatu.
// Status selalu tertulis; warna hanya penguat.

const GAYA = {
  ready: "border-tinta bg-white text-tinta",
  sisa_sedikit: "border-sedikit-teks bg-sedikit-latar text-sedikit-teks",
  habis: "border-habis/60 bg-kertas text-habis",
} as const;

export function LabelSize({
  size,
  stok,
  ambang,
  besar = false,
}: {
  size: string;
  stok: number;
  ambang: AmbangStok;
  besar?: boolean;
}) {
  const status = statusStok(stok, ambang);
  return (
    <span
      className={`inline-flex flex-col items-center rounded-label border-[1.5px] leading-none ${GAYA[status]} ${
        besar ? "min-w-16 px-2 py-2" : "min-w-12 px-1.5 py-1"
      }`}
    >
      <span className={`sempit angka font-bold ${besar ? "text-2xl" : "text-base"} ${status === "habis" ? "line-through" : ""}`}>
        {size}
      </span>
      <span className={`sempit mt-0.5 font-medium ${besar ? "text-xs" : "text-[11px]"}`}>{labelStok(stok, ambang)}</span>
    </span>
  );
}
