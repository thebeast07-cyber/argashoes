import "server-only";
import type { Giliran } from "@/lib/domain/asisten-stok";
import { PENGETAHUAN_WEB } from "./pengetahuan";

// Panggilan ke Gemini lewat REST, tanpa SDK. Gemini hanya bisa membaca data yang dikirim di sini dan tidak punya
// jalan untuk menulis apa pun. Yang dikirim: obrolan dan ringkasan katalog + stok. Tanpa order, data pembeli, atau fee.

export class AsistenTidakTersedia extends Error {}

// Flash-Lite dulu: kuota gratisnya paling longgar. Per 18 Okt 2026 AI Studio akun toko menampilkan 3.5 Flash-Lite
// dengan 500 permintaan per hari. Versi bernomor dipakai sebelum alias "-latest" supaya perilaku tidak berubah
// diam-diam. GEMINI_MODEL dicoba paling awal dan model yang tidak ada (404) dilewati.
const MODEL_CADANGAN = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

export function asistenAktif(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const INSTRUKSI = `Kamu asisten di panel admin Argashoes, toko sepatu Nike dan Adidas. Yang mengajakmu ngobrol adalah pemilik web atau admin toko. Ngobrol seperti rekan kerja yang paham betul web ini: santai, sopan, hangat, Bahasa Indonesia sehari-hari. Variasikan kalimatmu, jangan membuka setiap balasan dengan cara yang sama, dan langsung ke inti. Boleh membahas apa saja, tidak harus soal sepatu.

Kamu hanya bisa membaca: PENGETAHUAN WEB di bawah (cara kerja semua fitur) dan DATA TOKO (katalog dan stok terbaru dari database). Kamu tidak bisa mengubah apa pun. Kalau diminta mengubah sesuatu, jelaskan caranya.

Kalau ditanya cara melakukan sesuatu di web, jawab dengan langkah bernomor (1. 2. 3.), sebut nama tombol persis seperti di pengetahuan, dan sertakan tautan ke halamannya dengan format [Nama halaman](/path). Pakai hanya path yang tertulis di pengetahuan. Untuk sepatu tertentu jangan buat tautan sendiri; isi nomorModel, sistem akan menampilkan tautan ke halamannya. Jangan mengarang menu, tombol, atau fitur; kalau sesuatu belum ada, bilang terus terang.

Isi balasan dengan jawabanmu. Boleh pakai baris baru, daftar "- ", langkah "1. ", **tebal**, dan [tautan](/path). Isi nomorModel dengan nomor model dari DATA TOKO yang kamu bahas (maksimal 5), atau kosong.`;

const SKEMA = {
  type: "OBJECT",
  properties: {
    balasan: { type: "STRING" },
    nomorModel: { type: "ARRAY", items: { type: "INTEGER" } },
  },
  required: ["balasan", "nomorModel"],
};

export async function tanyaGemini(pertanyaan: string, riwayat: readonly Giliran[], dataToko: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AsistenTidakTersedia("Asisten belum aktif: GEMINI_API_KEY belum diisi di Vercel.");

  const model = [...new Set([process.env.GEMINI_MODEL?.trim(), ...MODEL_CADANGAN].filter((m): m is string => Boolean(m)))];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: `${INSTRUKSI}\n\nPENGETAHUAN WEB:\n${PENGETAHUAN_WEB}\n\nDATA TOKO:\n${dataToko}` }] },
    contents: [
      ...riwayat.map((g) => ({ role: g.peran === "user" ? "user" : "model", parts: [{ text: g.teks }] })),
      { role: "user", parts: [{ text: pertanyaan }] },
    ],
    generationConfig: { responseMimeType: "application/json", responseSchema: SKEMA, temperature: 0.8 },
  });

  for (const nama of model) {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(nama)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
    } catch {
      throw new AsistenTidakTersedia("Gemini tidak menjawab. Coba lagi sebentar lagi.");
    }
    if (res.status === 404) continue;
    if (res.status === 429) throw new AsistenTidakTersedia("Kuota gratis Gemini hari ini sudah habis. Reset sekitar jam 14.00 atau 15.00 WIB.");
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      console.error("Gemini menolak permintaan", nama, res.status, (await res.text()).slice(0, 300));
      throw new AsistenTidakTersedia("Gemini menolak permintaan. Cek GEMINI_API_KEY di Vercel.");
    }
    if (!res.ok) throw new AsistenTidakTersedia("Gemini sedang bermasalah. Coba lagi sebentar lagi.");

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const teks = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return JSON.parse(teks);
    } catch {
      return null;
    }
  }
  throw new AsistenTidakTersedia(`Model Gemini tidak ditemukan (${model.join(", ")}). Isi GEMINI_MODEL di Vercel dengan nama model yang tersedia.`);
}
