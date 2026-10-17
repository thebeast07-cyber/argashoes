# Roadmap

Urutan ini mengikuti dependensi: order butuh produk, laporan fee butuh order. Tiap tahap = 1 branch + 1 PR, diuji di Preview Vercel sebelum masuk `main`.

| # | Tahap | Isi | Butuh dari retailer |
|---|---|---|---|
| 1 | Fondasi | Selesai, lihat `01-fondasi.md` | – |
| 2 | Produk & stok (admin) | Selesai, lihat `03-produk-stok.md`. Upload foto: maks 8 per model, Vercel Blob (lokal: `./.data/foto`) | Contoh data produk untuk memastikan format CSV katalog |
| 3 | Pengaturan & tier fee | Selesai, lihat `04-pengaturan-usulan.md`. Admin toko mengusulkan, pemilik menyetujui | Tabel fee per rentang harga (diisi lewat usulan) |
| 4 | Katalog publik | Selesai: beranda cari size, grid, cari, filter merek/kategori/harga, urut harga, halaman produk dengan galeri dan status stok, cara order. Tombol pesan menunggu tahap 5 | Foto produk |
| 5 | Keranjang, checkout, WhatsApp | Selesai: keranjang di browser, checkout + persetujuan, order `WEB-XXXX` tersimpan dulu baru ke WA (klik dicatat), halaman konfirmasi, batas kirim per nomor WA dan per IP (memori), honeypot. Rate limit per IP yang kuat menunggu Redis | Nomor WA toko |
| 6 | Order & pelanggan (admin) | Selesai: daftar order per status + cari (kode/nama/WA), detail, ubah status (Batal wajib alasan, Dikirim wajib resi), foto resi, catatan internal, riwayat, pelanggan + riwayat + ekspor CSV, beranda: order hari ini dan Lead > 24 jam, email order baru (Resend) | – |
| 7 | Laporan fee | Selesai: ringkasan semua bulan, rekap per bulan WIB dari tanggal Dikirim, order pendukung, tandai dibayar (dengan deteksi selisih), ekspor CSV. Cut-off memakai bulan kalender sampai retailer menentukan lain | Tanggal cut-off, aturan retur |
| 8 | Beranda admin & analitik | Ringkasan hari ini, order Lead > 1 jam, size habis, klik WA 7/30 hari (Redis) | – |
| 9 | Halaman pendukung & SEO | Cara order, retur, privasi, sitemap, link UTM | Kebijakan retur, nama brand, domain |
| 10 | Asisten AI (admin) | Draf, lihat `docs/asisten-ai.md`: tanya stok, update stok, tambah produk dari ketikan dan foto label dus (Gemini) | Masukan pemilik atas draf, `GEMINI_API_KEY` |

Tahap 2 dan 3 bisa jalan tanpa nunggu mockup publik di-ACC. Tahap 4–5 sebaiknya nunggu ACC mockup (sesuai PRD).
