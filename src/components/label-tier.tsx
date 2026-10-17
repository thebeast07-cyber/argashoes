import type { FeeTier } from "@/lib/domain/fee";
import { labelRentang, urutkanTier } from "@/lib/domain/pengaturan";
import { formatRupiah } from "@/lib/domain/produk";

// Motif label kardus (DESIGN.md) untuk tier: fee dicetak besar, rentang harga kecil di bawahnya.

export function DaftarTier({ tiers, label }: { tiers: readonly FeeTier[]; label: string }) {
  return (
    <ol aria-label={label} className="space-y-2">
      {urutkanTier(tiers).map((t) => (
        <li key={t.hargaMin} className="rounded-label border-[1.5px] border-tinta bg-white px-3 py-2">
          <p className="angka text-xl font-bold leading-tight">{formatRupiah(t.fee)}</p>
          <p className="angka text-sm text-redup">{labelRentang(t)}</p>
        </li>
      ))}
    </ol>
  );
}
