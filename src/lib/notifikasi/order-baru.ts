import "server-only";
import type { Db } from "@/db";
import { isiEmailOrderBaru } from "@/lib/domain/order-admin";
import { ambilOrder, emailPemilik } from "@/lib/orders/data";
import { kirimEmail, type HasilEmail } from "./email";

/** Penerima: semua akun pemilik yang aktif, ditambah EMAIL_NOTIFIKASI (dipisah koma) kalau diisi. */
export async function kirimNotifikasiOrderBaru(db: Db, kode: string, asalSitus: string): Promise<HasilEmail> {
  const order = await ambilOrder(db, kode);
  if (!order) return "dilewati";
  const tambahan = (process.env.EMAIL_NOTIFIKASI ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const ke = [...new Set([...(await emailPemilik(db)), ...tambahan])];
  const { subjek, teks } = isiEmailOrderBaru(order, `${asalSitus}/admin/order/${order.kode}`);
  return kirimEmail({ ke, subjek, teks });
}
