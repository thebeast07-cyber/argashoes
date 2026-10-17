# 04 · Pengaturan dan usulan (dashboard admin)

Status: selesai di branch `tahap-3-pengaturan-fee`. Tes: 119 unit + DB lulus, typecheck/lint/build bersih, klik-tes di layar 375px dari sisi admin toko dan pemilik lulus.

Dikerjakan dengan antislop mode **during**. Arah tampilan tetap `DESIGN.md`.

## Keputusan pemilik web (17 Okt 2026)

Angka fee ditentukan retailer, bukan pemilik web. Pemilik web cuma menyediakan alatnya, tapi harus tahu dan setuju dulu sebelum angka baru berlaku. Rekening yang tampil ke pelanggan diperlakukan sama, karena ke sanalah uang pelanggan masuk.

Jadi:

| Pengaturan | Admin toko | Pemilik web |
|---|---|---|
| Tier fee per rentang harga | Mengusulkan | Ubah langsung, setujui/tolak usulan |
| Fee khusus per produk | Mengusulkan dari halaman produk | Ubah langsung di form produk, setujui/tolak usulan |
| Rekening tampil | Mengusulkan | Ubah langsung, setujui/tolak usulan |
| Nomor WhatsApp, ambang stok | Ubah langsung | Ubah langsung |

Semua perubahan, langsung maupun lewat usulan, masuk `audit_log` dan tampil di **Riwayat perubahan** yang dilihat dua pihak.

## Yang dibangun

| Halaman | Isi |
|---|---|
| `/admin/pengaturan` | Tier yang berlaku, rekening, nomor WA dan ambang stok. Pemberitahuan usulan yang menunggu |
| `/admin/pengaturan/tier` | Editor tier. Pemilik menyimpan langsung, admin toko mengirim usulan |
| `/admin/pengaturan/usulan` | Usulan menunggu (paling lama di atas) dan 30 yang terakhir diputuskan |
| `/admin/pengaturan/usulan/[id]` | Perbandingan angka berlaku vs diusulkan, dampak ke produk, keputusan, tarik usulan |
| `/admin/pengaturan/riwayat` | 50 perubahan terakhir |
| `/admin/produk/[id]` | Admin toko: form usulan fee khusus. Dua pihak: pemberitahuan kalau ada usulan fee untuk produk itu |
| Tab bawah | Tab Pengaturan, dengan angka usulan menunggu untuk pemilik. Beranda pemilik juga menampilkannya |

## Peta file

| File | Isi |
|---|---|
| `src/lib/domain/pengaturan.ts` | Editor tier (batas jadi rentang rapat), nomor WA, rekening, ambang stok |
| `src/lib/domain/usulan.ts` | Jenis dan status usulan, kunci, usulan basi, dampak tier ke produk |
| `src/lib/domain/waktu.ts` | Format waktu WIB untuk tampilan |
| `src/lib/pengaturan/data.ts` | Query pengaturan, usulan, riwayat |
| `src/lib/pengaturan/mutasi.ts` | Ubah langsung, ajukan, putuskan, tarik. Semua dalam transaksi bersama audit log |
| `src/lib/pengaturan/ringkasan.ts` | Teks ringkas untuk daftar usulan dan riwayat |
| `src/components/label-tier.tsx` | Tier sebagai label kardus: fee besar, rentang kecil di bawah |
| `drizzle/0002_usulan.sql` | Tabel `usulan`, enum jenis dan status |

## Aturan yang dijaga

**Tier selalu rapat.** Editor tidak meminta rentang, tapi batas atas tiap tier. Tier pertama mulai Rp 0, tiap tier mulai di batas tier sebelumnya, tier terakhir tanpa batas atas. Rentang bolong dan tumpang tindih jadi tidak mungkin, bukan cuma diperingatkan. Kalau tier lama di database ternyata bolong (misalnya diisi lewat SQL), halaman Pengaturan memberi peringatan.

**Satu usulan menunggu per sasaran.** Sasarannya: tier, rekening, atau satu produk. Dijaga indeks unik parsial `usulan_satu_menunggu_uq` di kolom `kunci`, jadi dua klik bersamaan pun tidak bisa menghasilkan dua usulan.

**Usulan basi tidak bisa disetujui.** Usulan menyimpan nilai yang berlaku saat diajukan (`dasar`). Saat disetujui, nilai sekarang dibandingkan dengan `dasar`. Kalau beda (misalnya pemilik mengubah langsung di antaranya), persetujuan ditolak dan usulan tetap menunggu sampai ditolak atau ditarik. Tanpa ini, menyetujui usulan lama bisa menimpa perubahan yang lebih baru tanpa ketahuan. Pemilik juga diberi tahu di halaman Pengaturan kalau ada usulan menunggu sebelum mengubah langsung.

**Usulan yang isinya sama dengan yang berlaku ditolak** sebelum tersimpan.

**Rekening:** saat menyetujui usulan rekening, pemilik diingatkan untuk mencocokkan nomornya langsung ke retailer lewat telepon. Kalau akun admin toko dipakai orang lain, usulan rekening adalah cara uang pelanggan dialihkan.

**Order lama tidak berubah.** Fee disalin ke item order saat order dibuat (sudah dari Tahap 1), jadi tier atau fee khusus baru hanya berlaku untuk order berikutnya.

## Cara ngetes lokal

1. `npm run db:migrate` (atau langsung `npm run dev`, migrasi jalan otomatis).
2. Butuh dua akun: satu `pemilik`, satu `admin_toko` (`npm run user:create`, matikan `npm run dev` dulu).
3. Masuk sebagai admin toko: usulkan tier, usulkan fee khusus di satu produk, usulkan rekening.
4. Masuk sebagai pemilik: lihat angka di tab Pengaturan, setujui satu, tolak satu. Untuk kasus basi: ubah rekening langsung dulu, lalu buka usulan rekening. Tombol Setujui hilang.
5. Cek Riwayat perubahan dari dua akun.

## Bug yang ketemu saat klik-tes dan sudah dibetulkan

1. Nomor WA tersimpan sebagai angka: string `"6281234567890"` di kolom jsonb terbaca balik sebagai number. Sekarang disimpan `{ nomor }`.
2. "Ikut tier (Rp 75.000)" terpotong di tengah angka di layar 375px. Sekarang angkanya di baris sendiri.
3. Riwayat "Usulan fee khusus produk diajukan" tidak menyebut produknya. Sekarang nama produk ikut dicatat di audit saat itu juga.
4. Pemilik bisa mengubah rekening langsung tanpa tahu ada usulan menunggu, yang lalu jadi basi. Sekarang ada pemberitahuan di atas form.

## Belum ada

- Pemberitahuan di luar panel admin (WhatsApp atau email ke pemilik saat ada usulan). Sekarang cuma angka di tab dan pemberitahuan di beranda.
- Nama toko, area kirim, kebijakan retur di Pengaturan (PRD menyebutnya, roadmap Tahap 3 tidak).
- Halaman audit log untuk stok dan akun. Riwayat di sini khusus pengaturan dan fee.
- Fee yang `null` saat checkout (produk tanpa fee khusus dan tanpa tier yang cocok). Dengan tier rapat ini tidak terjadi selama minimal ada satu tier, tapi alur checkout di Tahap 5 tetap harus menolaknya.
