# PRD Web Sepatu: Funnel WhatsApp

> Salinan dari dokumen PRD di Claude Docs (versi 16 Okt 2026). Diagram alur order, arsitektur, dan rencana kerja hanya ada di dokumen aslinya. Kalau dokumen asli berubah, perbarui file ini.

## Ringkasan dan tujuan

Web ini jadi etalase dan corong penjualan sepatu Nike/Adidas milik satu retailer, dengan closing diselesaikan lewat WhatsApp. Pemilik web mendapat fee Rp 50.000 sampai Rp 100.000 per pasang (tergantung sepatu atau rentang harganya) untuk setiap order yang berstatus Dikirim.

Masalahnya: retailer sudah jualan di marketplace, tapi potongan admin dan layanan di sana terlalu besar. Solusinya: kanal sendiri tanpa potongan itu, dengan harga web yang lebih murah dari marketplace, sementara pemilik web hanya dibayar saat ada closing.

Ukuran sukses MVP (target usulan, bisa direvisi):

- Ratusan SKU retailer ter-import dan tampil per size.
- Minimal 20 pasang berstatus Dikirim dalam 4 minggu uji coba pertama.
- Setiap order tercatat dengan kode `WEB-xxxx`, status, dan nomor resi.
- Rekap fee bulan pertama selesai tanpa selisih angka antara kedua pihak.

## Model bisnis dan fee

Pemilik web jadi funnel, retailer mengurus semua transaksi. Fee Rp 50.000 sampai Rp 100.000 per pasang, tergantung sepatu atau harganya, dibayar bulanan.

- **Pemilik web**: membangun dan mengelola web, mendatangkan traffic, menanggung biaya iklan.
- **Retailer**: stok, harga, pembayaran, pengiriman, CS, dan retur.
- **Pembayaran pembeli**: transfer langsung ke rekening pribadi retailer setelah konfirmasi di WhatsApp. Tidak ada payment gateway.
- **Fee**: Rp 50.000 sampai Rp 100.000 per pasang, tergantung sepatunya atau rentang harganya (cara menentukannya masih dibahas, lihat pertanyaan terbuka). Disimpan sebagai aturan fee di pengaturan admin dan bisa diubah per produk. Order dua pasang dihitung per pasang, masing-masing dengan fee-nya sendiri.
- **Dasar hitung**: hanya order berstatus Dikirim atau Selesai. Fee dibayar retailer ke pemilik web sebulan sekali dengan tanggal cut-off tetap.
- **Harga web**: lebih murah dari marketplace karena tanpa potongan admin dan layanan. Nominal harga ditentukan retailer.
- **Hubungan**: retailer adalah saudara pemilik web. Kesepakatan fee tetap ditulis singkat di chat WhatsApp supaya hitungan akhir bulan tidak jadi perdebatan.

## Pengguna dan peran

Tiga peran dengan hak akses berbeda. Login admin memakai akun per orang, bukan satu kata sandi bersama seperti di web kanopi.

| Peran | Siapa | Bisa apa |
|---|---|---|
| Pembeli | Publik | Lihat katalog, pakai keranjang, isi data checkout, login opsional untuk simpan data |
| Admin toko | Retailer | Kelola produk dan stok, ubah status order, isi nomor resi dan foto resi, lihat pelanggan, ubah nomor WhatsApp dan ambang stok. Aturan fee dan rekening tampil tidak bisa diubah langsung: admin toko mengusulkan, dan perubahan baru berlaku setelah disetujui pemilik web |
| Pemilik web | Pemilik proyek | Semua akses admin toko, ditambah mengubah fee dan rekening tampil secara langsung, menyetujui atau menolak usulan admin toko, laporan fee, kelola akun admin, dan analitik traffic |

## Alur order lewat WhatsApp

Order tercatat sebagai Lead begitu checkout dikirim, dan fee baru mulai dihitung saat retailer menandai Dikirim.

## Fitur MVP: sisi publik

Mobile-first, karena mayoritas pembeli membuka dari HP. Tidak ada tahap pembayaran di web.

