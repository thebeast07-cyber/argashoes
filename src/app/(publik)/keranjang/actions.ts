"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { parseItemDiminta, validasiPembeli, type MasalahItem } from "@/lib/domain/checkout";
import { buatOrder } from "@/lib/orders/buat-order";
import { getNomorWa, getTiers } from "@/lib/pengaturan/data";

export type StateCheckout = { error?: Record<string, string>; pesan?: string; masalah?: MasalahItem[] };

// Batas per IP di memori satu instance server: penahan kasar sampai Redis dipasang (PRD: rate limit per IP).
// Batas per nomor WhatsApp yang sebenarnya ada di database (buatOrder).
const kirimPerIp = new Map<string, number[]>();
const IP_MAKS = 10;
const IP_JENDELA_MS = 10 * 60_000;

function lewatBatasIp(ip: string, sekarang: number): boolean {
  const baru = (kirimPerIp.get(ip) ?? []).filter((t) => sekarang - t < IP_JENDELA_MS);
  baru.push(sekarang);
  kirimPerIp.set(ip, baru);
  if (kirimPerIp.size > 5000) kirimPerIp.clear();
  return baru.length > IP_MAKS;
}

export async function kirimPesanan(_prev: StateCheckout, form: FormData): Promise<StateCheckout> {
  // Kolom jebakan: tersembunyi dari orang, biasanya diisi bot.
  if (String(form.get("situs") ?? "") !== "") return { pesan: "Pesanan tidak bisa dikirim. Muat ulang halaman lalu coba lagi." };

  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "tanpa-ip";
  if (lewatBatasIp(ip, Date.now())) return { pesan: "Terlalu banyak percobaan. Tunggu 10 menit lalu coba lagi." };

  const pembeli = validasiPembeli({
    nama: String(form.get("nama") ?? ""),
    wa: String(form.get("wa") ?? ""),
    alamat: String(form.get("alamat") ?? ""),
    catatan: String(form.get("catatan") ?? ""),
    setuju: form.get("setuju") === "on",
  });
  if (!pembeli.ok) return { error: pembeli.error };

  const db = await getDb();
  if (!(await getNomorWa(db))) return { pesan: "Pemesanan belum dibuka: toko belum memasang nomor WhatsApp." };

  const hasil = await buatOrder(db, {
    pembeli: pembeli.data,
    diminta: parseItemDiminta(String(form.get("items") ?? "[]")),
    tiers: await getTiers(db),
    utmSource: String(form.get("utm") ?? "").slice(0, 40) || null,
  });
  if (!hasil.ok) {
    if (hasil.alasan === "batas") return { pesan: "Nomor WhatsApp ini sudah mengirim 3 pesanan dalam 1 jam. Lanjutkan di WhatsApp toko, atau coba lagi nanti." };
    return { masalah: hasil.masalah };
  }
  redirect(`/pesanan/${hasil.kode}?baru=1`);
}
