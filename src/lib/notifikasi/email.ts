// Email lewat Resend (REST, tanpa SDK). RESEND_API_KEY kosong → tidak mengirim apa pun.
// Gagal kirim tidak pernah menggagalkan checkout pembeli; hasilnya hanya dicatat di log server.

export type HasilEmail = "terkirim" | "dilewati" | "gagal";

export async function kirimEmail(
  pesan: { ke: string[]; subjek: string; teks: string },
  opsi: { apiKey?: string; pengirim?: string; fetch?: typeof fetch } = {},
): Promise<HasilEmail> {
  const apiKey = opsi.apiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey || pesan.ke.length === 0) return "dilewati";
  // onboarding@resend.dev hanya bisa mengirim ke email pemilik akun Resend; untuk penerima lain, verifikasi domain sendiri.
  const pengirim = opsi.pengirim ?? process.env.EMAIL_PENGIRIM ?? "Argashoes <onboarding@resend.dev>";
  try {
    const res = await (opsi.fetch ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: pengirim, to: pesan.ke, subject: pesan.subjek, text: pesan.teks }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`Email gagal (${res.status}): ${await res.text().catch(() => "")}`);
      return "gagal";
    }
    return "terkirim";
  } catch (e) {
    console.error("Email gagal:", e);
    return "gagal";
  }
}