- **Katalog**: grid produk, pencarian, filter brand, kategori, size, dan rentang harga, urut harga.
- **Halaman produk**: foto, harga dan harga coret, pilihan size dengan status stok (Ready, Sisa sedikit, Habis), tombol tambah ke keranjang.
- **Keranjang**: banyak item, ubah jumlah, total otomatis. Isi keranjang disimpan di browser.
- **Checkout**: nama, nomor WhatsApp, alamat kirim, catatan, dan checkbox persetujuan data. Pembeli boleh checkout sebagai tamu.
- **Order tersimpan lalu ke WhatsApp**: saat checkout dikirim, order dicatat dengan kode `WEB-xxxx`, lalu pembeli diarahkan ke WhatsApp retailer dengan pesan terisi (item, size, jumlah, total, kode).
- **Halaman konfirmasi**: kode order, penjelasan bahwa toko akan mengonfirmasi stok dan total, dan tombol untuk membuka WhatsApp lagi.
- **Login opsional**: untuk menyimpan data dan melihat riwayat order. Dasar CRM, tidak boleh jadi syarat checkout.
- **Halaman pendukung**: info toko dan nama rekening, cara order, kebijakan retur (mengikuti retailer), dan kebijakan privasi.
- **SEO dan promosi**: judul halaman menyebut brand dan kota, sitemap, dan link berlabel UTM untuk Instagram, status WhatsApp, dan Google Maps.

## Fitur MVP: dashboard admin

Dibuat untuk HP seperti admin web kanopi, dengan tab bawah. Semua perubahan status dan stok tercatat di audit log.

| Bagian | Isi |
|---|---|
| Beranda | Order hari ini, jumlah per status, klik WhatsApp 7 dan 30 hari, produk dan size yang habis, order yang belum dikonfirmasi lebih dari 1 jam |
| Produk | Daftar dengan pencarian dan filter (brand, model, size), edit produk (termasuk fee per pasang) dan varian size beserta stok, tombol Tandai habis per size, import dan ekspor CSV |
| Order | Daftar dengan filter status, detail item dan data pembeli, ubah status, isi nomor resi dan unggah foto resi, catatan internal |
| Pelanggan | Daftar dan pencarian, riwayat order per pelanggan, ekspor untuk CRM |
| Laporan fee | Rekap per bulan: jumlah pasang berstatus Dikirim atau Selesai, fee per pasang, total, daftar order pendukung, ekspor |
| Pengaturan | Nama toko, nomor WhatsApp, nama dan nomor rekening yang ditampilkan, aturan fee per pasang (rentang harga dan pengecualian per produk), ambang status stok, area kirim, kebijakan retur |
| Akun dan log | Akun admin per orang, peran, riwayat perubahan |

Hak akses: Laporan fee hanya untuk pemilik web. Admin toko mengelola Produk, Order, dan Pelanggan. Di Pengaturan, admin toko mengubah nomor WhatsApp dan ambang stok secara langsung, sedangkan perubahan tier fee, fee khusus per produk, dan rekening tampil diajukan sebagai usulan yang baru berlaku setelah disetujui pemilik web. Semua perubahan pengaturan bisa dilihat kedua pihak di riwayat perubahan.

## Status order dan aturan fee

Fee hanya dihitung dari pasangan sepatu pada order berstatus Dikirim atau Selesai, dan hanya kalau nomor resinya terisi.

| Status | Arti | Diubah oleh | Kena fee |
|---|---|---|---|
| Lead | Order tercatat saat checkout dikirim | Otomatis | Tidak |
| Dikonfirmasi | Retailer sudah konfirmasi stok dan total lewat WhatsApp | Admin toko | Tidak |
| Dikirim | Barang dikirim, nomor resi terisi (foto resi disarankan) | Admin toko | Ya |
| Selesai | Barang diterima pembeli | Admin toko | Ya |
| Batal | Dibatalkan oleh pembeli atau toko, atau stok habis | Admin toko | Tidak |

Aturan:

1. Klik tombol WhatsApp dicatat sebagai waktu (`wa_clicked_at`) pada order, bukan sebagai status. Berguna untuk mengukur corong, bukan untuk fee.
2. Status Dikirim tidak bisa disimpan tanpa nomor resi.
3. Setiap perubahan status mencatat siapa, kapan, dari status apa ke status apa. Log ini tidak bisa diedit.
4. Periode fee adalah bulan kalender (WIB), dihitung dari tanggal status berubah menjadi Dikirim.
5. Fee = jumlah dari fee tiap pasang yang memenuhi syarat. Fee per pasang (Rp 50.000 sampai Rp 100.000) diambil dari produknya dan disalin ke item order saat order dibuat, jadi perubahan aturan tidak mengubah order lama.
6. Pemilik web boleh meminta sampel bukti resi untuk pengecekan.

## Aturan stok

Stok dipakai bareng marketplace (stok global, ratusan SKU, per size), jadi stok di web bisa tertinggal. Pengamannya adalah konfirmasi WhatsApp sebelum transfer, bukan sinkronisasi otomatis.

