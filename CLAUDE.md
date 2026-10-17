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
npm run db:migrate   # Neon kalau DATABASE_URL terisi, selain itu PGlite lokal. Di Vercel jalan otomatis (skrip vercel-build)
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
- `src/lib/domain/foto.ts`: urutan foto (sampul = foto pertama), batas 8 per model, syarat file (murni). `src/lib/foto/penyimpanan.ts`: kredensial Blob ada → Vercel Blob, kosong → `./.data/foto` disajikan `src/app/foto/[nama]/route.ts`. Kredensial dibaca `kredensial-blob.ts`: `BLOB_READ_WRITE_TOKEN` (atau `<PREFIX>_READ_WRITE_TOKEN`) dulu, kalau tidak ada `BLOB_STORE_ID` + OIDC Vercel (integrasi Blob yang baru hanya membuat ID store). `kecilkan.ts`: foto dikecilkan ke 1600px JPEG di browser sebelum upload (satu foto per server action).
- Asisten tanya stok (`docs/asisten-ai.md`): halaman `src/app/admin/(panel)/produk/tanya/` (izin `produk.kelola`, hanya membaca). `src/lib/asisten/gemini.ts` memanggil Gemini lewat REST (`GEMINI_API_KEY`, opsional `GEMINI_MODEL`; model 404 dilewati ke cadangan) dan hanya meminta Maksud (jenis, nomor model, size). Pencocokan dan angka stok di `src/lib/domain/asisten-stok.ts` dari data DB, tidak pernah dari balasan AI. Batas 10 pertanyaan per akun per menit (memori).
- `src/lib/domain/katalog.ts`: baca pencarian dari URL, saring/urut katalog, ringkas size per kartu (murni). `src/lib/katalog/data.ts`: query publik (hanya model aktif). Halaman publik di `src/app/(publik)/`: beranda katalog, `/produk/[id]`, `/cara-order`. Utilitas `.wadah` di `globals.css` membatasi isi 1200px dengan latar tetap selebar layar.
- `src/lib/domain/keranjang.ts` (keranjang di localStorage, murni) dan `checkout.ts` (validasi pembeli, `rencanakanOrder` membaca ulang harga/stok, kode `WEB-XXXX` acak, pesan WhatsApp, batas kirim). `src/lib/orders/buat-order.ts`: pelanggan + order Lead + item + event dalam satu transaksi, `orderPublik`, `catatKlikWa`. Alur publik: `/produk/[id]` → `/keranjang` (server action `kirimPesanan`) → `/pesanan/[kode]` → `/pesanan/[kode]/wa` (catat klik, 303 ke wa.me). Hook `src/lib/keranjang/use-keranjang.ts`.
- Admin order (tahap 6): `src/app/admin/(panel)/order/` (daftar per status, detail, ubah status, resi + foto resi, catatan internal, riwayat) dan `pelanggan/` (+ ekspor CSV di `src/app/admin/pelanggan/ekspor`). Query di `src/lib/orders/data.ts`, tulis di `mutasi.ts` (dengan `audit_log`). Aturan tampilan (Lead > 24 jam, awal hari WIB, isi email) di `src/lib/domain/order-admin.ts`. Email order baru: `src/lib/notifikasi/` lewat Resend (`RESEND_API_KEY` kosong → tidak mengirim), penerima semua pemilik aktif + `EMAIL_NOTIFIKASI`.
- Laporan fee (tahap 7): `src/app/admin/(panel)/fee/` (ringkasan semua bulan, detail per bulan, tandai dibayar) dan ekspor CSV di `src/app/admin/fee/[bulan]/ekspor`. Angka selalu lewat `rekapFeeBulanan`; `src/lib/fee/data.ts` hanya menyaring kasar di SQL. Bulan, tanggal WIB, dan status bayar (belum/lunas/selisih) di `src/lib/domain/laporan-fee.ts`. Hanya izin `fee.laporan` (pemilik).
- `src/components/pesan.tsx`: `PesanGalat` (galat selalu ikon + teks, bukan warna saja) dan `RingkasanGalat` (dekat tombol simpan, memindah fokus ke kolom pertama yang `aria-invalid`). Pakai ini untuk semua pesan gagal.
- `src/components/ikon.tsx`: ikon buatan sendiri. Jangan pakai Lucide atau library ikon lain (permintaan pemilik).
- `DESIGN.md`: arah tampilan sementara (token warna di `tailwind.config.ts`). Baca sebelum kerja UI.
- `src/lib/domain/pengaturan.ts`: editor tier (batas → rentang rapat), nomor WA, rekening, ambang stok. `usulan.ts`: jenis/status usulan, deteksi usulan basi, dampak tier ke produk. `waktu.ts`: tampilan waktu WIB.
- `src/lib/pengaturan/`: `data.ts` (query pengaturan, usulan, riwayat), `mutasi.ts` (ubah langsung + ajukan/putuskan/tarik usulan, semua dengan `audit_log`), `ringkasan.ts` (teks daftar usulan dan riwayat).
- `src/lib/auth/`: `roles.ts` (peran → izin, murni), `password.ts` (scrypt), `session.ts` (akun & sesi, tanpa Next), `current.ts` (helper Next: `wajibLogin`, `wajibIzin`). `akun.ts`: reset password dan aktif/nonaktif akun oleh pemilik (aturannya di `src/lib/domain/akun.ts`: tidak bisa menonaktifkan diri sendiri, minimal satu pemilik aktif); keduanya menghapus semua sesi akun itu.
- `src/app/admin/`: login dan panel admin (mobile, tab bawah). `src/middleware.ts` hanya cek ada-tidaknya cookie; validasi sesi asli di layout panel.
- `tests/unit/`: test fungsi murni. `tests/db/`: test integrasi dengan PGlite in-memory.

