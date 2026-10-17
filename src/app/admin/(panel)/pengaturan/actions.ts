"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { feeDalamRentang, FEE_MAX, FEE_MIN } from "@/lib/domain/fee";
import { normalisasiNomorWa, validasiAmbang, validasiBarisTier, validasiRekening, type BarisTier } from "@/lib/domain/pengaturan";
import { formatRupiah, parseRupiah } from "@/lib/domain/produk";
import { ajukanUsulan, batalkanUsulan, putuskanUsulan, simpanPengaturanToko, simpanRekening, simpanTier, type HasilAjukan } from "@/lib/pengaturan/mutasi";

export type StatePengaturan = { error?: Record<string, string>; pesan?: string; sukses?: string };

const teks = (form: FormData, k: string) => String(form.get(k) ?? "");
const alasan = (form: FormData) => teks(form, "alasan").trim().slice(0, 500) || null;

function segarkan() {
  revalidatePath("/admin", "layout");
}

const PESAN_AJUKAN: Record<Exclude<HasilAjukan["status"], "ok">, string> = {
  sudah_ada: "Sudah ada usulan yang menunggu untuk ini. Tunggu keputusan pemilik, atau tarik usulan itu dulu.",
  tidak_berubah: "Isinya sama dengan yang berlaku sekarang, jadi tidak ada yang perlu diusulkan.",
  tidak_ada: "Produk ini sudah tidak ada.",
};

function setelahAjukan(hasil: HasilAjukan): StatePengaturan {
  if (hasil.status !== "ok") return { pesan: PESAN_AJUKAN[hasil.status] };
  segarkan();
  redirect(`/admin/pengaturan/usulan/${hasil.id}?baru=1`);
}

export async function simpanTierAksi(_prev: StatePengaturan, form: FormData): Promise<StatePengaturan> {
  const user = await wajibIzin("usulan.ajukan");
  const jumlah = Math.min(Number(teks(form, "jumlah")) || 0, 20);
  const baris: BarisTier[] = Array.from({ length: jumlah }, (_, i) => ({ batasAtas: teks(form, `batas.${i}`), fee: teks(form, `fee.${i}`) }));
  const hasil = validasiBarisTier(baris);
  if (!hasil.ok) return { error: hasil.error };

  const db = await getDb();
  if (punyaIzin(user.peran, "fee.atur")) {
    await simpanTier(db, hasil.data, user.id);
    segarkan();
    redirect("/admin/pengaturan?tersimpan=tier");
  }
  return setelahAjukan(await ajukanUsulan(db, { jenis: "tier", isi: hasil.data, alasan: alasan(form) }, user.id));
}

export async function simpanRekeningAksi(_prev: StatePengaturan, form: FormData): Promise<StatePengaturan> {
  const user = await wajibIzin("usulan.ajukan");
  const hasil = validasiRekening({ bank: teks(form, "bank"), nomor: teks(form, "nomor"), atasNama: teks(form, "atasNama") });
  if (!hasil.ok) return { error: hasil.error };

  const db = await getDb();
  if (punyaIzin(user.peran, "rekening.atur")) {
    await simpanRekening(db, hasil.data, user.id);
    segarkan();
    return { sukses: "Rekening tersimpan." };
  }
  return setelahAjukan(await ajukanUsulan(db, { jenis: "rekening", isi: hasil.data, alasan: alasan(form) }, user.id));
}

export async function simpanTokoAksi(_prev: StatePengaturan, form: FormData): Promise<StatePengaturan> {
  const user = await wajibIzin("pengaturan.ubah");
  const error: Record<string, string> = {};
  const isianWa = teks(form, "nomorWa").trim();
  const nomorWa = isianWa ? normalisasiNomorWa(isianWa) : null;
  if (isianWa && !nomorWa) error.nomorWa = "Nomor Indonesia, contoh 0812 3456 7890 atau +62 812 3456 7890.";
  const ambang = validasiAmbang(teks(form, "ambang"));
  if (!ambang.ok) Object.assign(error, ambang.error);
  if (Object.keys(error).length > 0 || !ambang.ok) return { error };

  await simpanPengaturanToko(await getDb(), { nomorWa, ambang: ambang.data }, user.id);
  segarkan();
  return { sukses: "Tersimpan." };
}

/** Admin toko mengusulkan fee khusus satu produk. Kosong = kembali ikut tier. */
export async function usulkanFeeProdukAksi(productId: string, _prev: StatePengaturan, form: FormData): Promise<StatePengaturan> {
  const user = await wajibIzin("usulan.ajukan");
  if (punyaIzin(user.peran, "fee.atur")) return { pesan: "Pemilik web mengubah fee langsung lewat form Data model." };
  const isian = teks(form, "fee").trim();
  const fee = isian ? parseRupiah(isian) : null;
  if (isian && (fee === null || !feeDalamRentang(fee))) {
    return { error: { fee: `${formatRupiah(FEE_MIN)} sampai ${formatRupiah(FEE_MAX)}, atau kosongkan untuk ikut tier.` } };
  }
  return setelahAjukan(await ajukanUsulan(await getDb(), { jenis: "fee_produk", productId, isi: fee, alasan: alasan(form) }, user.id));
}

const PESAN_PUTUSKAN = {
  tidak_ada: "Usulan ini sudah tidak ada.",
  sudah_diputuskan: "Usulan ini sudah diputuskan sebelumnya.",
  basi: "Nilai yang berlaku sudah berubah sejak usulan ini dibuat, jadi usulan ini tidak bisa disetujui. Tolak, lalu minta admin toko mengusulkan ulang.",
} as const;

export async function putuskanUsulanAksi(id: string, _prev: StatePengaturan, form: FormData): Promise<StatePengaturan> {
  const user = await wajibIzin("usulan.putuskan");
  const setuju = form.get("keputusan") === "setujui";
  const catatan = teks(form, "catatan").trim().slice(0, 500) || null;
  const hasil = await putuskanUsulan(await getDb(), id, { setuju, catatan }, user.id);
  if (hasil !== "ok") return { pesan: PESAN_PUTUSKAN[hasil] };
  segarkan();
  redirect(`/admin/pengaturan/usulan/${id}?hasil=${setuju ? "disetujui" : "ditolak"}`);
}

export async function tarikUsulanAksi(id: string, _prev: StatePengaturan): Promise<StatePengaturan> {
  const user = await wajibIzin("usulan.ajukan");
  const hasil = await batalkanUsulan(await getDb(), id, user.id);
  if (hasil === "bukan_pengaju") return { pesan: "Hanya yang mengajukan yang bisa menarik usulan ini." };
  if (hasil !== "ok") return { pesan: PESAN_PUTUSKAN[hasil] };
  segarkan();
  redirect(`/admin/pengaturan/usulan/${id}?hasil=ditarik`);
}
