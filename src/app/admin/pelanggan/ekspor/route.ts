import { getDb } from "@/db";
import { getUserSaatIni } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { keCsv } from "@/lib/csv";
import { KOLOM_EKSPOR_PELANGGAN } from "@/lib/domain/order-admin";
import { semuaPelangganUntukEkspor } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : "");

// PRD: ekspor pelanggan untuk CRM. Hanya yang menyetujui data dipakai (semua pelanggan dari checkout sudah setuju).
export async function GET() {
  const user = await getUserSaatIni();
  if (!user || !punyaIzin(user.peran, "pelanggan.lihat")) return new Response("Tidak diizinkan", { status: 403 });
  const rows = await semuaPelangganUntukEkspor(await getDb());
  const tabel = [
    [...KOLOM_EKSPOR_PELANGGAN],
    ...rows.map((r) => [r.nama, `+${r.noWa}`, r.alamatTerakhir, r.jumlahOrder, r.orderDikirim, iso(r.orderTerakhir), iso(r.persetujuanPada)]),
  ];
  const tanggal = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // BOM supaya Excel membaca UTF-8 dengan benar.
  return new Response("﻿" + keCsv(tabel), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pelanggan-argashoes-${tanggal}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
