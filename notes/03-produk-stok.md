# 03 · Produk & stok (dashboard admin)

Status: selesai di branch `claude/nifty-sagan-tg0p5g`. Tes: 74 unit + DB lulus, typecheck/lint/build bersih, klik-tes Playwright di layar 360px lulus.

Dikerjakan dengan antislop mode **during**. Arah tampilan sementara ada di `DESIGN.md` (ditulis agent, nanti diganti warna identitas toko).

## Yang dibangun (sesuai baris "Produk" di PRD)

| Kebutuhan PRD | Di mana |
|---|---|
| Daftar dengan pencarian (nama, brand, SKU) dan filter brand, size | `/admin/produk` |
| Edit produk, termasuk fee per pasang | `/admin/produk/[id]`, bagian Data model |
| Varian size beserta stok | `/admin/produk/[id]`, bagian Size dan stok |
| Tombol Tandai habis per size, satu ketuk | Di tiap baris size |
| Import CSV `sku, size, stok` untuk update rutin | `/admin/produk/import`, jenis Update stok |
| Import dan ekspor CSV katalog | `/admin/produk/import` jenis Katalog lengkap, `/admin/produk/ekspor` |
| Status stok Ready / Sisa sedikit / Habis, ambang bisa diubah | `src/lib/domain/stok.ts`, dibaca dari `settings.ambang_stok` (default 3) |
| Semua perubahan stok tercatat di audit log | `src/lib/produk/mutasi.ts` |
| Data stok tidak di-cache | Halaman produk `force-dynamic`, ekspor `no-store` |

## Peta file

| File | Isi |
|---|---|
| `src/lib/domain/stok.ts` | Status stok, label, normalisasi dan urutan size (termasuk "41 1/3") |
| `src/lib/domain/produk.ts` | Parse rupiah, validasi produk dan varian, aturan SKU |
| `src/lib/domain/import.ts` | Rencana import stok dan katalog (murni, belum menyentuh DB) |
| `src/lib/csv.ts` | Parse/tulis CSV, deteksi pemisah `,` atau `;`, anti formula injection |
| `src/lib/produk/data.ts` | Query: daftar, filter, detail, data import, baris ekspor, ambang stok |
| `src/lib/produk/mutasi.ts` | Tulis ke DB + audit log dalam satu transaksi |
| `src/db/errors.ts` | Deteksi pelanggaran unique (SKU dobel, size dobel) |
| `src/app/admin/(panel)/produk/` | Halaman daftar, baru, detail, import, dan server action-nya |
| `src/app/admin/produk/ekspor/route.ts` | Unduh CSV |
| `src/components/ikon.tsx` | Ikon buatan sendiri (bukan Lucide) |
| `src/components/label-size.tsx` | Label size ala kardus sepatu |

## Alur import

1. Pilih jenis (Update stok / Katalog lengkap) dan file. Isi file dibaca di browser.
2. **Periksa file**: server menghitung rencana dan menampilkan ringkasan atau daftar baris error. Belum ada yang disimpan.
3. Kalau tidak ada error dan ada perubahan, muncul **Simpan semua perubahan**.
4. Saat disimpan, server menghitung ulang rencana dari data terbaru. Kalau sekarang ada error (misalnya SKU dihapus orang lain sejak pratinjau), batal dan tidak ada yang tersimpan.
5. Semua perubahan masuk satu transaksi. Audit log mencatat ringkasan import dan perubahan tiap size (dari → ke).

Format katalog (satu baris per size), sama persis dengan hasil ekspor:

```
sku,brand,nama,kategori,harga,harga_coret,fee_per_pasang,size,stok
NK-AM90-42,Nike,Air Max 90,Lifestyle,1899000,,,42,3
```

Aturan import katalog:
- SKU lama: stok diperbarui, data modelnya ikut diperbarui. Size SKU lama tidak bisa diubah lewat import.
- SKU baru: masuk ke model dengan brand + nama yang sama (huruf besar/kecil diabaikan), atau jadi model baru.
- Baris untuk model yang sama harus punya data model yang sama persis, termasuk huruf besar/kecil nama. Kalau beda, ditolak dengan nomor barisnya, bukan dipilih diam-diam.
- `fee_per_pasang` kosong = ikut tier harga. Tanpa kolom fee = fee tidak diubah.
- Harga boleh `1899000`, `1.899.000`, atau `Rp 1.899.000`. Desimal ditolak.
- Pemisah koma (Google Sheets) dan titik koma (Excel Indonesia) dua-duanya terbaca.

## Hak akses

- Admin toko dan pemilik: kelola produk, size, stok, import, ekspor.
- **Fee per pasang hanya bisa diubah pemilik.** PRD menyebut admin toko "tidak bisa mengubah aturan fee", dan Pengaturan memasukkan "pengecualian per produk" ke aturan fee. Admin toko melihat fee sebagai teks. Kolom fee di import admin toko diabaikan dengan peringatan.

## Keputusan yang gua ambil (bisa diubah)

| Keputusan | Alasan |
|---|---|
| Produk tidak bisa dihapus, hanya dinonaktifkan | Riwayat order dan audit tetap utuh |
| Size boleh dihapus (dengan konfirmasi) | Untuk membetulkan salah input. `order_items` menyimpan salinan nama dan size, jadi riwayat order aman |
| SKU disimpan huruf besar, tanpa spasi | Mencegah SKU kembar yang beda huruf, dan menyamakan hasil ketik dengan hasil import |
| Harga coret harus lebih tinggi dari harga jual | Itu arti harga coret |
| Format CSV katalog di atas masih **usulan** | PRD: format import menunggu bentuk data retailer |

## Bug yang ketemu saat klik-tes dan sudah dibetulkan

1. Setelah import pertama sukses, pratinjau file berikutnya tidak muncul. Sekarang tiap pilihan file/jenis punya penanda sendiri.
2. Chrome tidak membaca ulang file dengan nama sama yang dipilih lagi setelah dibetulkan. Sekarang kolom file dikosongkan setelah dibaca, nama file ditampilkan terpisah.
3. Import katalog menerima SKU berspasi padahal form menolak. Sekarang aturannya satu (`skuValid`).
4. Ringkasan "N size berubah" tetap tampil walau ada baris error. Sekarang disembunyikan karena tidak ada yang disimpan.

## Belum ada

- Upload foto produk (Vercel Blob, butuh token dari akun Vercel).
- Halaman audit log (datanya sudah tercatat).
- Ubah ambang stok dari halaman Pengaturan (tahap Pengaturan). Sementara pakai default 3.
- Edit SKU atau size yang sudah ada: hapus size lalu tambah ulang.
