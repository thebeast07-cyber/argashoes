# Asisten AI untuk stok dan produk

Status: draf, menunggu masukan pemilik. Belum dibangun.

## Masalah

Data produk masih di kepala pemilik, dan pemilik sibuk. Form admin dan import CSV sudah ada, tapi keduanya menuntut data yang rapi: SKU per size, satu baris per size, harga diketik berulang. Stok juga berubah tiap hari karena dipakai bareng marketplace.

Asisten ini menerima bahasa sehari-hari dan foto, lalu mengubahnya jadi draf yang dicek pemilik sebelum disimpan.

## Siapa yang memakai

- **MVP**: pemilik dan admin toko, di panel admin (HP).
- **Fase 2**: pembeli, di katalog publik, hanya untuk mencari produk dan cek size (lihat bagian terakhir).

## Fungsi MVP

| # | Fungsi | Contoh masukan | Hasil |
|---|---|---|---|
| 1 | Tanya stok | "af1 putih sisa berapa?" | AF1 '07 White: 40 (3), 41 (5), 42 habis. Total 8 pasang. |
| 1b | Tanya per size | "size 42 apa aja yang ready?" | Daftar model aktif yang size 42-nya ada stok. |
| 1c | Yang mau habis | "apa yang mau habis?" | Size dengan status Sisa sedikit atau Habis, dikelompokkan per model. |
| 2 | Update stok | "af1 putih 41 laku 1", "samba hitam 42 tambah 2", "af1 putih 40 habis" | Pratinjau: AF1 '07 White size 41: 5 → 4. Pemilik ketuk Simpan. |
| 3 | Tambah dari foto label dus | Foto label | Draf: brand, nama model, kode artikel, size. Pemilik isi harga dan stok. |
| 4 | Tambah dari ketikan | "samba og hitam 1,8jt coret 2,2jt, 41 ada 2, 42 ada 1" | Draf model baru dengan dua size. |

Ketikan bisa juga dari fitur suara di keyboard HP. Asisten tidak perlu fitur suara sendiri.

## Aturan yang tidak boleh dilanggar

1. **AI hanya membaca maksud, angka selalu dari database.** Gemini mengubah kalimat jadi data terstruktur (produk yang dimaksud, size, aksi, jumlah). Pencocokan ke produk, stok sekarang, dan jawaban "sisa berapa" dihitung server dari database dan disusun dengan template, bukan dikarang AI.
2. **Tidak ada yang tersimpan tanpa pratinjau.** Semua perubahan berupa draf. Pemilik atau admin yang mengetuk Simpan.
3. **Ragu berarti bertanya.** Kalau "af1 putih" cocok ke lebih dari satu model, asisten menampilkan pilihan, bukan menebak. Angka dari foto yang kurang jelas ditandai untuk dicek.
4. **Izin sama dengan form biasa.** Admin toko tidak bisa mengubah fee lewat asisten. Simpan memakai fungsi mutasi yang sudah ada (`src/lib/produk/mutasi.ts`), jadi validasi dan anti-dobel tetap berlaku.
5. **Tercatat.** Setiap perubahan dari asisten masuk `audit_log` dengan keterangan "via asisten".
6. **Tetap jalan tanpa AI.** Kalau Gemini gagal atau kuota habis, muncul pesan jelas. Form, tombol Tandai habis, dan import CSV tetap bisa dipakai.
7. **Hal yang tidak diberikan ke asisten**: mengubah status order, menandai fee dibayar, mengubah fee atau tier, menghapus produk.

## Kode artikel dan SKU

- **Kode artikel** = kode dari pabrik yang tercetak di label dus, mis. `CW2288-111` (Nike) atau `B75806` (Adidas). Satu kode untuk satu model dan warna. Disimpan di model, opsional.
- **SKU** tetap satu per size. Kalau model punya kode artikel, SKU dibuat otomatis `<kode artikel>-<size>`, mis. `CW2288-111-41`. Kalau tidak ada, dibuat dari brand dan nama, mis. `NIKE-AIR-FORCE-1-WHITE-41`.
- SKU yang sudah ada tidak diubah.
- Butuh migrasi baru: kolom `kode_artikel` (unik kalau diisi) di tabel `products`.

## Data yang dikirim ke Gemini

- **Dikirim**: kalimat perintah, foto label, dan daftar nama model + brand + kode artikel supaya AI bisa memahami singkatan.
- **Tidak pernah dikirim**: data pembeli (nama, alamat, WA, email), order, fee, rekening, akun admin.

Free tier Gemini boleh memakai data yang dikirim untuk melatih model Google. Data sepatu dan stok tidak sensitif. Itu sebabnya data pembeli dikecualikan.

## Batas pemakaian

- Kuota free tier dibatasi Google dan bisa berubah. Asisten membatasi jumlah permintaan per akun per menit supaya kuota tidak habis karena salah tekan.
- Foto dikecilkan dulu di browser (pola yang sama dengan upload foto produk) sebelum dikirim.

## Urutan bangun

1. Tanya stok (hanya baca, paling aman, langsung berguna).
2. Update stok.
3. Tambah dari ketikan, ditambah kolom kode artikel.
4. Tambah dari foto label dus.

Tiap langkah diuji di Preview sebelum lanjut.

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

- [ ] "Laku 1" dari asisten hanya mengurangi stok, tidak membuat order. Benar begitu? (Penjualan marketplace dan offline tidak dicatat sebagai order web.)
- [ ] Admin toko boleh menambah model baru lewat asisten, atau hanya update stok?
- [ ] Model baru dari asisten langsung aktif, atau nonaktif dulu sampai fotonya diupload? Usulan: nonaktif dulu.
