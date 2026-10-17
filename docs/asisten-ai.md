# Asisten AI untuk stok dan produk

Status: dibangun sebagai tombol Asisten melayang di semua halaman admin, membuka panel obrolan tanpa pindah halaman. Keputusan pemilik: asisten hanya membaca stok, tapi boleh diajak ngobrol di luar soal stok. Tambah dan ubah produk tetap lewat form dan import CSV, karena AI tidak bisa dijamin tidak salah baca.

## Masalah

Data produk masih di kepala pemilik, dan pemilik sibuk. Form admin dan import CSV sudah ada, tapi keduanya menuntut data yang rapi: SKU per size, satu baris per size, harga diketik berulang. Stok juga berubah tiap hari karena dipakai bareng marketplace.

Asisten ini menjawab pertanyaan stok dalam bahasa sehari-hari, dan bisa diajak ngobrol hal umum (ide caption, perawatan sepatu, dan sebagainya). Ia hanya membaca, tidak mengubah data.

## Siapa yang memakai

- **MVP**: pemilik dan admin toko, di panel admin (HP).
- **Fase 2**: pembeli, di katalog publik, hanya untuk mencari produk dan cek size (lihat bagian terakhir).

## Fungsi MVP

| # | Fungsi | Contoh masukan | Hasil |
|---|---|---|---|
| 1 | Sisa stok satu model | "af1 putih sisa berapa?" | Air Force 1 '07 White (CW2288-111): 40 (3), 41 (5), 42 habis. Total 8 pasang. |
| 2 | Cari per size | "size 42 apa aja yang ready?" | Daftar model aktif yang size 42-nya ada stok. |
| 3 | Yang mau habis | "apa yang mau habis?" | Size dengan status Sisa sedikit atau Habis, dikelompokkan per model. |

| 4 | Obrolan umum | "ide caption IG buat sepatu baru" | Teks dari AI, diberi tanda "Jawaban umum dari AI, bisa keliru." |
| 5 | Pertanyaan lanjutan | "kalau size 41?" setelah tanya satu model | Konteks diambil dari 6 giliran terakhir. |

Tiap jawaban stok menyebut nama model yang dicocokkan dan memberi tautan ke halaman produknya di admin, supaya salah tangkap langsung kelihatan dan bisa diperbaiki lewat form biasa.

Pertanyaan bisa juga diketik lewat fitur suara di keyboard HP. Asisten tidak perlu fitur suara sendiri.

## Aturan yang tidak boleh dilanggar

1. **AI hanya membaca maksud, angka selalu dari database.** Gemini mengubah pertanyaan jadi data terstruktur (model yang dimaksud, size, jenis pertanyaan). Pencocokan ke produk dan angka stok dihitung server dari database dan disusun dengan template, bukan dikarang AI.
2. **Hanya membaca.** Asisten tidak punya akses ke fungsi mutasi apa pun. Permintaan mengubah data dijawab dengan arahan ke halaman Produk.
3. **Ragu berarti bertanya.** Kalau "af1 putih" cocok ke lebih dari satu model, asisten menampilkan semuanya (maksimal 5) dengan nama lengkap, bukan memilih salah satu. Kalau tidak ada yang cocok, asisten bilang tidak ketemu.
4. **Tetap jalan tanpa AI.** Kalau Gemini gagal atau kuota habis, muncul pesan jelas. Daftar produk, filter, dan pencarian admin tetap bisa dipakai.
5. **Obrolan umum boleh, tapi tanpa data toko.** Teks obrolan datang dari AI dan bisa keliru, jadi diberi tanda. AI diminta tidak menyebut angka stok, harga, atau status order di obrolan, karena ia tidak punya datanya.

## Kode artikel dan SKU

Tidak termasuk MVP ini. Dicatat supaya tidak hilang:

- **Kode artikel** = kode dari pabrik yang tercetak di label dus, mis. `CW2288-111` (Nike). Satu kode untuk satu model dan warna. Kalau nanti disimpan di model (kolom opsional `kode_artikel`), asisten bisa menjawab pertanyaan pakai kode itu juga.
- SKU per size bisa dibuat dari kode artikel, mis. `CW2288-111-41`. Ini dibahas terpisah bersama penyederhanaan import CSV.

## Data yang dikirim ke Gemini

- **Dikirim**: pesan pengguna, 6 giliran obrolan terakhir (untuk jawaban stok, yang dikirim ringkasannya), dan daftar nama model + brand supaya AI bisa memahami singkatan.
- **Tidak pernah dikirim**: data pembeli (nama, alamat, WA, email), order, fee, harga, rekening, akun admin.

Free tier Gemini boleh memakai data yang dikirim untuk melatih model Google. Data sepatu dan stok tidak sensitif. Itu sebabnya data pembeli dikecualikan.

## Batas pemakaian

- Kuota free tier dibatasi Google dan bisa berubah. Satu pertanyaan = satu permintaan; 500 per hari dibagi semua akun admin, reset tengah malam waktu Pasifik (sekitar jam 14.00 atau 15.00 WIB). Asisten membatasi jumlah permintaan per akun per menit supaya kuota tidak habis karena salah tekan.

## Nanti, setelah tanya stok dipakai beberapa minggu

Dinilai ulang dari seberapa sering asisten salah tangkap:

- Update stok lewat kalimat ("af1 putih 41 laku 1"), selalu lewat pratinjau.
- Tambah produk dari ketikan atau foto label dus.

Kalau dibangun, keduanya wajib: pratinjau sebelum simpan, izin sama dengan form biasa, tercatat di `audit_log` dengan keterangan "via asisten", dan tidak boleh mengubah order, fee, atau menghapus produk.

## Fase 2: asisten untuk pembeli

Memakai fungsi pencarian yang sama dengan nomor 1, dengan batas:

- Hanya membaca, hanya produk aktif.
- Stok ditampilkan sebagai Ready / Sisa sedikit / Habis, bukan angka (sama dengan katalog).
- Kalau tidak ketemu: "Belum ada, tanya admin di WhatsApp."
- Mengarahkan ke halaman produk, keranjang, atau WhatsApp. Tidak membahas nego atau janji pengiriman.
- Batas permintaan per pengunjung.

## Konfigurasi

- `GEMINI_API_KEY` di env Vercel (Production dan Preview). Kosong berarti tombol Asisten tidak tampil, sisa admin tetap jalan.
- `GEMINI_MODEL` (opsional): nama model Gemini. Kalau kosong atau modelnya tidak ada, dicoba berurutan `gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-2.5-flash-lite`, `gemini-3.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash`. Flash-Lite didahulukan karena kuota gratisnya paling longgar (AI Studio akun toko, 18 Okt 2026: 3.5 Flash-Lite 500 permintaan per hari) dan tugas memilah pertanyaan cukup ringan.
- `/api/sehat` menampilkan apakah key terisi (ya/tidak, tanpa nilainya).

## Keputusan

- [x] Pemilik dan admin toko sama-sama boleh memakai asisten, karena hanya membaca.
- [x] Model nonaktif ikut dijawab di admin, dengan tanda "nonaktif".
