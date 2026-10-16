// Rencana import CSV: hitung apa yang akan berubah tanpa menyentuh database.
// Server menghitung ulang rencana saat "Terapkan" supaya tidak memakai pratinjau yang basi.

import { tabelKeObjek } from "../csv";
import { feeDalamRentang } from "./fee";
import { parseBilanganBulat, parseRupiah, skuValid } from "./produk";
import { normalisasiSize, normalisasiSku } from "./stok";

export type ErrorBaris = { baris: number; pesan: string };

export type VarianAda = { id: string; productId: string; sku: string; size: string; stok: number };

function kolomHilang(header: string[], wajib: readonly string[]): string[] {
  return wajib.filter((k) => !header.includes(k));
}

// --- Import stok: kolom sku, size, stok (PRD "Aturan stok") ---------------------

export const KOLOM_STOK = ["sku", "size", "stok"] as const;

export type PerubahanStok = { variantId: string; sku: string; size: string; dari: number; ke: number };

export type RencanaStok = {
  perubahan: PerubahanStok[];
  tidakBerubah: number;
  error: ErrorBaris[];
};

export function rencanakanImportStok(tabel: string[][], varian: readonly VarianAda[]): RencanaStok {
  const { header, data } = tabelKeObjek(tabel);
  const hilang = kolomHilang(header, KOLOM_STOK);
  if (hilang.length > 0) {
    return { perubahan: [], tidakBerubah: 0, error: [{ baris: 1, pesan: `Kolom wajib tidak ada: ${hilang.join(", ")}.` }] };
  }

  const perSku = new Map(varian.map((v) => [normalisasiSku(v.sku), v]));
  const sudah = new Map<string, number>();
  const rencana: RencanaStok = { perubahan: [], tidakBerubah: 0, error: [] };

  for (const { baris, nilai } of data) {
    const sku = normalisasiSku(nilai.sku);
    const size = normalisasiSize(nilai.size);
    const stok = parseBilanganBulat(nilai.stok);
    const v = perSku.get(sku);

    if (!sku) rencana.error.push({ baris, pesan: "SKU kosong." });
    else if (sudah.has(sku)) rencana.error.push({ baris, pesan: `SKU ${sku} sudah muncul di baris ${sudah.get(sku)}.` });
    else if (!v) rencana.error.push({ baris, pesan: `SKU ${sku} belum ada di katalog.` });
    else if (normalisasiSize(v.size) !== size) {
      rencana.error.push({ baris, pesan: `SKU ${sku} tercatat size ${v.size}, di file tertulis ${size || "(kosong)"}.` });
    } else if (stok === null) rencana.error.push({ baris, pesan: `Stok "${nilai.stok}" bukan angka bulat 0 atau lebih.` });
    else if (stok === v.stok) rencana.tidakBerubah++;
    else rencana.perubahan.push({ variantId: v.id, sku: v.sku, size: v.size, dari: v.stok, ke: stok });

    if (sku && !sudah.has(sku)) sudah.set(sku, baris);
  }
  return rencana;
}

// --- Import katalog: satu baris per size ----------------------------------------

export const KOLOM_KATALOG = ["sku", "brand", "nama", "kategori", "harga", "harga_coret", "fee_per_pasang", "size", "stok"] as const;
const KOLOM_KATALOG_WAJIB = ["sku", "brand", "nama", "harga", "size", "stok"] as const;

export type ProdukAda = {
  id: string;
  nama: string;
  brand: string;
  kategori: string | null;
  harga: number;
  hargaCoret: number | null;
  feePerPasang: number | null;
};

type FieldProduk = Omit<ProdukAda, "id">;

export type RencanaKatalog = {
  produkBaru: { kunci: string; data: FieldProduk; varian: { sku: string; size: string; stok: number }[] }[];
  produkDiubah: { productId: string; nama: string; perubahan: Partial<FieldProduk> }[];
  varianBaru: { productId: string; nama: string; sku: string; size: string; stok: number }[];
  stokDiubah: PerubahanStok[];
  error: ErrorBaris[];
  peringatan: string[];
};

