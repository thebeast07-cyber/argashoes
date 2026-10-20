// Pengetahuan asisten tentang web ini: halaman, label tombol, alur, dan batasannya.
// Nama menu, tombol, dan path harus sama persis dengan yang ada di kode; perbarui file ini setiap ada fitur baru.

export const PENGETAHUAN_WEB = `
# Tentang Argashoes

Argashoes adalah web jualan sepatu Nike dan Adidas milik satu toko (retailer). Pembeli melihat katalog di web, memilih size, mengisi data pengiriman, lalu pesanan tercatat dan pembeli diarahkan ke WhatsApp toko untuk closing (konfirmasi stok, ongkir, transfer). Web tidak menerima pembayaran sendiri dan tidak menghitung ongkir.

Ada dua peran di panel admin:
- Pemilik web: yang membangun dan mengelola web. Bisa semua hal, termasuk fee, rekening, akun, dan laporan fee. Pemilik web mendapat fee per pasang dari order yang sudah Dikirim atau Selesai.
- Admin toko: orang toko (mis. owner toko sepatu). Mengelola produk, stok, foto, order, pelanggan, nomor WhatsApp, ambang stok, dan banner. Tidak bisa mengubah fee atau rekening langsung; untuk itu ia mengirim usulan yang harus disetujui pemilik web.

Stok dipakai bareng marketplace (Shopee, Tokopedia, offline), jadi stok di web perlu diperbarui manual. Web tidak menahan stok saat ada pesanan; kepastian stok dikonfirmasi lewat WhatsApp.

# Menu admin (tab bawah)

- [Beranda](/admin): ringkasan hari ini, order baru, Lead yang dibiarkan lebih dari 24 jam, size yang habis. Pemilik web juga melihat tautan "Lihat laporan fee".
- [Produk](/admin/produk): daftar model sepatu dan stoknya.
- [Order](/admin/order): semua pesanan dari web, bisa disaring per status.
- [Pengaturan](/admin/pengaturan): fee, rekening, nomor WhatsApp, ambang stok, banner promo, usulan, riwayat.
- [Akun](/admin/akun): hanya pemilik web. Kelola akun admin.
Ada juga tombol Asisten (kamu) di kanan bawah semua halaman admin.

# Produk dan stok

Daftar produk ([Produk](/admin/produk)):
- Bisa cari nama, brand, atau SKU, dan menyaring per brand atau size lewat "Filter".
- Ketuk kotak size di daftar untuk "Ubah stok" atau "Tandai habis". Ini cara tercepat saat ada yang laku di marketplace.
- Di halaman model, tiap size punya tombol "Ubah SKU" untuk membetulkan SKU yang salah (mis. lupa menambah size di belakang kode artikel). Mengubah SKU tidak memengaruhi riwayat order.
- Pesan "SKU ... sudah dipakai size ..." berarti SKU itu sudah dipakai size lain; satu SKU hanya untuk satu size. Tambahkan strip dan size di belakang kode artikel.

Tambah model baru ([Model sepatu baru](/admin/produk/baru)):
1. Isi Brand, Nama model, Kategori (opsional), Harga jual, Harga coret (opsional, untuk promo), Deskripsi (opsional).
2. Centang "Tampil di katalog" kalau model mau langsung tampil. Model nonaktif tidak tampil di web.
3. Simpan. Size dan stok diisi setelah model tersimpan, lewat "Tambah size" di halaman model itu. Untuk size pertama, isi SKU dengan kode artikel dari label dus, strip, lalu size (mis. HM9451-600-40). Untuk size berikutnya, cukup ketik size-nya: kolom SKU terisi otomatis (kode artikel + strip + size) dan boleh diubah; ada tautan "Pakai SKU otomatis lagi" kalau sudah terlanjur diubah.
4. Unggah foto lewat "Tambah foto". Maksimal 8 foto per model, foto pertama jadi sampul. Foto otomatis dikecilkan sebelum diunggah.

Status stok di web: Ready kalau stok sama dengan atau di atas angka "Ready mulai stok" (bawaan 3), "Sisa N" kalau di bawahnya, Habis kalau 0 (dicoret). Pembeli tidak melihat angka stok persis kalau masih Ready.

Tampilan di web dirapikan otomatis, owner bebas mengetik dengan gaya apa pun dan data aslinya tidak diubah:
- Nama yang diketik HURUF BESAR SEMUA tampil sebagai Huruf Awal Besar di katalog dan halaman produk (kode berangka seperti AF1/90 dan singkatan seperti OG/SB tetap besar). Di admin tetap terlihat seperti yang diketik.
- Deskripsi yang ditempel dari Shopee/Tokopedia/IG dipecah jadi subjudul dan poin: tanda "•", emoji seperti ✅ atau ➤, "-", dan "1." jadi poin; judul berakhiran titik dua, HURUF BESAR, atau dibungkus 【】/=== jadi subjudul; "Warna: Hitam" labelnya ditebalkan; hashtag dan garis hiasan disembunyikan.

Harga promo: isi "Harga coret" lebih tinggi dari "Harga jual". Di web tampil harga coret dicoret dan harga jual di sampingnya. Belum ada kode voucher.

Fee per pasang per produk: pemilik web bisa mengisi fee khusus di halaman produk. Admin toko mengusulkan lewat "Kirim usulan fee". Kalau kosong, fee mengikuti tier di Pengaturan.

# Import CSV (banyak produk sekaligus)

Halaman: [Import CSV](/admin/produk/import). Ada dua jenis:
- "Update stok": hanya mengubah stok size yang sudah ada. Kolom: sku, size, stok. Cocok untuk update rutin tiap pagi.
- "Katalog lengkap": menambah model dan size baru, mengubah harga dan stok. Kolom wajib: sku, brand, nama, harga, size, stok. Opsional: kategori, harga_coret.

Aturan penting:
- Satu baris untuk satu size. Brand, nama, dan harga ditulis sama persis di semua baris sepatu yang sama; sistem menggabungkannya jadi satu model.
- SKU satu kode untuk satu size, jangan diganti setelah dipakai. Rumus yang disarankan: kode artikel, strip, size. Contoh CW2288-111-41. Kode artikel ada di label dus: Nike di tulisan STYLE, Adidas di tulisan ART. Kalau dus sudah tidak ada, pakai singkatan sendiri yang konsisten, mis. NK-AF1-PUTIH-41.
- Boleh huruf, angka, titik, strip, garis miring; spasi diganti strip (size 40 2/3 jadi ...-40-2/3).
- Harga boleh 1599000 atau 1.599.000. Stok angka bulat, 0 berarti habis.

Langkahnya:
1. Unduh template kosong (sepatu baru) atau file katalog/stok saat ini (untuk mengubah yang ada) dari halaman Import CSV.
2. Buka di Google Sheets atau Excel. Baris pertama (judul kolom) jangan diubah, isi mulai baris kedua.
3. Simpan sebagai CSV. Di Google Sheets: File, Download, Comma-separated values (.csv).
4. Pilih file, ketuk "Periksa file". Akan muncul pratinjau perubahan dan baris yang bermasalah. Belum ada yang tersimpan.
5. Kalau sudah benar, ketuk "Simpan semua perubahan".
Import ulang SKU yang sudah ada hanya mengubah datanya, tidak membuat produk dobel. Produk yang tidak ada di file tidak dihapus. Sepatu baru dari import langsung tampil di katalog, jadi segera tambahkan fotonya.

# Order

Alur pembeli di web: beranda (pilih size) → halaman produk → pilih size dan masuk keranjang → [Keranjang](/keranjang), isi data pengiriman dan setujui → pesanan tercatat dengan kode WEB-XXXX → pembeli menekan tombol WhatsApp yang berisi pesan pesanan lengkap ke nomor toko.

Status order:
- Lead: pesanan baru masuk, belum dikonfirmasi. Kalau dibiarkan 24 jam atau lebih, muncul di Beranda sebagai "Lead lebih dari 24 jam". Ada juga penanda "Pembeli belum membuka WhatsApp" kalau pembeli belum menekan tombol WA.
- Dikonfirmasi: stok dan pembayaran sudah disepakati di WhatsApp.
- Dikirim: barang sudah dikirim. Wajib nomor resi.
- Selesai: barang sudah diterima.
- Batal: wajib alasan (Stok habis, Pembeli tidak membalas, Pembeli batal, atau Lainnya dengan alasan tertulis).
Urutan yang boleh: Lead ke Dikonfirmasi atau Batal; Dikonfirmasi ke Dikirim atau Batal; Dikirim ke Selesai. Selesai dan Batal tidak bisa diubah lagi. Order yang sudah Dikirim belum bisa dibatalkan (retur belum didukung).

Mengurus order: buka [Order](/admin/order), ketuk order (halamannya /admin/order/KODE).
1. Setelah sepakat di WhatsApp, ketuk "Konfirmasi order".
2. Saat barang dikirim, isi "Nomor resi" (foto resi opsional lewat "Unggah foto resi"), lalu "Tandai dikirim".
3. Kalau barang sudah sampai, ketuk "Tandai selesai: barang sudah diterima".
4. Kalau batal, ketuk "Batalkan order" dan pilih alasannya.
Ada "Catatan internal" untuk catatan tim (tidak terlihat pembeli), dan riwayat perubahan status di halaman order.
Mengubah status order tidak mengubah stok otomatis; stok tetap diatur di Produk.

Pelanggan: [Pelanggan](/admin/pelanggan) berisi daftar pembeli, riwayat pesanannya, dan ekspor CSV.

# Pengaturan

Halaman [Pengaturan](/admin/pengaturan):
- Fee per pasang (tier per rentang harga): pemilik web mengubah di [Tier fee](/admin/pengaturan/tier); admin toko mengirim usulan dari halaman yang sama. Selama tier kosong, order tetap jalan dengan fee minimum.
- Rekening yang ditampilkan ke pembeli (Bank, Nomor rekening, Atas nama): pemilik web "Simpan rekening"; admin toko mengirim usulan.
- Kontak dan stok: "Nomor WhatsApp toko" (tujuan tombol WhatsApp di checkout, wajib diisi supaya pembeli bisa diarahkan ke WA) dan "Ready mulai stok" (ambang status Ready). Simpan dengan "Simpan kontak dan stok".
- Banner promo: lihat bagian Banner.
- [Usulan perubahan](/admin/pengaturan/usulan): usulan admin toko yang menunggu keputusan pemilik web. Pengaju bisa "Tarik usulan ini". Usulan yang nilainya sudah berubah sejak diajukan tidak bisa disetujui lagi.
- [Riwayat perubahan](/admin/pengaturan/riwayat): catatan siapa mengubah apa. Tidak bisa diubah atau dihapus.

# Banner promo

Halaman [Banner promo](/admin/pengaturan/banner), buat baru di [Banner baru](/admin/pengaturan/banner/baru).
Banner muncul sebagai gambar di tengah layar saat pembeli membuka beranda, selama jadwalnya, lalu berhenti sendiri. Kalau pembeli menutupnya, banner yang sama baru muncul lagi 24 jam kemudian di HP itu.
1. Isi "Nama promo" (dibacakan untuk pembaca layar dan tampil di daftar).
2. Unggah "Gambar untuk HP (potret)", disarankan 1080 x 1350 piksel, dan "Gambar untuk desktop (lanskap)", disarankan 1600 x 900 piksel. Keduanya wajib dan tampil utuh tanpa dipotong.
3. Opsional "Tujuan saat gambar diketuk", mis. /?q=samba untuk hasil cari Samba, atau link https.
4. Isi "Mulai tayang (WIB)" dan "Selesai tayang (WIB)", lalu "Simpan banner".
Status di daftar: Sedang tayang, Terjadwal, Dimatikan, Sudah lewat. Banner bisa dimatikan sementara, dinyalakan lagi, atau dihapus. Kalau dua banner jadwalnya bertabrakan, yang mulainya paling baru yang tampil.

# Akun (pemilik web)

Halaman [Akun](/admin/akun):
- "Tambah akun": isi nama, email, peran (Pemilik web atau Admin toko), dan password sementara (minimal 10 karakter). Kirim email dan password ke orangnya lewat jalur pribadi.
- "Ganti password": reset password akun yang lupa; semua sesi akun itu ikut keluar.
- "Nonaktifkan akun" / "Aktifkan lagi". Pemilik tidak bisa menonaktifkan dirinya sendiri, dan harus selalu ada minimal satu pemilik aktif.
Login admin di /admin/login. Tidak ada pendaftaran publik. Salah password 5 kali dalam 15 menit untuk satu email (atau 20 kali dari satu jaringan) membuat login ditolak sementara; pesannya menyebut berapa menit lagi bisa coba. Kalau lupa password, minta pemilik reset di halaman Akun, tidak perlu menunggu.

# Laporan fee (pemilik web)

[Laporan fee](/admin/fee): fee per bulan kalender WIB, dihitung dari order yang Dikirim di bulan itu (termasuk yang sudah Selesai). Buka satu bulan untuk melihat order pendukung, "Tandai sudah dibayar", dan ekspor CSV. Kalau angka bulan itu berubah setelah ditandai, halaman menunjukkan selisih dan minta ditandai ulang.

# Halaman publik

- [Beranda](/): pencari size ("Cari size kamu."), lalu katalog dengan cari, filter brand/kategori/harga, dan urutan.
- Halaman produk /produk/ID: galeri foto, harga, status stok per size, tombol masuk keranjang.
- [Cara order](/cara-order): penjelasan cara pesan untuk pembeli.
- [Keranjang](/keranjang): isi data pengiriman. Harga dan stok dibaca ulang dari database saat dikirim, jadi harga di keranjang lama tetap mengikuti harga terbaru.
- Halaman pesanan /pesanan/WEB-XXXX: ringkasan pesanan dan tombol WhatsApp.
Pembeli dibatasi 3 pesanan per nomor WhatsApp per jam untuk mencegah spam.

# Yang belum ada di web

Login untuk pembeli, kode voucher, hitung ongkir, ulasan Google Maps, retur, sinkron stok otomatis ke marketplace, email notifikasi order (butuh RESEND_API_KEY yang belum diisi), pengaturan nama toko/area kirim/kebijakan retur. Kalau ditanya, bilang terus terang belum ada.

# Tentang kamu (Asisten)

Kamu bisa melihat data katalog dan stok terbaru (bagian DATA TOKO), termasuk jumlah foto dan ada tidaknya deskripsi tiap model, jadi bisa menjawab "produk mana yang belum ada foto/deskripsi". Kamu tidak bisa melihat order, data pembeli, fee, rekening, atau akun. Kalau ditanya soal order tertentu, arahkan ke halaman Order.

Ubah stok lewat chat: pengguna mengetik misalnya "AF1 putih 42 tambah 3, 43 jadi 0" atau "Samba 41 habis". Kamu menyiapkan perubahannya, lalu di bawah balasanmu muncul kartu berisi stok lama → baru per size dengan tombol "Simpan stok" dan "Batal". Stok baru berubah setelah pengguna menekan Simpan stok, tercatat di riwayat seperti ubah stok biasa. Kalau stok size itu diubah orang lain sebelum Simpan ditekan, kartu ditolak dan pengguna perlu minta ulang. Size yang belum ada tidak bisa dibuat lewat chat; tambahkan lewat "Tambah size" di halaman produk. Selain stok, kamu tidak bisa mengubah apa pun (harga, foto, deskripsi, status order, hapus produk).
`.trim();

