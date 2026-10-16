# 02 · antislop terpasang di project

Sumber: https://github.com/miqdadbadjuber/anti-slop, versi 3.2.21 (commit `439a2ef`), lisensi MIT. Salinan lisensi ada di `.claude/skills/antislop/LICENSE`.

## Apa ini

Kumpulan aturan buat agent AI supaya hasilnya nggak "kelihatan bikinan AI": UI generik, copy penuh buzzword, angka atau testimoni karangan, komentar kode yang cuma ngulang kodenya. Sifatnya filter, bukan panduan gaya. Arah desain (warna, font, mood) tetap dari kita, idealnya ditulis di `DESIGN.md`.

## Cara kerjanya di project ini

1. Folder skill disalin ke `.claude/skills/`. Claude Code otomatis memuat skill dari folder ini di setiap sesi, lokal maupun cloud.
2. `CLAUDE.md` punya blok `antislop` di bagian akhir. `CLAUDE.md` selalu dibaca di awal sesi, jadi tiap sesi tahu harus baca skill yang mana sebelum kerja UI, copy, atau komentar kode.
3. Mode dipilih per sesi: **during** (aturan dipakai sambil ngerjain) atau **after** (audit setelah jadi, temuan dinomori, kita pilih mana yang diperbaiki). Kalau belum dipilih, sesi akan nanya dulu.

| Skill | Dipakai saat |
|---|---|
| `antislop` | Inti, selalu dibaca duluan. Isinya 38 aturan (R-01 s/d R-38) dan Delivery Gate (laporan PASS/FAIL sebelum serah terima) |
| `antislop-ui` | Bikin atau ubah tampilan |
| `antislop-copywriting` | Nulis teks halaman, tombol, pesan |
| `antislop-human` | Kontras warna, keyboard, fokus, state kosong/loading/error. Ada `contrast-check.py` |
| `antislop-layoutmobile` | Layout yang harus rapi dari HP sampai desktop |
| `antislop-code` | Nulis atau rapikan komentar kode |

Cek kontras warna:

```bash
python3 .claude/skills/antislop-human/contrast-check.py "#FFFFFF" "#777777"
```

## Yang sengaja tidak ikut disalin

- Server MCP contrast checker (`contrast-mcp.py` + launcher). Script `contrast-check.py` sudah cukup.
- Installer CLI, gambar, dan file plugin untuk agent lain.

## Dampak ke project ini

Aturan yang paling kena ke web sepatu:
- Jangan ada angka, testimoni, atau klaim karangan (R-17, R-18, R-36, R-38). Kalau belum ada data asli, jangan tampilkan.
- Tiap tampilan data wajib punya state kosong, loading, dan error (R-27).
- Mobile harus rapi, tombol minimal 44px (R-03).
- Tanpa em dash (R-02) dan tanpa tombol generik kayak "Get Started" / "Pelajari lebih lanjut" (R-15).
- Desain butuh arah (R-37). Sebelum bikin halaman publik, isi `DESIGN.md` dulu bareng retailer: identitas, warna, font, mood.

## Cara update

```bash
git clone --depth 1 https://github.com/miqdadbadjuber/anti-slop /tmp/anti-slop
for s in antislop antislop-ui antislop-copywriting antislop-human antislop-layoutmobile antislop-code; do
  cp /tmp/anti-slop/skills/$s/SKILL.md .claude/skills/$s/
done
cp /tmp/anti-slop/skills/antislop/VERSION .claude/skills/antislop/
cp /tmp/anti-slop/skills/antislop-human/contrast-check.py .claude/skills/antislop-human/
```

Baca dulu perubahannya sebelum commit: isi `SKILL.md` adalah instruksi yang bakal diikuti agent.
