import { getDb } from "@/db";
import { isKodeOrder, linkWhatsApp, pesanWhatsApp } from "@/lib/domain/checkout";
import { catatKlikWa, orderPublik } from "@/lib/orders/buat-order";
import { getNomorWa } from "@/lib/pengaturan/data";

// Semua tombol "Buka WhatsApp" lewat sini: klik dicatat (wa_clicked_at), lalu diteruskan ke wa.me.
// Pesan disusun di server dari data order, bukan dari browser.
export async function GET(req: Request, { params }: { params: { kode: string } }) {
  const kembali = new URL(`/pesanan/${encodeURIComponent(params.kode)}`, req.url);
  if (!isKodeOrder(params.kode)) return new Response("Pesanan tidak ditemukan", { status: 404 });
  const db = await getDb();
  const [order, nomor] = await Promise.all([orderPublik(db, params.kode), getNomorWa(db)]);
  if (!order) return new Response("Pesanan tidak ditemukan", { status: 404 });
  if (!nomor) return Response.redirect(kembali, 303);
  await catatKlikWa(db, order.kode);
  return Response.redirect(linkWhatsApp(nomor, pesanWhatsApp(order)), 303);
}
