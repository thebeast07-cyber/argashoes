# Roadmap

Urutan ini mengikuti dependensi: order butuh produk, laporan fee butuh order. Tiap tahap = 1 branch + 1 PR, diuji di Preview Vercel sebelum masuk `main`.

| # | Tahap | Isi | Butuh dari retailer |
|---|---|---|---|
| 1 | Fondasi | Selesai, lihat `01-fondasi.md` | – |
| 2 | Produk & stok (admin) | Selesai, lihat `03-produk-stok.md`. Sisa: upload foto | Contoh data produk untuk memastikan format CSV katalog |
| 3 | Pengaturan & tier fee | Selesai, lihat `04-pengaturan-usulan.md`. Admin toko mengusulkan, pemilik menyetujui | Tabel fee per rentang harga (diisi lewat usulan) |
| 4 | Katalog publik | Grid produk, cari, filter brand/kategori/size/harga, halaman produk dengan status Ready/Sisa sedikit/Habis | Foto produk |
| 5 | Keranjang, checkout, WhatsApp | Keranjang di browser, form checkout + persetujuan data, order `WEB-xxxx` tersimpan dulu baru redirect WA, halaman konfirmasi, rate limit + honeypot | Nomor WA toko |
| 6 | Order & pelanggan (admin) | Daftar order per status, detail, ubah status + resi + foto resi (Vercel Blob), catatan internal, daftar pelanggan + riwayat | – |
| 7 | Laporan fee | Rekap per bulan, daftar order pendukung, tandai sudah dibayar, ekspor CSV | Tanggal cut-off, aturan retur |
| 8 | Beranda admin & analitik | Ringkasan hari ini, order Lead > 1 jam, size habis, klik WA 7/30 hari (Redis) | – |
| 9 | Halaman pendukung & SEO | Cara order, retur, privasi, sitemap, link UTM | Kebijakan retur, nama brand, domain |

Tahap 2 dan 3 bisa jalan tanpa nunggu mockup publik di-ACC. Tahap 4–5 sebaiknya nunggu ACC mockup (sesuai PRD).
