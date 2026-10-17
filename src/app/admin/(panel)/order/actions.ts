"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { isTipeFoto, validasiFileFoto } from "@/lib/domain/foto";
import { isStatusOrder, PESAN_GAGAL_TRANSISI } from "@/lib/domain/order-status";
import { hapusFotoTersimpan, PenyimpananBelumSiap, simpanFoto } from "@/lib/foto/penyimpanan";
import { simpanCatatanInternal, simpanFotoResi } from "@/lib/orders/mutasi";
import { ubahStatusOrder } from "@/lib/orders/ubah-status";

export type StateOrder = { error?: string; sukses?: string };

function segarkan(kode: string) {
  revalidatePath(`/admin/order/${kode}`);
  revalidatePath("/admin/order");
  revalidatePath("/admin");
}

export async function ubahStatus(orderId: string, kode: string, _prev: StateOrder, form: FormData): Promise<StateOrder> {
  const user = await wajibIzin("order.kelola");
  const ke = form.get("ke");
  if (!isStatusOrder(ke)) return { error: "Status tidak dikenal." };
  const alasan = String(form.get("alasan") ?? "");
  const hasil = await ubahStatusOrder(await getDb(), {
    orderId,
    ke,
    resiNomor: String(form.get("resi") ?? ""),
    alasanBatal: alasan === "Lainnya" ? String(form.get("alasanLain") ?? "") : alasan,
    olehUserId: user.id,
  });
  if (!hasil.ok) return { error: hasil.error === "ORDER_TIDAK_ADA" ? "Order ini sudah tidak ada." : PESAN_GAGAL_TRANSISI[hasil.error] };
  segarkan(kode);
  return { sukses: "Status tersimpan." };
}

export async function simpanCatatan(orderId: string, kode: string, _prev: StateOrder, form: FormData): Promise<StateOrder> {
  const user = await wajibIzin("order.kelola");
  const hasil = await simpanCatatanInternal(await getDb(), orderId, String(form.get("catatan") ?? ""), user.id);
  if (hasil === "tidak_ada") return { error: "Order ini sudah tidak ada." };
  segarkan(kode);
  return { sukses: "Catatan tersimpan." };
}

/** Satu foto resi per order; foto baru menggantikan yang lama. Browser sudah mengecilkannya. */
export async function unggahFotoResi(orderId: string, kode: string, form: FormData): Promise<StateOrder> {
  const user = await wajibIzin("order.kelola");
  const file = form.get("foto");
  if (!(file instanceof Blob)) return { error: "File foto tidak terbaca. Pilih ulang." };
  const salah = validasiFileFoto({ tipe: file.type, ukuran: file.size });
  if (salah || !isTipeFoto(file.type)) return { error: salah ?? "Format foto harus JPG, PNG, atau WebP." };
  let url: string;
  try {
    url = await simpanFoto(`resi/${orderId}`, file, file.type);
  } catch (e) {
    if (e instanceof PenyimpananBelumSiap) return { error: "Penyimpanan foto belum disiapkan di server. Kabari pemilik web." };
    return { error: "Foto gagal diunggah. Coba lagi." };
  }
  const hasil = await simpanFotoResi(await getDb(), orderId, url, user.id);
  if (!hasil.ok) {
    await hapusFotoTersimpan(url).catch(() => {});
    return { error: "Order ini sudah tidak ada." };
  }
  if (hasil.lama) await hapusFotoTersimpan(hasil.lama).catch(() => {});
  segarkan(kode);
  return { sukses: "Foto resi tersimpan." };
}

export async function hapusFotoResi(orderId: string, kode: string): Promise<StateOrder> {
  const user = await wajibIzin("order.kelola");
  const hasil = await simpanFotoResi(await getDb(), orderId, null, user.id);
  if (!hasil.ok) return { error: "Order ini sudah tidak ada." };
  if (hasil.lama) await hapusFotoTersimpan(hasil.lama).catch(() => {});
  segarkan(kode);
  return { sukses: "Foto resi dihapus." };
}
