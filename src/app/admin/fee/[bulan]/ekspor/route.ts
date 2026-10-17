import { getDb } from "@/db";
import { getUserSaatIni } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { keCsv } from "@/lib/csv";
import { isBulan, KOLOM_EKSPOR_FEE } from "@/lib/domain/laporan-fee";
import { LABEL_STATUS } from "@/lib/domain/order-status";
import { formatWaktuWib } from "@/lib/domain/waktu";
import { rekapBulan } from "@/lib/fee/data";

export const dynamic = "force-dynamic";

// Lampiran untuk retailer saat menagih fee: daftar order yang jadi dasar hitungan, satu baris per order.
export async function GET(_req: Request, { params }: { params: { bulan: string } }) {
  const user = await getUserSaatIni();
  if (!user || !punyaIzin(user.peran, "fee.laporan")) return new Response("Tidak diizinkan", { status: 403 });
  if (!isBulan(params.bulan)) return new Response("Bulan tidak dikenal", { status: 404 });
  const r = await rekapBulan(await getDb(), params.bulan);
  const tabel = [
    [...KOLOM_EKSPOR_FEE],
    ...r.orders.map((o) => [o.kode, formatWaktuWib(o.dikirimPada), o.nama, o.resiNomor, LABEL_STATUS[o.status], o.pasang, o.fee, o.total]),
    ["TOTAL", "", "", "", "", r.jumlahPasang, r.totalFee, ""],
  ];
  // BOM supaya Excel membaca UTF-8 dengan benar.
  return new Response("﻿" + keCsv(tabel), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fee-argashoes-${params.bulan}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
