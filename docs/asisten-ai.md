# Asisten AI untuk stok dan produk

Status: draf, belum dibangun. Keputusan pemilik: MVP hanya tanya jawab stok (baca saja). Tambah dan ubah produk tetap lewat form dan import CSV, karena AI tidak bisa dijamin tidak salah baca.

## Masalah

Data produk masih di kepala pemilik, dan pemilik sibuk. Form admin dan import CSV sudah ada, tapi keduanya menuntut data yang rapi: SKU per size, satu baris per size, harga diketik berulang. Stok juga berubah tiap hari karena dipakai bareng marketplace.

Asisten ini menjawab pertanyaan stok dalam bahasa sehari-hari. Ia hanya membaca, tidak mengubah data.

## Siapa yang memakai

- **MVP**: pemilik dan admin toko, di panel admin (HP).
- **Fase 2**: pembeli, di katalog publik, hanya untuk mencari produk dan cek size (lihat bagian terakhir).

## Fungsi MVP

| # | Fungsi | Contoh masukan | Hasil |
|---|---|---|---|
| 1 | Sisa stok satu model | "af1 putih sisa berapa?" | Air Force 1 '07 White (CW2288-111): 40 (3), 41 (5), 42 habis. Total 8 pasang. |
| 2 | Cari per size | "size 42 apa aja yang ready?" | Daftar model aktif yang size 42-nya ada stok. |
| 3 | Yang mau habis | "apa yang mau habis?" | Size dengan status Sisa sedikit atau Habis, dikelompokkan per model. |

Tiap jawaban menyebut nama model yang dicocokkan dan memberi tautan ke halaman produknya di admin, supaya salah tangkap langsung kelihatan dan bisa diperbaiki lewat form biasa.

Pertanyaan bisa juga diketik lewat fitur suara di keyboard HP. Asisten tidak perlu fitur suara sendiri.

## Aturan yang tidak boleh dilanggar

1. **AI hanya membaca maksud, angka selalu dari database.** Gemini mengubah pertanyaan jadi data terstruktur (model yang dimaksud, size, jenis pertanyaan). Pencocokan ke produk dan angka stok dihitung server dari database dan disusun dengan template, bukan dikarang AI.
2. **Hanya membaca.** Asisten tidak punya akses ke fungsi mutasi apa pun.
3. **Ragu berarti bertanya.** Kalau "af1 putih" cocok ke lebih dari satu model, asisten menampilkan pilihan, bukan menebak. Kalau tidak ada yang cocok, asisten bilang tidak ketemu.
4. **Tetap jalan tanpa AI.** Kalau Gemini gagal atau kuota habis, muncul pesan jelas. Daftar produk, filter, dan pencarian admin tetap bisa dipakai.

## Kode artikel dan SKU

Tidak termasuk MVP ini. Dicatat supaya tidak hilang:

- **Kode artikel** = kode dari pabrik yang tercetak di label dus, mis. `CW2288-111` (Nike). Satu kode untuk satu model dan warna. Kalau nanti disimpan di model (kolom opsional `kode_artikel`), asisten bisa menjawab pertanyaan pakai kode itu juga.
- SKU per size bisa dibuat dari kode artikel, mis. `CW2288-111-41`. Ini dibahas terpisah bersama penyederhanaan import CSV.

## Data yang dikirim ke Gemini

- **Dikirim**: kalimat pertanyaan dan daftar nama model + brand supaya AI bisa memahami singkatan. Angka stok tidak perlu dikirim.
- **Tidak pernah dikirim**: data pembeli (nama, alamat, WA, email), order, fee, harga, rekening, akun admin.

Free tier Gemini boleh memakai data yang dikirim untuk melatih model Google. Data sepatu dan stok tidak sensitif. Itu sebabnya data pembeli dikecualikan.

## Batas pemakaian

- Kuota free tier dibatasi Google dan bisa berubah. Asisten membatasi jumlah permintaan per akun per menit supaya kuota tidak habis karena salah tekan.

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

- `GEMINI_API_KEY` di env Vercel (Production dan Preview). Kosong berarti asisten tidak tampil dan sisa admin tetap jalan.
- `/api/sehat` menampilkan apakah key terisi (ya/tidak, tanpa nilainya).

## Pertanyaan terbuka

- [ ] Admin toko juga boleh memakai asisten, atau pemilik saja? Usulan: keduanya, karena hanya membaca.
- [ ] Model nonaktif ikut dijawab di admin? Usulan: ikut, dengan tanda "nonaktif".
