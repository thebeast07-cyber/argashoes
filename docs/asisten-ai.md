# Asisten AI untuk stok dan produk

Status: dibangun. Tombol Asisten melayang di admin, ngobrol bebas dengan data katalog dan stok terbaru. Bisa menyiapkan perubahan stok yang baru tersimpan setelah dikonfirmasi pengguna.

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

## Pengetahuan tentang web (18 Okt 2026)

Pemilik ingin asisten bisa menjawab cara pakai fitur seperti chat biasa, lengkap dengan langkah dan tautan. Gemini menerima `src/lib/asisten/pengetahuan.ts`: semua halaman admin dan publik, label tombol persis, alur order dan import, banner, akun, laporan fee, dan daftar fitur yang belum ada. Jawaban cara pakai berupa langkah bernomor dengan tautan `[Nama halaman](/path)`; hanya tautan ke halaman web ini yang dirender jadi tautan. File ini wajib diperbarui setiap ada fitur baru, kalau tidak asisten akan menjelaskan versi lama.

## Ubah stok lewat chat (20 Okt 2026)

Pemilik memilih otomasi "Level 2": AI mengisi, manusia mengonfirmasi.

- Pengguna mengetik, misalnya "AF1 putih 42 tambah 3, 43 jadi 0". Gemini mengisi `ubahStok` (nomor model, size, `tambah`/`kurangi`/`jadi`, jumlah). Kalau modelnya tidak jelas, Gemini diminta bertanya balik.
- Server mencocokkan perintah ke DB (`rencanaStokAsisten` di `src/lib/domain/asisten-aksi.ts`): size dikenali walau ditulis "42,5" atau "EU 42.5", perintah untuk size yang sama dijalankan berurutan, stok minus dan size yang belum ada jadi pesan masalah.
- Di bawah balasan muncul kartu "stok lama → baru" dengan tombol **Simpan stok** dan **Batal**. Simpan tidak memanggil Gemini lagi.
- Saat Simpan, server mengunci baris size itu dan mengecek stoknya masih sama dengan "lama" di kartu (`ubahStokLewatAsisten`). Kalau sudah berubah, tidak ada yang disimpan dan pengguna diminta minta ulang. Semua atau tidak sama sekali, tercatat di `audit_log` dengan `sumber: "asisten"`.
- Browser mengirim balik isi kartu, bukan token tanda tangan. Itu cukup karena yang boleh menekan Simpan sudah punya izin `produk.kelola`, yang memang boleh mengubah stok berapa pun lewat form.
- Asisten juga menerima jumlah foto dan ada tidaknya deskripsi per model, jadi bisa menjawab "produk mana yang belum ada foto".

## Pesan antar akun (21 Okt 2026)

Pemilik web tidak bisa mendikte owner, tapi butuh cara menitip pengingat (mis. "isi nomor WA"). Asisten jadi perantara:

- **Kirim lewat AI**: "bilang ke owner …" → Gemini mengisi `kirimPesan` (nomor dari daftar AKUN LAIN: nama + peran, tanpa email) → kartu "Pesan untuk Nama" dengan tombol **Kirim ke Nama**. Terkirim setelah ditekan.
- **Kirim tanpa AI**: tombol **Kirim pesan** di header panel (pilih penerima, tulis). Tetap jalan saat kuota Gemini habis.
- **Terima**: angka merah di tombol Asisten (dicek saat pindah halaman, saat tab dilihat lagi, dan tiap menit). Saat panel dibuka, pesan baru tampil dengan tombol **Balas** lalu ditandai dibaca.
- Tabel `pesan_admin` (`src/lib/pesan/data.ts`), aturan murni di `src/lib/domain/pesan-admin.ts`. Pesan bukan data bisnis, jadi tidak masuk `audit_log`.
- Pesan masuk ikut riwayat obrolan ke Gemini sebagai giliran pengguna, supaya "balas dia: oke" bisa dipahami. Giliran berurutan dari pihak yang sama digabung (`gabungGiliran`) karena sebagian model menolaknya. Konsekuensinya: isi pesan bisa terkirim ke Gemini, jadi data pembeli tetap tidak boleh ditulis di pesan.
- Tidak ada notifikasi ke HP. Butuh WhatsApp API (berbayar), email Resend (`RESEND_API_KEY` belum diisi), atau web push (iPhone wajib pasang ke layar utama).

## Yang tetap dijaga

1. **Gemini tidak menulis.** Satu-satunya yang bisa ia siapkan adalah perubahan stok, dan itu baru tersimpan setelah pengguna menekan Simpan stok. Harga, foto, deskripsi, order, dan akun tetap lewat form.
2. **Data yang dikirim ke Gemini**: obrolan (12 giliran terakhir), pengetahuan tentang fitur web, dan katalog: brand, nama, kategori, harga, harga coret, status tampil, stok per size, total. **Tidak dikirim**: order, data pembeli, fee, rekening, akun. Free tier Gemini boleh memakai data yang dikirim untuk melatih model, jadi data pembeli tidak boleh ikut.
3. **Tetap jalan tanpa AI.** Kalau Gemini gagal atau kuota habis, muncul pesan jelas. Sisa admin tetap bisa dipakai.

## Kuota

Satu pesan = satu permintaan. Per 18 Okt 2026 AI Studio akun toko menampilkan 3.5 Flash-Lite dengan 500 permintaan per hari, dibagi semua akun admin, reset tengah malam waktu Pasifik (sekitar jam 14.00 atau 15.00 WIB). Data katalog ikut terkirim di tiap pesan; untuk ratusan model ini masih jauh di bawah batas token per menit, tapi perlu dinilai ulang kalau katalog jadi ribuan model.

## Nanti

- Ubah status order lewat chat (PR berikutnya): server mencari order dari kodenya, data pembeli tetap tidak dikirim ke Gemini.
- Tambah produk dari foto label dus: hasilnya mengisi form Tambah produk, bukan langsung menyimpan.
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
- `/api/sehat` menampilkan apakah key terisi (ya/tidak, tanpa nilainya). Buka sambil login admin; tanpa login jawabannya 404.
