# CLAUDE.md

Web sepatu Nike/Adidas untuk satu retailer: katalog → checkout → order tercatat → closing di WhatsApp. Pemilik web dapat fee per pasang dari order berstatus Dikirim/Selesai. Spesifikasi lengkap: `docs/PRD.md` (baca dulu sebelum membangun fitur).

## Aturan kerja

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
- `customers.user_id` disiapkan untuk login pelanggan nanti, belum punya FK.

## Belum dibangun

Halaman publik (katalog, produk, keranjang, checkout, WhatsApp), CRUD produk/varian, import CSV, daftar & detail order, pelanggan, laporan fee, pengaturan, Redis, Vercel Blob, rate limit login.