/** Produk dikenali dari brand + nama (tanpa beda huruf besar/kecil) kalau SKU-nya baru. */
export function kunciProduk(brand: string, nama: string): string {
  return `${brand.trim().toLowerCase()}|${nama.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

function samaField(a: FieldProduk, b: FieldProduk): (keyof FieldProduk)[] {
  return (Object.keys(a) as (keyof FieldProduk)[]).filter((k) => a[k] !== b[k]);
}

export function rencanakanImportKatalog(
  tabel: string[][],
  produk: readonly ProdukAda[],
  varian: readonly VarianAda[],
  opsi: { bolehUbahFee: boolean },
): RencanaKatalog {
  const rencana: RencanaKatalog = { produkBaru: [], produkDiubah: [], varianBaru: [], stokDiubah: [], error: [], peringatan: [] };
  const { header, data } = tabelKeObjek(tabel);
  const hilang = kolomHilang(header, KOLOM_KATALOG_WAJIB);
  if (hilang.length > 0) {
    rencana.error.push({ baris: 1, pesan: `Kolom wajib tidak ada: ${hilang.join(", ")}.` });
    return rencana;
  }
  const adaKolomFee = header.includes("fee_per_pasang");

  const produkPerId = new Map(produk.map((p) => [p.id, p]));
  const produkPerKunci = new Map(produk.map((p) => [kunciProduk(p.brand, p.nama), p]));
  const varianPerSku = new Map(varian.map((v) => [normalisasiSku(v.sku), v]));
  const sizePerProduk = new Map<string, Map<string, string>>(); // productId -> size -> sku
  for (const v of varian) {
    const m = sizePerProduk.get(v.productId) ?? new Map<string, string>();
    m.set(normalisasiSize(v.size), normalisasiSku(v.sku));
    sizePerProduk.set(v.productId, m);
  }

  // Kelompok baris per produk tujuan: id produk lama, atau "baru:<kunci>".
  type Kelompok = { field: FieldProduk; barisPertama: number };
  const kelompok = new Map<string, Kelompok>();
  const skuDiFile = new Map<string, number>();
  const sizeDiFile = new Map<string, number>(); // tujuan|size -> baris
  let feeDiabaikan = false;

  for (const { baris, nilai } of data) {
    const sku = normalisasiSku(nilai.sku);
    const size = normalisasiSize(nilai.size);
    const harga = parseRupiah(nilai.harga);
    const hargaCoret = nilai.harga_coret ? parseRupiah(nilai.harga_coret) : null;
    const feeTeks = adaKolomFee ? nilai.fee_per_pasang : "";
    const fee = feeTeks ? parseRupiah(feeTeks) : null;
    const stok = parseBilanganBulat(nilai.stok);

    const salah: string[] = [];
    if (!sku) salah.push("SKU kosong");
    else if (!skuValid(sku)) salah.push(`SKU "${nilai.sku}" hanya boleh huruf, angka, titik, strip, garis miring (tanpa spasi)`);
    if (!nilai.brand) salah.push("brand kosong");
    if (!nilai.nama) salah.push("nama kosong");
    if (!size) salah.push("size kosong");
    if (harga === null || harga <= 0) salah.push(`harga "${nilai.harga}" tidak valid`);
    if (nilai.harga_coret && hargaCoret === null) salah.push(`harga_coret "${nilai.harga_coret}" tidak valid`);
    if (harga !== null && hargaCoret !== null && hargaCoret <= harga) salah.push("harga_coret harus lebih tinggi dari harga");
    if (feeTeks && (fee === null || !feeDalamRentang(fee))) salah.push(`fee_per_pasang "${feeTeks}" harus 50.000 sampai 100.000`);
    if (stok === null) salah.push(`stok "${nilai.stok}" bukan angka bulat 0 atau lebih`);
    if (sku && skuDiFile.has(sku)) salah.push(`SKU ${sku} sudah muncul di baris ${skuDiFile.get(sku)}`);
    if (sku && !skuDiFile.has(sku)) skuDiFile.set(sku, baris);
    if (salah.length > 0) {
      rencana.error.push({ baris, pesan: salah.join("; ") + "." });
      continue;
    }

    const varianLama = varianPerSku.get(sku);
    const produkLama = varianLama ? produkPerId.get(varianLama.productId) : produkPerKunci.get(kunciProduk(nilai.brand, nilai.nama));
    const tujuan = produkLama ? produkLama.id : `baru:${kunciProduk(nilai.brand, nilai.nama)}`;

    let feeDipakai: number | null = fee;
    if (!opsi.bolehUbahFee) {
      if (feeTeks && fee !== (produkLama?.feePerPasang ?? null)) feeDiabaikan = true;
      feeDipakai = produkLama?.feePerPasang ?? null;
    } else if (!feeTeks) {
      // Sama dengan hasil ekspor: sel kosong = ikut tier. Tanpa kolom fee = fee tidak disentuh.
      feeDipakai = adaKolomFee ? null : (produkLama?.feePerPasang ?? null);
    }

    const field: FieldProduk = {
      nama: nilai.nama.trim().replace(/\s+/g, " "),
      brand: nilai.brand.trim(),
      kategori: nilai.kategori?.trim() || null,
      harga: harga!,
      hargaCoret,
      feePerPasang: feeDipakai,
    };

    const k = kelompok.get(tujuan);
    if (k) {
      const beda = samaField(k.field, field);
      if (beda.length > 0) {
        rencana.error.push({
          baris,
          pesan: `Data produk beda dengan baris ${k.barisPertama} untuk model yang sama (${beda.join(", ")}). Samakan dulu.`,
        });
        continue;
      }
    } else {
      kelompok.set(tujuan, { field, barisPertama: baris });
    }

    const kunciSize = `${tujuan}|${size}`;
    if (sizeDiFile.has(kunciSize)) {
      rencana.error.push({ baris, pesan: `Size ${size} untuk model ini sudah ada di baris ${sizeDiFile.get(kunciSize)}.` });
      continue;
    }
    sizeDiFile.set(kunciSize, baris);

    if (varianLama) {
      if (normalisasiSize(varianLama.size) !== size) {
        rencana.error.push({
          baris,
          pesan: `SKU ${sku} tercatat size ${varianLama.size}. Ubah size lewat halaman produk, bukan lewat import.`,
        });
        continue;
      }
      if (varianLama.stok !== stok) {
        rencana.stokDiubah.push({ variantId: varianLama.id, sku: varianLama.sku, size: varianLama.size, dari: varianLama.stok, ke: stok! });
      }
    } else if (produkLama) {
      const skuLain = sizePerProduk.get(produkLama.id)?.get(size);
      if (skuLain) {
        rencana.error.push({ baris, pesan: `${produkLama.nama} sudah punya size ${size} dengan SKU ${skuLain}.` });
        continue;
      }
      rencana.varianBaru.push({ productId: produkLama.id, nama: produkLama.nama, sku, size, stok: stok! });
    } else {
      let baru = rencana.produkBaru.find((p) => p.kunci === tujuan);
      if (!baru) {
        baru = { kunci: tujuan, data: field, varian: [] };
        rencana.produkBaru.push(baru);
      }
      baru.varian.push({ sku, size, stok: stok! });
    }
  }

  for (const [tujuan, k] of kelompok) {
    const lama = produkPerId.get(tujuan);
    if (!lama) continue;
    const { id: _id, ...fieldLama } = lama;
    const beda = samaField(fieldLama, k.field);
    if (beda.length > 0) {
      rencana.produkDiubah.push({
        productId: lama.id,
        nama: lama.nama,
        perubahan: Object.fromEntries(beda.map((f) => [f, k.field[f]])) as Partial<FieldProduk>,
      });
    }
  }

  if (feeDiabaikan) {
    rencana.peringatan.push("Kolom fee_per_pasang diabaikan: hanya pemilik web yang bisa mengubah fee.");
  }
  return rencana;
}
