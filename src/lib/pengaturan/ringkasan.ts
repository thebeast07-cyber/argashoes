// Teks ringkas untuk daftar usulan dan riwayat perubahan. Fungsi murni.

import type { FeeTier } from "@/lib/domain/fee";
import { formatNomorWa, isRekening, labelRentang } from "@/lib/domain/pengaturan";
import { formatRupiah } from "@/lib/domain/produk";
import { LABEL_JENIS, type JenisUsulan } from "@/lib/domain/usulan";

export function ringkasNilai(jenis: JenisUsulan, nilai: unknown): string {
  if (jenis === "tier") {
    const n = (nilai as FeeTier[] | null)?.length ?? 0;
    return n === 0 ? "belum ada tier" : `${n} tier`;
  }
  if (jenis === "fee_produk") return typeof nilai === "number" ? formatRupiah(nilai) : "ikut tier";
  return isRekening(nilai) ? `${nilai.bank} ${nilai.nomor} a.n. ${nilai.atasNama}` : "belum diisi";
}

export function judulUsulan(jenis: JenisUsulan, produk?: { nama: string | null; brand: string | null }): string {
  if (jenis === "fee_produk" && produk?.nama) return `Fee khusus ${produk.brand} ${produk.nama}`;
  if (jenis === "rekening") return "Rekening tampil";
  return LABEL_JENIS[jenis];
}

export function barisTier(tiers: readonly FeeTier[]): string[] {
  return tiers.map((t) => `${labelRentang(t)}: ${formatRupiah(t.fee)}`);
}

type Data = Record<string, unknown>;

function sumber(data: Data): string {
  return data.usulanId ? "Lewat usulan yang disetujui" : "Diubah langsung";
}

/** Satu entri audit jadi judul + baris detail. Aksi di luar daftar riwayat tidak dipanggil ke sini. */
export function ringkasRiwayat(entri: { aksi: string; data: unknown; produkNama: string | null }): { judul: string; detail: string[] } {
  const data = (entri.data ?? {}) as Data;
  const jenis = data.jenis as JenisUsulan | undefined;
  const label = typeof data.produk === "string" ? `fee khusus ${data.produk}` : jenis ? LABEL_JENIS[jenis].toLowerCase() : "";
  const catatan = typeof data.catatan === "string" && data.catatan ? [`Catatan: ${data.catatan}`] : [];

  switch (entri.aksi) {
    case "fee_tier.diubah":
      return { judul: "Tier fee diganti", detail: [sumber(data), ...barisTier((data.ke as FeeTier[]) ?? [])] };
    case "rekening.diubah":
      return {
        judul: "Rekening tampil diganti",
        detail: [sumber(data), `Dari: ${ringkasNilai("rekening", data.dari)}`, `Jadi: ${ringkasNilai("rekening", data.ke)}`],
      };
    case "produk.diubah": {
      const fee = data.feePerPasang as { dari: unknown; ke: unknown };
      return {
        judul: `Fee khusus ${entri.produkNama ?? "produk"} diubah`,
        detail: [sumber(data), `${ringkasNilai("fee_produk", fee.dari)} → ${ringkasNilai("fee_produk", fee.ke)}`],
      };
    }
    case "pengaturan.diubah": {
      const detail: string[] = [];
      const wa = data.nomorWa as { dari: string | null; ke: string | null } | undefined;
      const ambang = data.ambangStok as { dari: number; ke: number } | undefined;
      const teksWa = (n: string | null) => (n ? formatNomorWa(n) : "kosong");
      if (wa) detail.push(`Nomor WhatsApp: ${teksWa(wa.dari)} → ${teksWa(wa.ke)}`);
      if (ambang) detail.push(`Ready mulai stok: ${ambang.dari} → ${ambang.ke}`);
      return { judul: "Pengaturan toko diubah", detail };
    }
    case "usulan.diajukan":
      return { judul: `Usulan ${label} diajukan`, detail: [`Jadi: ${jenis ? ringkasNilai(jenis, data.ke) : ""}`] };
    case "usulan.disetujui":
      return { judul: `Usulan ${label} disetujui`, detail: catatan };
    case "usulan.ditolak":
      return { judul: `Usulan ${label} ditolak`, detail: catatan };
    case "usulan.dibatalkan":
      return { judul: `Usulan ${label} ditarik pengajunya`, detail: [] };
    default:
      return { judul: entri.aksi, detail: [] };
  }
}
