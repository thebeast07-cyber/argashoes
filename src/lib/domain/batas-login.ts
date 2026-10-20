// Batas percobaan login yang salah, supaya password admin tidak bisa ditebak berulang-ulang.
// Dihitung per email (melindungi satu akun) dan per IP (satu orang mencoba banyak email).

export const BATAS_LOGIN = { jendelaMenit: 15, perEmail: 5, perIp: 20 } as const;

export type HasilBatasLogin = { boleh: true } | { boleh: false; tungguMenit: number };

/** Kapan blokir lepas: saat percobaan gagal cukup lama keluar dari jendela waktu. null = tidak diblokir. */
function lepasPada(gagal: Date[], batas: number, sekarang: Date, jendelaMs: number): number | null {
  const dalamJendela = gagal
    .map((w) => w.getTime())
    .filter((t) => t > sekarang.getTime() - jendelaMs)
    .sort((a, b) => a - b);
  if (dalamJendela.length < batas) return null;
  return dalamJendela[dalamJendela.length - batas] + jendelaMs;
}

export function cekBatasLogin(gagal: { email: Date[]; ip: Date[] }, sekarang = new Date(), aturan = BATAS_LOGIN): HasilBatasLogin {
  const jendelaMs = aturan.jendelaMenit * 60_000;
  const lepas = [lepasPada(gagal.email, aturan.perEmail, sekarang, jendelaMs), lepasPada(gagal.ip, aturan.perIp, sekarang, jendelaMs)].filter(
    (t): t is number => t !== null,
  );
  if (lepas.length === 0) return { boleh: true };
  return { boleh: false, tungguMenit: Math.max(1, Math.ceil((Math.max(...lepas) - sekarang.getTime()) / 60_000)) };
}

export function pesanBatasLogin(tungguMenit: number): string {
  return `Terlalu banyak percobaan login yang salah. Coba lagi dalam ${tungguMenit} menit.`;
}