- **Web tidak menahan stok.** Order baru berstatus Lead sampai retailer mengonfirmasi lewat WhatsApp. Kalau retailer lupa, konfirmasi dilakukan di chat.
- **Status, bukan angka**: Ready (stok 3 atau lebih), Sisa sedikit (1 sampai 2), Habis (0). Ambang dapat diubah di Pengaturan.
- **Tombol Tandai habis** per size, satu ketuk dari HP, untuk dipakai saat ada yang laku di marketplace.
- **Update massal** lewat import CSV (misalnya tiap pagi), dengan kolom `sku`, `size`, `stok`.
- **Data stok tidak di-cache lama**: halaman produk membaca stok terbaru dan checkout memeriksa ulang. Ini beda dengan web kanopi yang men-cache data 1 jam.
- **Tidak masuk MVP**: sinkronisasi otomatis ke marketplace. Perlu pendaftaran dan persetujuan API tiap platform, dinilai lagi setelah ada closing nyata.

## Data pelanggan dan privasi

Data pelanggan dimiliki berdua oleh pemilik web dan retailer, dan hanya diambil seperlunya untuk mengirim barang. Prinsipnya mengikuti UU Pelindungan Data Pribadi (UU 27/2022).

- **Yang disimpan**: nama, alamat kirim, nomor WhatsApp, dan email jika pembeli login dengan Google. Tidak ada data kartu atau rekening pembeli.
- **Persetujuan**: checkbox di checkout dan halaman kebijakan privasi singkat yang menyebut tujuan pemakaian dan siapa pemegang data.
- **Kesepakatan berdua** (tertulis singkat): untuk apa data boleh dipakai (pengiriman, CRM, broadcast promo), siapa yang boleh mengirim promo, dan apa yang terjadi pada data jika kerja sama berakhir.
- **Akses**: hanya akun admin, satu akun per orang. Perubahan penting masuk audit log.
- **Hapus data**: permintaan penghapusan dari pelanggan diproses dan diselesaikan dengan menganonimkan order lama, supaya laporan fee tetap utuh.
- **Endpoint order publik dijaga**: validasi ketat, rate limit per IP, dan honeypot untuk bot.
- **Analitik**: hitungan harian tanpa cookie dan tanpa data pribadi, seperti web kanopi.

## Arsitektur dan stack

Satu aplikasi Next.js di Vercel melayani halaman publik dan dashboard admin, dan keduanya memakai API order yang sama untuk menyimpan data ke Postgres.

**Dipakai ulang dari web kanopi**: Next.js dan Tailwind, unggah foto ke Blob dengan resize di browser, shell admin untuk HP, pembuat link WhatsApp, statistik harian di Redis, dan struktur test (unit dengan tsx, e2e dengan Playwright). Pola login dipakai sebagai dasar tapi diubah menjadi akun per orang dengan peran.

**Dibangun baru**: Postgres untuk order, pelanggan, dan stok per size, alur order dan status, import CSV, laporan fee, serta pengamanan endpoint publik.

## Model data

Order, pelanggan, dan stok per size disimpan di Postgres, bukan satu JSON seperti web kanopi, karena order dibuat publik secara bersamaan dan CRM butuh query per pelanggan. Nama kolom di bawah adalah usulan awal.

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `users` | id, nama, email, peran (pemilik atau admin_toko), kredensial, dibuat | Akun admin per orang |
| `products` | id, nama, brand, kategori, deskripsi, harga, harga_coret, fee_per_pasang (opsional, menimpa tier), foto, aktif | Satu model sepatu |
| `variants` | id, product_id, sku, size, stok | Unik per product_id dan size. Di sinilah ratusan SKU berada |
| `customers` | id, nama, no_wa (unik), email, alamat_terakhir, persetujuan_pada, user_id | user_id kosong untuk tamu |
| `orders` | id, kode `WEB-xxxx`, customer_id, status, total, alamat dan nama (salinan saat order), catatan, wa_clicked_at, resi_nomor, resi_foto, dikirim_pada, utm_source | Alamat disalin supaya riwayat tidak berubah kalau pelanggan ganti alamat |
| `order_items` | id, order_id, variant_id, nama_produk, size, harga_satuan, jumlah, fee_per_pasang | Fee per pasang disalin saat order dibuat |
| `order_events` | id, order_id, dari_status, ke_status, oleh_user_id, waktu | Audit log, hanya bisa ditambah |
| `fee_payments` | id, bulan, total, dibayar_pada, catatan | Penanda fee bulan tertentu sudah dibayar |
| `settings` | kunci, nilai | Nomor WhatsApp, rekening tampil, tier fee per rentang harga, ambang status stok |

