# DESIGN.md

> **Status: sementara.** Arah ini ditulis oleh agent atas izin pemilik web (16 Okt 2026), karena warna identitas toko belum ada. Arah buatan agent cenderung jatuh ke selera default AI, jadi anggap ini kerangka kerja, bukan identitas final. Begitu warna dan logo toko masuk, ganti bagian Palet dan Tipografi, lalu sesuaikan token di `tailwind.config.ts`.

## Identitas

Dashboard admin ini alat kerja gudang sepatu yang dipegang satu tangan di HP, sering sambil berdiri di depan rak. Bahasanya diambil dari **label ujung kardus sepatu**: kotak tegas, size dicetak besar, info kecil di bawahnya. Bukan aplikasi SaaS, bukan landing page.

Design Read: dashboard stok mobile untuk retailer sepatu dan pemilik web, gaya label kardus gudang yang tegas dan padat, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

- **ENERGY 1**: tenang. Yang penting cepat dibaca dan cepat diketuk.
- **RHYTHM 2**: daftar konsisten, tapi bagian yang beda tugas (form, daftar size, import) boleh beda komposisi.
- **MOTION 1**: hanya umpan balik hover/tekan dan fokus. Tidak ada animasi masuk.

## Logo

Logo toko (17 Okt 2026): tulisan grafiti "ARGA SHOESS!" pink dengan bingkai pink muda, file `public/logo-argashoes.png` (latar transparan) dan ikon tab `src/app/icon.png`. Dipakai di header publik dan halaman login admin. Palet di bawah belum disesuaikan dengan pink logo.

## Motif identitas

**Label size kardus**: setiap size tampil sebagai kotak bersudut hampir siku, angka size besar, status stok tertulis di bawahnya. Size yang habis dicoret, bukan cuma dipudarkan. Motif ini dipakai di daftar produk, detail produk, dan nanti di halaman publik.

## Palet

| Token | Hex | Peran |
|---|---|---|
| `kertas` | `#F4F1EA` | Latar halaman, warna kardus muda |
| `tinta` | `#1D1B18` | Teks utama, bingkai label |
| `redup` | `#5E5A53` | Teks sekunder (6.08:1 di atas kertas) |
| `bata` | `#B3361C` | Satu aksen: aksi utama dan tanda fokus. Tidak dipakai untuk dekorasi |
| `sedikit-teks` / `sedikit-latar` | `#7A4B00` / `#FBEFD5` | Status Sisa sedikit (6.50:1) |
| `habis` | `#6B6760` | Teks size habis, selalu dengan coretan dan tulisan "Habis" (4.99:1) |
| `kertas-gelap` | `#E9E3D6` | Halaman publik: alas foto yang belum ada, latar footer |
| `redup-gelap` | `#BDB7AB` | Halaman publik: teks sekunder di atas blok tinta (8.61:1) |

Putih (`#FFFFFF`) dipakai untuk permukaan kartu dan input. Status stok tidak pernah hanya warna: selalu ada tulisan Ready / Sisa N / Habis.

## Tipografi

**Archivo** (variabel, punya sumbu lebar). Alasannya: versi sempit (`wdth` 75) bikin SKU dan deret size muat di layar 360px tanpa terpotong, versi normal tetap enak buat teks. Angka pakai `tabular-nums` supaya kolom harga dan stok lurus.

## Bentuk

- Radius: 2px untuk label size dan kartu (kesan kardus), 4px untuk tombol dan input. Tidak ada bentuk pil.
- Bingkai 1.5px warna tinta untuk label size; kartu pakai garis tipis, tanpa bayangan.
- Target sentuh minimal 44px.
- Fokus keyboard: garis 2px warna bata dengan jarak 2px, di semua elemen interaktif.

## Pengecualian: panel Asisten

Atas permintaan pemilik web (18 Okt 2026), panel Asisten di admin memakai kaca buram (putih 85%, blur) dengan sudut 16px seperti panel iPhone, dan latar halaman di belakangnya diburamkan. Hanya panel ini. Tombol pembukanya padat warna tinta (sudut 16px, senada dengan panelnya). Bagian lain tetap mengikuti aturan Bentuk di atas.

## Ikon

Dibuat sendiri, bukan dari library (Lucide dilarang). Grid 24, garis 1.75px, **ujung dan sambungan siku** (`stroke-linecap: square`, `stroke-linejoin: miter`) supaya senada dengan label kardus dan beda dari ikon bulat-bulat bawaan. Semua ikon ada di `src/components/ikon.tsx`.
