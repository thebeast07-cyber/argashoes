import { ukuranKecil } from "@/lib/domain/foto";

// Dijalankan di browser sebelum upload: foto HP 4-8 MB jadi JPEG 1600px sekitar 150-500 KB,
// supaya upload dari gudang dengan sinyal lemah tetap jalan dan muat di batas body server action.

export async function kecilkanFoto(file: File): Promise<Blob> {
  const gambar = await createImageBitmap(file);
  const { lebar, tinggi } = ukuranKecil(gambar.width, gambar.height);
  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  // PNG transparan jadi latar putih, bukan hitam, setelah diubah ke JPEG.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, lebar, tinggi);
  ctx.drawImage(gambar, 0, 0, lebar, tinggi);
  gambar.close();
  return new Promise((selesai, gagal) =>
    kanvas.toBlob((b) => (b ? selesai(b) : gagal(new Error("Gagal membuat JPEG"))), "image/jpeg", 0.82),
  );
}