Penyimpanan lain: Redis untuk hitungan statistik harian, Vercel Blob untuk foto produk dan foto resi.

## Di luar scope MVP dan fase 2

**Tidak dikerjakan di MVP**

- Payment gateway, upload bukti transfer, halaman instruksi bayar, dan batas waktu bayar.
- Penahanan (reservasi) stok.
- Sinkronisasi otomatis stok dan order dengan marketplace.
- Cek ongkir dan cetak label otomatis lewat API kurir.
- Dashboard analitik yang rumit.

**Fase 2 (setelah ada closing nyata)**

- CRM: segmentasi pelanggan, broadcast WhatsApp, pengingat repeat order.
- Login lewat OTP WhatsApp (butuh API berbayar).
- Wishlist dan notifikasi stok kembali.
- Retur dan tukar size sebagai alur di sistem.
- Dukungan retailer kedua dan seterusnya.

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Traffic sepi, web kalah dari marketplace | Closing sedikit, fee kecil | Mulai dari pelanggan lama retailer, SEO lokal, dan harga atau bonus eksklusif web. Iklan baru setelah organik jalan |
| Stok web basi karena stok dipakai bareng marketplace | Pembeli kecewa, order batal | Konfirmasi WhatsApp sebelum transfer, status stok, tombol Tandai habis, import CSV rutin |
| Pembeli ragu transfer ke rekening pribadi | Konversi rendah | Tampilkan nama toko dan nama rekening, konfirmasi lewat WhatsApp, testimoni dan foto paket asli |
| Closing tidak tercatat atau dihindari | Fee tidak terbayar | Order selalu tersimpan sebelum redirect, status dan resi wajib, log tidak bisa diedit, cek sampel resi |
| Fee dipersoalkan karena saudara | Hubungan terganggu | Kesepakatan fee tertulis di chat, laporan bulanan yang bisa dilihat berdua |
| Aturan brand atau distributor (harga, foto resmi) | Web diminta turun | Tanyakan ke retailer di awal, pakai foto milik retailer sendiri |
| Data pelanggan bocor atau disalahgunakan | Kerugian hukum dan reputasi | Data minim, akun per orang, persetujuan, endpoint dijaga |

## Rencana kerja dan milestone

Urutan kerja usulan: coding baru mulai setelah retailer meng-ACC mockup, dan hasilnya diuji di Preview Vercel sebelum masuk `main`. Tanggal belum dipasang karena bergantung kesiapan jawaban retailer.

## Keputusan terkunci dan pertanyaan terbuka

**Sudah diputuskan**

- Repo baru, kerangka diambil dari web kanopi.
- Order dikunci ke WhatsApp. Pembeli transfer ke rekening pribadi retailer setelah konfirmasi. Tanpa payment gateway.
- Fee per pasang Rp 50.000 sampai Rp 100.000, dibayar bulanan, dihitung dari order berstatus Dikirim atau Selesai.
- Data pelanggan milik berdua, hanya nama, alamat, dan nomor WhatsApp.
- Stok global bersama marketplace, dikonfirmasi lewat WhatsApp, tanpa sinkronisasi otomatis.
- Katalog dikelola lewat CMS di web (bukan Google Sheet), dengan import CSV. Foto produk sudah tersedia.
- Pengiriman, retur, dan CS adalah urusan retailer.

**Masih terbuka**

- [ ] Angka tier fee per rentang harga dan fee khusus per model dari retailer. Cara menentukannya sudah diputuskan: dua-duanya dipakai (tier untuk umum, fee khusus menimpa tier), angkanya ditentukan retailer dan masuk lewat usulan yang disetujui pemilik web.
- [ ] Pelanggan lama retailer yang diarahkan ke web tetap kena fee, atau dikecualikan?
- [ ] Order yang diretur setelah berstatus Dikirim: fee dibatalkan atau tetap?
- [ ] Jumlah SKU awal dan bentuk data retailer saat ini (Sheet, ekspor marketplace, atau lainnya) untuk format import CSV.
- [ ] Metode login pelanggan: Google di MVP, OTP WhatsApp di fase 2?
- [ ] Ada aturan brand atau distributor soal harga minimum dan pemakaian foto?
- [ ] Tanggal cut-off dan cara pembayaran fee bulanan.
- [ ] Nama brand web, domain, dan siapa yang membayar domain serta hosting.
- [ ] Area kirim dan ongkir: ditampilkan di web atau dibahas di WhatsApp?
