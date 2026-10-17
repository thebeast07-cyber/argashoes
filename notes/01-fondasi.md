# 01 · Fondasi

Status: selesai, di branch `claude/nifty-sagan-tg0p5g`. Tes: 33/33 lulus, typecheck, lint, dan build bersih.

## Yang dibangun

1. **Kerangka aplikasi**: Next.js 14 (App Router) + TypeScript + Tailwind. Halaman publik baru placeholder "Katalog segera hadir".
2. **Database**: Postgres lewat Drizzle ORM.
   - Lokal dan test: PGlite (Postgres yang jalan di dalam proses Node, tanpa install apa-apa). Data lokal ada di `.data/pglite`.
   - Vercel: Neon, aktif otomatis kalau env `DATABASE_URL` diisi.
3. **Skema tabel** sesuai PRD, plus 3 tabel tambahan (`sessions`, `fee_tiers`, `audit_log`).
4. **Login admin per akun** dengan dua peran: `pemilik` dan `admin_toko`.
5. **Fungsi murni + unit test**: hitung fee dan transisi status order.

## Peta file

| File | Fungsinya |
|---|---|
| `src/db/schema.ts` | Semua tabel dan constraint |
| `src/db/index.ts` | Pilih driver (Neon atau PGlite), jalankan migrasi otomatis di PGlite |
| `drizzle/0000_fondasi.sql` | Migrasi hasil generate dari schema |
| `drizzle/0001_log_append_only.sql` | Migrasi manual: trigger yang menolak edit/hapus di `order_events` dan `audit_log` |
| `src/lib/domain/fee.ts` | Aturan fee (murni, tanpa database) |
| `src/lib/domain/order-status.ts` | Aturan status order (murni) |
| `src/lib/orders/ubah-status.ts` | Ubah status + tulis log, dalam satu transaksi database |
| `src/lib/auth/roles.ts` | Peran → izin |
| `src/lib/auth/password.ts` | Hash password (scrypt bawaan Node) |
| `src/lib/auth/session.ts` | Buat akun, cek login, buat/cek/hapus sesi |
| `src/lib/auth/current.ts` | Helper buat halaman Next: `wajibLogin()`, `wajibIzin()` |
| `src/middleware.ts` | Belum punya cookie → dilempar ke `/admin/login` |
| `src/app/admin/login/` | Halaman login |
| `src/app/admin/(panel)/` | Panel admin: layout HP dengan tab bawah, Beranda, Akun |
| `src/app/admin/actions.ts` | Server action: login, logout, tambah akun |
| `scripts/create-user.ts` | Bikin akun dari terminal (akun pemilik pertama) |
| `scripts/migrate.ts` | Jalankan migrasi (Neon atau PGlite) |
| `tests/unit/` | Tes fungsi murni |
| `tests/db/` | Tes integrasi pakai PGlite in-memory |

## Alur login

1. Admin isi email + password di `/admin/login`.
2. `cekLogin` cari user by email (huruf kecil), cek akun aktif, cocokkan password scrypt.
3. Kalau cocok, `buatSesi` bikin token acak. Token asli masuk cookie `argashoes_sesi` (httpOnly, 14 hari). Yang disimpan di tabel `sessions` hanya hash sha256-nya, jadi kalau database bocor, token tidak bisa dipakai.
4. Tiap buka halaman panel: middleware cek cookie ada, lalu layout panel cek sesi ke database (`wajibLogin`).
5. Halaman khusus pemilik pakai `wajibIzin("akun.kelola")`. Admin toko yang nyasar dilempar ke `/admin?akses=ditolak`.
6. Logout hapus sesi di database + hapus cookie.

Izin per peran (`src/lib/auth/roles.ts`):

| Izin | pemilik | admin_toko |
|---|---|---|
| produk.kelola, order.kelola, pelanggan.lihat | ✓ | ✓ |
| fee.atur, fee.laporan, akun.kelola, analitik.lihat | ✓ | ✗ |

## Alur status order

```
lead ──► dikonfirmasi ──► dikirim ──► selesai
  │            │
  └──► batal ◄─┘
```

- `lead` cuma dibuat otomatis saat checkout. Tidak ada jalan balik ke `lead`.
- `selesai` dan `batal` adalah status akhir.
- Pindah ke `dikirim` wajib ada nomor resi. Dijaga dua lapis: fungsi `transisiStatus` dan CHECK constraint di tabel `orders`.
- `dikirim_pada` diisi saat jadi Dikirim, tidak berubah saat Selesai. Ini dasar periode fee.
- Tiap perubahan masuk `order_events` (siapa, kapan, dari → ke). Tabel ini ditolak kalau di-UPDATE/DELETE, bahkan lewat SQL langsung.

## Alur hitung fee

1. Saat order dibuat (nanti, di tahap checkout): `tentukanFeePerPasang` → fee khusus produk kalau ada, kalau tidak pakai tier sesuai harga. Hasilnya disalin ke `order_items.fee_per_pasang`, jadi ganti aturan nanti tidak mengubah order lama.
2. Order kena fee kalau status `dikirim`/`selesai` **dan** resi terisi (`orderKenaFee`).
3. Periode = bulan kalender WIB dari `dikirim_pada` (`periodeFee`). Contoh: dikirim 31 Jan jam 23:30 WIB → periode Januari, jam 00:10 WIB 1 Feb → Februari.
4. `rekapFeeBulanan` = total pasang, total fee, dan daftar order pendukung untuk satu bulan.

Batas fee Rp 50.000–100.000 dijaga di `validasiTier` dan di CHECK constraint database.

## Keputusan yang gua ambil sendiri (gampang diubah)

| Keputusan | Alasan |
|---|---|
| Tier fee punya tabel sendiri (`fee_tiers`), bukan JSON di `settings` | Bisa dijaga constraint database |
| Dikirim → Batal (retur) belum boleh | Aturan fee retur masih pertanyaan terbuka di PRD |
| Tidak ada tier yang cocok → fee `null` | Nunggu tabel fee dari retailer; checkout nanti yang putuskan |
| `customers.user_id` belum ada relasi | Login pelanggan belum dibangun |
| Akun pertama lewat script, tidak ada halaman daftar | Biar orang asing tidak bisa daftar duluan di production |

## Cara jalanin

```bash
npm install
ADMIN_PASSWORD=passwordminimal10 npm run user:create -- --nama "Najah" --email najah@contoh.com --peran pemilik
npm run dev        # buka http://localhost:3000/admin
npm test
```

PGlite cuma bisa dibuka satu proses. Matikan `npm run dev` dulu sebelum `user:create` atau `db:migrate`.

Deploy ke Vercel: isi `DATABASE_URL` (Neon). Migrasi jalan otomatis di setiap deploy (skrip `vercel-build`). Akun pemilik pertama dibuat lewat login dengan sandi `ADMIN_PASSWORD`.

## Yang sudah dicek manual

Pakai Playwright di ukuran HP (390px):
- Password salah → "Email atau password salah."
- Pemilik login → lihat tab Beranda + Akun → tambah admin toko → daftar akun ikut ter-update.
- Email dobel (beda huruf besar/kecil) → "Email sudah dipakai akun lain."
- Logout → balik ke login.
- Admin toko login → cuma tab Beranda; buka `/admin/akun` → dilempar dengan pesan "Halaman itu hanya untuk pemilik web."

## Belum ada (sengaja)

- Batas percobaan login (rate limit). Masuk tahap order publik bareng pengamanan endpoint.
- Nonaktifkan akun / ganti password dari halaman Akun.
- Semua halaman publik, produk, order, pelanggan, laporan fee, pengaturan.
