// Tampilan waktu untuk admin. Waktu disimpan timestamptz; yang dilihat orang selalu WIB.

const FORMAT_WIB = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Contoh: "17 Okt 2026, 14.05 WIB". */
export function formatWaktuWib(waktu: Date): string {
  return `${FORMAT_WIB.format(waktu).replace(" pukul ", ", ")} WIB`;
}
