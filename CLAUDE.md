# CLAUDE.md

Web sepatu Nike/Adidas untuk satu retailer: katalog → checkout → order tercatat → closing di WhatsApp. Pemilik web dapat fee per pasang dari order berstatus Dikirim/Selesai. Spesifikasi lengkap: `docs/PRD.md` (baca dulu sebelum membangun fitur).

## Aturan kerja

- Sebelum kerja UI, copy, aksesibilitas, layout mobile, atau komentar kode: baca antislop dulu (lihat blok `antislop` di akhir file ini).
- Jangan push ke `main`. Kerja di branch, uji di Preview Vercel dulu.
- Bahasa domain pakai Bahasa Indonesia, sama dengan PRD (`peran`, `status`, `resiNomor`, `feePerPasang`). Kode teknis umum tetap Inggris (`db`, `schema`, `token`).
- Uang selalu integer rupiah. Waktu disimpan `timestamptz`; periode fee dihitung dalam WIB (UTC+7).
- Aturan bisnis ditulis sebagai fungsi murni di `src/lib/domain/` dan wajib ada unit test-nya. Kode yang menyentuh database memanggil fungsi murni itu, bukan menulis ulang aturannya.

## Perintah

```bash
npm run dev          # lokal, otomatis pakai PGlite di ./.data/pglite (tanpa setup DB)
npm test             # unit test + test DB (PGlite in-memory)
npm run typecheck
npm run lint
npm run build
npm run db:generate  # buat file migrasi setelah mengubah src/db/schema.ts
npm run db:migrate   # Neon kalau DATABASE_URL terisi, selain itu PGlite lokal
ADMIN_PASSWORD=... npm run user:create -- --nama "Nama" --email a@b.com --peran pemilik
```

PGlite hanya bisa dibuka satu proses: hentikan `npm run dev` sebelum menjalankan `db:migrate` atau `user:create` di lokal.

## Struktur

- `src/db/schema.ts`: semua tabel (Drizzle). `src/db/index.ts`: pilih driver; `DATABASE_URL` terisi → Neon, kosong → PGlite (migrasi otomatis).
- `drizzle/`: migrasi SQL. `0001_log_append_only.sql` adalah migrasi custom (trigger yang menolak UPDATE/DELETE pada `order_events` dan `audit_log`). Jangan edit migrasi yang sudah di-deploy; buat migrasi baru.
- `src/lib/domain/fee.ts`: tier fee, fee per pasang, syarat kena fee, periode WIB, rekap bulanan.
- `src/lib/domain/order-status.ts`: daftar status dan transisi yang sah, aturan wajib resi.
- `src/lib/orders/ubah-status.ts`: ubah status + catat `order_events` dalam satu transaksi.
- `src/lib/domain/stok.ts`, `produk.ts`, `import.ts`: status stok, urutan size, validasi produk/SKU, rencana import CSV (murni).
- `src/lib/produk/`: `data.ts` (query) dan `mutasi.ts` (tulis + `audit_log` dalam satu transaksi). Semua perubahan stok wajib lewat sini.
- `src/components/ikon.tsx`: ikon buatan sendiri. Jangan pakai Lucide atau library ikon lain (permintaan pemilik).
- `DESIGN.md`: arah tampilan sementara (token warna di `tailwind.config.ts`). Baca sebelum kerja UI.
- `src/lib/auth/`: `roles.ts` (peran → izin, murni), `password.ts` (scrypt), `session.ts` (akun & sesi, tanpa Next), `current.ts` (helper Next: `wajibLogin`, `wajibIzin`).
- `src/app/admin/`: login dan panel admin (mobile, tab bawah). `src/middleware.ts` hanya cek ada-tidaknya cookie; validasi sesi asli di layout panel.
- `tests/unit/`: test fungsi murni. `tests/db/`: test integrasi dengan PGlite in-memory.

## Auth

- Akun per orang di tabel `users`, peran `pemilik` atau `admin_toko`. Tidak ada pendaftaran publik; akun pertama dibuat lewat `npm run user:create`, akun berikutnya dari halaman Akun (pemilik saja).
- Sesi: token acak di cookie httpOnly `argashoes_sesi`, yang disimpan di DB hanya hash sha256-nya. Berlaku 14 hari.
- Cek izin dengan `wajibIzin("fee.atur")` dsb. Daftar izin per peran ada di `src/lib/auth/roles.ts`; jangan cek `peran === "pemilik"` langsung di halaman.

## Keputusan teknis (di luar yang tertulis di PRD)

- **Tier fee punya tabel sendiri** (`fee_tiers`: harga_min inklusif, harga_max eksklusif/null, fee), bukan JSON di `settings`, supaya bisa divalidasi constraint. `products.fee_per_pasang` (opsional) menimpa tier. Fee dibatasi Rp 50.000–100.000 di DB dan di `validasiTier`.
- **Transisi status**: lead → dikonfirmasi/batal; dikonfirmasi → dikirim/batal; dikirim → selesai. Selesai dan batal adalah status akhir. Dikirim → batal (retur) belum diizinkan karena aturan fee retur masih pertanyaan terbuka di PRD.
- **Dikirim wajib resi** dijaga dua lapis: `transisiStatus` dan CHECK constraint di tabel `orders`. `dikirim_pada` diisi saat pindah ke Dikirim dan tidak berubah saat Selesai.
- **Tidak ada tier yang cocok** → `tentukanFeePerPasang` mengembalikan `null`; alur checkout nanti harus memutuskan (tolak, atau pakai default) setelah tabel fee dari retailer jelas.
- Tambahan tabel di luar PRD: `sessions`, `fee_tiers`, `audit_log` (riwayat perubahan stok/produk/akun, append-only).
- Fee per produk hanya bisa diubah pemilik (izin `fee.atur`), termasuk lewat import CSV.
- `customers.user_id` disiapkan untuk login pelanggan nanti, belum punya FK.

## Belum dibangun

Halaman publik (katalog, produk, keranjang, checkout, WhatsApp), upload foto, daftar & detail order, pelanggan, laporan fee, pengaturan, halaman audit log, Redis, rate limit login. Catatan per tahap ada di `notes/`.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `.claude/skills/antislop/SKILL.md` (core) and then the skill for the task:
- UI / visual: `.claude/skills/antislop-ui/SKILL.md`
- Copy & text: `.claude/skills/antislop-copywriting/SKILL.md`
- People: `.claude/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.claude/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.claude/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: copy the `skills/` folders from https://github.com/miqdadbadjuber/anti-slop into `.claude/skills/` again (see `notes/02-antislop.md`).
<!-- antislop:end -->
