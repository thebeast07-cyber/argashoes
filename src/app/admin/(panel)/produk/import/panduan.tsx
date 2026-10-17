import type { JenisImport } from "../actions";
import { CONTOH_KATALOG, CONTOH_STOK } from "./contoh";

// Panduan untuk staf yang belum pernah memakai CSV. Isinya harus sesuai aturan di src/lib/domain/import.ts.

function Label({ judul, isi }: { judul: string; isi: string }) {
  return (
    <span className="inline-flex flex-col rounded-label border-[1.5px] border-tinta bg-white px-2 py-1">
      <span className="text-xs text-redup">{judul}</span>
      <span className="sempit angka text-base font-bold">{isi}</span>
    </span>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-tinta/20 pt-3 first:border-t-0 first:pt-0">
      <h2 className="text-base font-bold">{judul}</h2>
      {children}
    </section>
  );
}

function TabelContoh({ baris }: { baris: string[][] }) {
  const [kepala, ...isi] = baris;
  return (
    // Tabel boleh digeser di dalam kotaknya sendiri, halaman tidak ikut melebar di layar 360px.
    <div className="overflow-x-auto rounded-label border border-tinta/55 bg-white">
      <table className="sempit angka w-full text-left text-sm">
        <thead>
          <tr className="border-b border-tinta/55">
            {kepala.map((k) => (
              <th key={k} scope="col" className="whitespace-nowrap px-2 py-1 font-bold">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isi.map((b) => (
            <tr key={b[0]} className="border-b border-tinta/20 last:border-b-0">
              {b.map((sel, i) => (
                <td key={i} className="whitespace-nowrap px-2 py-1">
                  {sel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanduanImport({ jenis }: { jenis: JenisImport }) {
  return (
    <details open className="group rounded-label border border-tinta/55 bg-kertas">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex-1 font-semibold">Cara mengisi file</span>
        <span aria-hidden="true" className="w-3 text-center text-lg font-semibold leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>

      <div className="space-y-4 px-3 pb-4 text-sm">
        <Bagian judul="SKU: satu kode untuk satu size">
          <p>
            Tiap size punya SKU sendiri. Size 40 dan 41 dari sepatu yang sama berarti dua SKU. Sekali dipakai, SKU jangan diganti, karena sistem
            akan menganggapnya barang baru.
          </p>
          <p className="font-semibold">Rumusnya: kode artikel, strip, size.</p>
          <div className="flex flex-wrap items-center gap-2" aria-label="Contoh: kode artikel CW2288-111 ditambah size 41 menjadi SKU CW2288-111-41">
            <Label judul="Kode artikel" isi="CW2288-111" />
            <span aria-hidden="true" className="text-lg font-bold">
              -
            </span>
            <Label judul="Size" isi="41" />
            <span aria-hidden="true" className="text-lg font-bold">
              =
            </span>
            <Label judul="SKU" isi="CW2288-111-41" />
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Kode artikel tercetak di label dus. Nike: cari tulisan <span className="font-semibold">STYLE</span>. Adidas: cari tulisan{" "}
              <span className="font-semibold">ART</span>.
            </li>
            <li>Dus sudah tidak ada? Pakai singkatan sendiri, mis. NK-AF1-PUTIH-41. Yang penting konsisten.</li>
            <li>Boleh huruf, angka, titik, strip, dan garis miring. Spasi diganti strip, jadi size 40 2/3 ditulis ...-40-2/3.</li>
          </ul>
        </Bagian>

        {jenis === "katalog" ? (
          <>
            <Bagian judul="Satu baris untuk satu size">
              <p>Contoh satu sepatu dengan tiga size:</p>
              <TabelContoh baris={CONTOH_KATALOG} />
              <p>
                Brand, nama, dan harga ditulis sama persis di semua baris sepatu itu. Sistem menggabungkan baris yang brand dan namanya sama jadi
                satu model.
              </p>
            </Bagian>

            <Bagian judul="Isi tiap kolom">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-semibold">Wajib:</span> sku, brand, nama, harga, size, stok.
                </li>
                <li>Harga dan harga_coret: angka rupiah, mis. 1599000 atau 1.599.000. Tanpa sen.</li>
                <li>Stok: angka bulat. 0 berarti habis.</li>
                <li>Boleh kosong: kategori dan harga_coret. Kalau diisi, harga_coret harus lebih tinggi dari harga.</li>
                <li>Template tidak memuat kolom fee. Fee khusus per sepatu diatur di halaman produk.</li>
              </ul>
            </Bagian>
          </>
        ) : (
          <Bagian judul="Hanya untuk SKU yang sudah ada">
            <TabelContoh baris={CONTOH_STOK} />
            <p>
              SKU dan size harus sama dengan yang tercatat. Cara paling aman: unduh file stok saat ini, ubah kolom stok saja. Sepatu atau size baru
              ditambahkan lewat Katalog lengkap.
            </p>
          </Bagian>
        )}

        <Bagian judul="Langkahnya">
          <ol className="list-decimal space-y-1 pl-5">
            {jenis === "katalog" ? (
              <li>
                Unduh{" "}
                <a href="/admin/produk/ekspor?format=template" className="font-semibold underline underline-offset-2">
                  template kosong
                </a>{" "}
                untuk sepatu baru, atau{" "}
                <a href="/admin/produk/ekspor?format=katalog" className="font-semibold underline underline-offset-2">
                  file katalog saat ini
                </a>{" "}
                untuk mengubah yang sudah ada.
              </li>
            ) : (
              <li>
                Unduh{" "}
                <a href="/admin/produk/ekspor?format=stok" className="font-semibold underline underline-offset-2">
                  file stok saat ini
                </a>
                .
              </li>
            )}
            <li>Buka di Google Sheets atau Excel. Baris pertama (judul kolom) jangan diubah, isi mulai baris kedua.</li>
            <li>Simpan sebagai CSV. Di Google Sheets: File, Download, Comma-separated values (.csv).</li>
            <li>Pilih file di bawah, lalu ketuk Periksa file. Belum ada yang tersimpan sampai kamu mengetuk Simpan semua perubahan.</li>
          </ol>
          <p className="text-redup">
            Import ulang SKU yang sudah ada hanya mengubah datanya, tidak membuat produk dobel. Produk yang tidak ada di file tidak dihapus.
            {jenis === "katalog" && " Sepatu baru langsung tampil di katalog, jadi segera tambahkan fotonya dari halaman produk."}
          </p>
        </Bagian>
      </div>
    </details>
  );
}
