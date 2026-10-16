import { getDb } from "@/db";
import { getUserSaatIni } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { keCsv } from "@/lib/csv";
import { KOLOM_KATALOG, KOLOM_STOK } from "@/lib/domain/import";
import { barisEkspor } from "@/lib/produk/data";

export const dynamic = "force-dynamic";

function tanggalWib(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Format ekspor sama persis dengan format import, jadi bisa diunduh, diubah, lalu di-import lagi.
export async function GET(req: Request) {
  const user = await getUserSaatIni();
  if (!user || !punyaIzin(user.peran, "produk.kelola")) return new Response("Tidak diizinkan", { status: 403 });

  const format = new URL(req.url).searchParams.get("format") === "stok" ? "stok" : "katalog";
  const rows = await barisEkspor(await getDb());
  const tabel =
    format === "stok"
      ? [[...KOLOM_STOK], ...rows.map((r) => [r.sku, r.size, r.stok])]
      : [
          [...KOLOM_KATALOG],
          ...rows.map((r) => [r.sku, r.brand, r.nama, r.kategori, r.harga, r.hargaCoret, r.feePerPasang, r.size, r.stok]),
        ];

  // BOM supaya Excel membaca UTF-8 dengan benar.
  return new Response("﻿" + keCsv(tabel), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${format}-argashoes-${tanggalWib()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
