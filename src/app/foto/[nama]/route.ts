import { bacaFotoLokal } from "@/lib/foto/penyimpanan";

// Penyaji foto untuk lokal (tanpa Vercel Blob). Di Vercel, URL foto langsung ke Blob dan route ini tidak terpakai.

const TIPE: Record<string, string> = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" };

export async function GET(_req: Request, { params }: { params: { nama: string } }) {
  const isi = await bacaFotoLokal(params.nama);
  if (!isi) return new Response("Foto tidak ditemukan", { status: 404 });
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": TIPE[params.nama.split(".").pop() ?? ""] ?? "application/octet-stream",
      // Nama file selalu uuid baru, jadi isinya tidak pernah berubah.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
