# Asisten AI untuk stok dan produk

Status: dibangun. Tombol Asisten melayang di admin, ngobrol bebas dengan data katalog dan stok terbaru, hanya membaca.

## Masalah

Data produk masih di kepala pemilik, dan pemilik sibuk. Stok berubah tiap hari karena dipakai bareng marketplace. Pemilik dan admin perlu cara cepat bertanya soal stok tanpa membuka daftar produk satu per satu.

## Bentuk

Tombol **Asisten** melayang di semua halaman admin, membuka panel obrolan tanpa pindah halaman. Pemilik dan admin toko sama-sama bisa memakai.

## Keputusan pemilik (18 Okt 2026)

Versi pertama memakai template (Gemini hanya memilah pertanyaan, jawaban disusun sistem). Hasilnya kaku. Pemilik memutuskan asisten harus terasa seperti chat LLM biasa:

- Gemini menerima ringkasan katalog dan stok terbaru di tiap pertanyaan, lalu menjawab bebas. Totalnya dihitung server supaya AI tinggal membaca.
- Instruksi ke Gemini dibuat seminimal mungkin: identitas, gaya santai sopan, dan hanya bisa membaca.
- Tidak ada batas per menit untuk pemilik dan admin. Yang membatasi hanya kuota harian Gemini. Batas per pengunjung baru dibuat untuk asisten pembeli (fase 2).
- Konsekuensi yang diterima: angka di kalimat jawaban ditulis AI dari data asli dan tidak dijamin 100%. Model yang dibahas AI ditampilkan lagi dari database di bawah jawaban ("Cek data stok dari database") sebagai pembanding.

## Yang tetap dijaga

1. **Hanya membaca.** Gemini tidak punya jalan untuk menulis apa pun. Perubahan stok dan produk tetap lewat form dan import CSV.
2. **Data yang dikirim ke Gemini**: obrolan (12 giliran terakhir) dan katalog: brand, nama, kategori, harga, harga coret, status tampil, stok per size, total. **Tidak dikirim**: order, data pembeli, fee, rekening, akun. Free tier Gemini boleh memakai data yang dikirim untuk melatih model, jadi data pembeli tidak boleh ikut.
3. **Tetap jalan tanpa AI.** Kalau Gemini gagal atau kuota habis, muncul pesan jelas. Sisa admin tetap bisa dipakai.

## Kuota

Satu pesan = satu permintaan. Per 18 Okt 2026 AI Studio akun toko menampilkan 3.5 Flash-Lite dengan 500 permintaan per hari, dibagi semua akun admin, reset tengah malam waktu Pasifik (sekitar jam 14.00 atau 15.00 WIB). Data katalog ikut terkirim di tiap pesan; untuk ratusan model ini masih jauh di bawah batas token per menit, tapi perlu dinilai ulang kalau katalog jadi ribuan model.

## Nanti

- Update stok lewat kalimat dan tambah produk dari foto label dus: hanya kalau pemilik memutuskan, selalu lewat pratinjau, tercatat di `audit_log`.
- Ringkasan order (jumlah per status, order hari ini) tanpa data pribadi pembeli, kalau dibutuhkan.

## Fase 2: asisten untuk pembeli

Memakai data katalog yang sama, dengan batas:

- Hanya membaca, hanya produk aktif.
- Stok ditampilkan sebagai Ready / Sisa sedikit / Habis, bukan angka (sama dengan katalog).
- Kalau tidak ketemu: "Belum ada, tanya admin di WhatsApp."
- Mengarahkan ke halaman produk, keranjang, atau WhatsApp. Tidak membahas nego atau janji pengiriman.
- Batas permintaan per pengunjung.

## Konfigurasi

- `GEMINI_API_KEY` di env Vercel (Production dan Preview). Kosong berarti tombol Asisten tidak tampil.
- `GEMINI_MODEL` (opsional): nama model Gemini. Kalau kosong atau modelnya tidak ada, dicoba berurutan `gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-2.5-flash-lite`, `gemini-3.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash`.
- `/api/sehat` menampilkan apakah key terisi (ya/tidak, tanpa nilainya).