## Auth

- Akun per orang di tabel `users`, peran `pemilik` atau `admin_toko`. Tidak ada pendaftaran publik. Akun pertama: login dengan email apa saja + sandi = env `ADMIN_PASSWORD` selama tabel `users` masih kosong (`buatPemilikPertama`, dikunci advisory lock), atau lewat `npm run user:create`. Akun berikutnya dari halaman Akun (pemilik saja). `ADMIN_PASSWORD` tidak boleh ditulis di repo (repo publik).
- Sesi: token acak di cookie httpOnly `argashoes_sesi`, yang disimpan di DB hanya hash sha256-nya. Berlaku 14 hari.
- Admin toko: `pengaturan.ubah` (nomor WA, ambang stok) dan `usulan.ajukan`. Khusus pemilik: `fee.atur`, `rekening.atur` (ubah langsung) dan `usulan.putuskan`.
- Cek izin dengan `wajibIzin("fee.atur")` dsb. Daftar izin per peran ada di `src/lib/auth/roles.ts`; jangan cek `peran === "pemilik"` langsung di halaman.

## Keputusan teknis (di luar yang tertulis di PRD)

- **Tier fee punya tabel sendiri** (`fee_tiers`: harga_min inklusif, harga_max eksklusif/null, fee), bukan JSON di `settings`, supaya bisa divalidasi constraint. `products.fee_per_pasang` (opsional) menimpa tier. Fee dibatasi Rp 50.000–100.000 di DB dan di `validasiTier`.
- **Transisi status**: lead → dikonfirmasi/batal; dikonfirmasi → dikirim/batal; dikirim → selesai. Selesai dan batal adalah status akhir. Dikirim → batal (retur) belum diizinkan karena aturan fee retur masih pertanyaan terbuka di PRD.
- **Dikirim wajib resi** dijaga dua lapis: `transisiStatus` dan CHECK constraint di tabel `orders`. `dikirim_pada` diisi saat pindah ke Dikirim dan tidak berubah saat Selesai.
- **Tidak ada tier yang cocok** → `tentukanFeePerPasang` mengembalikan `null`; checkout memakai `FEE_MIN` (Rp 50.000, batas bawah kesepakatan) supaya pembeli tidak ditolak selama tabel fee belum lengkap. Fee disalin ke `order_items` saat order dibuat.
- **Batal wajib alasan** dijaga dua lapis (`transisiStatus` dan CHECK `orders_alasan_batal_check`); alasan juga disalin ke `order_events.catatan` supaya tetap terbaca di riwayat yang append-only.
- **Pembayaran fee** (`fee_payments`): total diambil dari rekap di server saat ditandai dibayar, bukan dari form. Kalau rekap bulan itu berubah sesudahnya (mis. ditandai sebelum bulan selesai), halaman menampilkan selisih dan meminta tandai ulang. Tandai dan pembatalannya tercatat di `audit_log`.
- **Lead terbengkalai** = Lead yang dibiarkan 24 jam atau lebih (keputusan pemilik, bukan 1 jam seperti PRD).
- **Order publik**: harga dan stok dibaca ulang dari DB saat checkout (bukan dari browser); web tidak menahan stok. Kode `WEB-XXXX` acak (bukan urut) dari alfabet tanpa 0/O/1/I/L, diulang kalau bentrok. Batas 3 order per nomor WA per jam (DB) dan 10 kirim per IP per 10 menit (memori, sampai Redis ada), plus kolom jebakan bot. Pesan WA disusun di server dan memuat alamat, karena halaman order admin belum ada.
- Tambahan tabel di luar PRD: `sessions`, `fee_tiers`, `audit_log` (riwayat perubahan stok/produk/akun/pengaturan, append-only), `usulan`.
- Fee per produk hanya bisa diubah langsung oleh pemilik (izin `fee.atur`), termasuk lewat import CSV. Admin toko mengusulkan lewat halaman produk.
- **Usulan** (tabel `usulan`): tier fee, fee khusus produk, dan rekening tampil yang diajukan admin toko baru berlaku setelah disetujui pemilik. Satu sasaran hanya boleh punya satu usulan menunggu (indeks unik parsial pada `kunci`). Usulan menyimpan nilai saat diajukan (`dasar`); kalau nilai sekarang sudah beda, usulan basi dan tidak bisa disetujui, supaya perubahan yang lebih baru tidak tertimpa diam-diam.
- **Tier disimpan rapat**: editor menerima batas atas per tier, tier pertama mulai Rp 0 dan tier terakhir tanpa batas atas, jadi tidak ada rentang bolong. Tier ditulis ulang seluruhnya dalam satu transaksi dengan advisory lock.
- Setting `nomor_wa` disimpan sebagai `{ nomor }`, bukan string polos: string angka di jsonb terbaca balik sebagai number.
- `customers.user_id` disiapkan untuk login pelanggan nanti, belum punya FK.

## Belum dibangun

Pengaturan nama toko/area kirim/kebijakan retur, halaman audit log untuk stok dan akun, Redis, rate limit login. Catatan per tahap ada di `notes/`.

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
