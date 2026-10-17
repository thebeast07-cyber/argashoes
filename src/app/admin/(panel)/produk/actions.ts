"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { wajibIzin } from "@/lib/auth/current";
import { punyaIzin } from "@/lib/auth/roles";
import { BATAS_UKURAN_CSV, parseCsv } from "@/lib/csv";
import { FOTO_MAKS, isTipeFoto, parseAksiFoto, validasiFileFoto } from "@/lib/domain/foto";
import { hapusFotoTersimpan, PenyimpananBelumSiap, simpanFoto } from "@/lib/foto/penyimpanan";
import {
  rencanakanImportKatalog,
  rencanakanImportStok,
  type ErrorBaris,
  type RencanaKatalog,
  type RencanaStok,
} from "@/lib/domain/import";
import { parseBilanganBulat, validasiProduk, validasiVarian, type InputProduk } from "@/lib/domain/produk";
import { dataUntukImport, fotoProduk } from "@/lib/produk/data";
import {
  buatProduk,
  hapusVarian,
  tambahVarian,
  terapkanImportKatalog,
  terapkanImportStok,
  ubahFotoProduk,
  ubahProduk,
  ubahStok,
  type HasilUbahFoto,
} from "@/lib/produk/mutasi";

export type StateForm = { error?: Record<string, string>; pesan?: string; sukses?: string };

function inputProduk(form: FormData): InputProduk {
  const teks = (k: string) => String(form.get(k) ?? "");
  return {
    nama: teks("nama"),
    brand: teks("brand"),
    kategori: teks("kategori"),
    deskripsi: teks("deskripsi"),
    harga: teks("harga"),
    hargaCoret: teks("hargaCoret"),
    feePerPasang: teks("feePerPasang"),
    aktif: form.get("aktif") === "on",
  };
}

export async function simpanProdukBaru(_prev: StateForm, form: FormData): Promise<StateForm> {
  const user = await wajibIzin("produk.kelola");
  const input = inputProduk(form);
  // Fee per produk termasuk aturan fee: hanya pemilik (PRD "Pengguna dan peran").
  if (!punyaIzin(user.peran, "fee.atur")) input.feePerPasang = "";
  const hasil = validasiProduk(input);
  if (!hasil.ok) return { error: hasil.error };

  const id = await buatProduk(await getDb(), hasil.data, user.id);
  revalidatePath("/admin/produk");
  redirect(`/admin/produk/${id}?baru=1`);
}

export async function simpanProduk(id: string, _prev: StateForm, form: FormData): Promise<StateForm> {
  const user = await wajibIzin("produk.kelola");
  const bolehUbahFee = punyaIzin(user.peran, "fee.atur");
  const input = inputProduk(form);
  // Tanpa izin fee, isian fee diabaikan dan ubahProduk mempertahankan fee lama.
  if (!bolehUbahFee) input.feePerPasang = "";
  const hasil = validasiProduk(input);
  if (!hasil.ok) return { error: hasil.error };

  const status = await ubahProduk(await getDb(), id, hasil.data, user.id, { bolehUbahFee });
  if (status === "tidak_ada") return { pesan: "Produk ini sudah tidak ada." };
  revalidatePath("/admin/produk");
  revalidatePath(`/admin/produk/${id}`);
  return { sukses: "Perubahan tersimpan." };
}

const PESAN_VARIAN = {
  sku_dipakai: { sku: "SKU ini sudah dipakai size lain." },
  size_dipakai: { size: "Size ini sudah ada di produk ini." },
  tidak_ada: { size: "Produk ini sudah tidak ada." },
} as const;

export async function simpanVarianBaru(productId: string, _prev: StateForm, form: FormData): Promise<StateForm> {
  const user = await wajibIzin("produk.kelola");
  const hasil = validasiVarian({
    sku: String(form.get("sku") ?? ""),
    size: String(form.get("size") ?? ""),
    stok: String(form.get("stok") ?? ""),
  });
  if (!hasil.ok) return { error: hasil.error };

  const status = await tambahVarian(await getDb(), productId, hasil.data, user.id);
  if (status !== "ok") return { error: { ...PESAN_VARIAN[status] } };
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
  return { sukses: `Size ${hasil.data.size} ditambahkan.` };
}

export async function simpanStok(productId: string, variantId: string, _prev: StateForm, form: FormData): Promise<StateForm> {
  const user = await wajibIzin("produk.kelola");
  const stok = parseBilanganBulat(String(form.get("stok") ?? ""));
  if (stok === null) return { pesan: "Stok berupa angka bulat, 0 atau lebih." };
  await ubahStok(await getDb(), variantId, stok, user.id);
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
  return { sukses: "Tersimpan" };
}

export async function tandaiHabis(productId: string, variantId: string): Promise<void> {
  const user = await wajibIzin("produk.kelola");
  await ubahStok(await getDb(), variantId, 0, user.id, "stok.tandai_habis");
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
}

export async function hapusSize(productId: string, variantId: string): Promise<void> {
  const user = await wajibIzin("produk.kelola");
  await hapusVarian(await getDb(), variantId, user.id);
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
}

// --- Foto ------------------------------------------------------------------------

export type HasilAksiFoto = { error?: string };

const PESAN_FOTO: Record<Exclude<HasilUbahFoto, { ok: true }>["error"], string> = {
  penuh: `Sudah ${FOTO_MAKS} foto, batas per model. Hapus satu untuk menambah.`,
  tidak_ada: "Foto ini sudah berubah. Muat ulang halaman.",
  sudah_ada: "Foto ini sudah ada.",
  produk_tidak_ada: "Produk ini sudah tidak ada.",
};

function segarkanProduk(productId: string) {
  revalidatePath(`/admin/produk/${productId}`);
  revalidatePath("/admin/produk");
}

/** Satu foto per panggilan: browser sudah mengecilkannya, jadi muat di batas body server action. */
export async function unggahFoto(productId: string, form: FormData): Promise<HasilAksiFoto> {
  const user = await wajibIzin("produk.kelola");
  const file = form.get("foto");
  if (!(file instanceof Blob)) return { error: "File foto tidak terbaca. Pilih ulang." };
  const salah = validasiFileFoto({ tipe: file.type, ukuran: file.size });
  if (salah || !isTipeFoto(file.type)) return { error: salah ?? "Format foto harus JPG, PNG, atau WebP." };

  const db = await getDb();
  // Cek batas sebelum menyimpan file, supaya tidak ada file tersimpan yang tidak dipakai produk mana pun.
  const foto = await fotoProduk(db, productId);
  if (!foto) return { error: PESAN_FOTO.produk_tidak_ada };
  if (foto.length >= FOTO_MAKS) return { error: PESAN_FOTO.penuh };

  let url: string;
  try {
    url = await simpanFoto(productId, file, file.type);
  } catch (e) {
    if (e instanceof PenyimpananBelumSiap) return { error: "Penyimpanan foto belum disiapkan di server. Kabari pemilik web." };
    return { error: "Foto gagal diunggah. Coba lagi." };
  }
  const hasil = await ubahFotoProduk(db, productId, { jenis: "tambah", url }, user.id);
  if (!hasil.ok) {
    await hapusFotoTersimpan(url).catch(() => {});
    return { error: PESAN_FOTO[hasil.error] };
  }
  segarkanProduk(productId);
  return {};
}

export async function aturFoto(productId: string, aksiMentah: unknown): Promise<HasilAksiFoto> {
  const user = await wajibIzin("produk.kelola");
  const aksi = parseAksiFoto(aksiMentah);
  if (!aksi) return { error: "Aksi foto tidak dikenal." };
  const hasil = await ubahFotoProduk(await getDb(), productId, aksi, user.id);
  if (!hasil.ok) return { error: PESAN_FOTO[hasil.error] };
  if (aksi.jenis === "hapus") await hapusFotoTersimpan(aksi.url).catch(() => {});
  segarkanProduk(productId);
  return {};
}

// --- Import CSV -----------------------------------------------------------------

export type JenisImport = "stok" | "katalog";

export type HasilImport = {
  token?: string;
  jenis?: JenisImport;
  namaFile?: string;
  error?: ErrorBaris[];
  totalError?: number;
  peringatan?: string[];
  ringkasan?: string[];
  contoh?: string[];
  bisaDiterapkan?: boolean;
  sukses?: string;
  pesan?: string;
};

const BATAS_TAMPIL = 50;

function ribuan(n: number) {
  return n.toLocaleString("id-ID");
}

function ringkasStok(r: RencanaStok): Pick<HasilImport, "ringkasan" | "contoh"> {
  return {
    ringkasan: [`${ribuan(r.perubahan.length)} size berubah stok`, `${ribuan(r.tidakBerubah)} size tidak berubah`],
    contoh: r.perubahan.slice(0, BATAS_TAMPIL).map((p) => `${p.sku} (size ${p.size}): ${p.dari} → ${p.ke}`),
  };
}

function ringkasKatalog(r: RencanaKatalog): Pick<HasilImport, "ringkasan" | "contoh"> {
  const varianProdukBaru = r.produkBaru.reduce((n, p) => n + p.varian.length, 0);
  return {
    ringkasan: [
      `${ribuan(r.produkBaru.length)} model baru (${ribuan(varianProdukBaru)} size)`,
      `${ribuan(r.varianBaru.length)} size baru di model yang sudah ada`,
      `${ribuan(r.produkDiubah.length)} model berubah data`,
      `${ribuan(r.stokDiubah.length)} size berubah stok`,
    ],
    contoh: [
      ...r.produkBaru.map((p) => `Baru: ${p.data.brand} ${p.data.nama}, size ${p.varian.map((v) => v.size).join(", ")}`),
      ...r.varianBaru.map((v) => `Size baru: ${v.nama} ${v.size} (${v.sku})`),
      ...r.produkDiubah.map((p) => `Diubah: ${p.nama} (${Object.keys(p.perubahan).join(", ")})`),
      ...r.stokDiubah.map((p) => `Stok: ${p.sku} (size ${p.size}): ${p.dari} → ${p.ke}`),
    ].slice(0, BATAS_TAMPIL),
  };
}

function adaPerubahan(jenis: JenisImport, r: RencanaStok | RencanaKatalog): boolean {
  if (jenis === "stok") return (r as RencanaStok).perubahan.length > 0;
  const k = r as RencanaKatalog;
  return k.produkBaru.length + k.produkDiubah.length + k.varianBaru.length + k.stokDiubah.length > 0;
}

async function rencanakan(form: FormData, peranBolehFee: boolean) {
  const jenis: JenisImport = form.get("jenis") === "katalog" ? "katalog" : "stok";
  const token = String(form.get("token") ?? "");
  const isi = String(form.get("isi") ?? "");
  const namaFile = String(form.get("namaFile") ?? "tanpa-nama.csv").slice(0, 200);
  if (!isi.trim()) return { token, jenis, namaFile, gagal: "File kosong atau belum dipilih." };
  if (isi.length > BATAS_UKURAN_CSV) return { token, jenis, namaFile, gagal: "File terlalu besar (maksimal sekitar 1,5 MB). Pecah jadi beberapa file." };

  const tabel = parseCsv(isi);
  const { produk, varian } = await dataUntukImport(await getDb());
  const rencana = jenis === "stok" ? rencanakanImportStok(tabel, varian) : rencanakanImportKatalog(tabel, produk, varian, { bolehUbahFee: peranBolehFee });
  return { token, jenis, namaFile, rencana };
}

export async function pratinjauImport(_prev: HasilImport, form: FormData): Promise<HasilImport> {
  const user = await wajibIzin("produk.kelola");
  const r = await rencanakan(form, punyaIzin(user.peran, "fee.atur"));
  if ("gagal" in r) return { token: r.token, jenis: r.jenis, pesan: r.gagal };

  const { token, jenis, namaFile, rencana } = r;
  const ringkas = jenis === "stok" ? ringkasStok(rencana as RencanaStok) : ringkasKatalog(rencana as RencanaKatalog);
  return {
    token,
    jenis,
    namaFile,
    ...ringkas,
    error: rencana.error.slice(0, 100),
    totalError: rencana.error.length,
    peringatan: "peringatan" in rencana ? rencana.peringatan : [],
    bisaDiterapkan: rencana.error.length === 0 && adaPerubahan(jenis, rencana),
  };
}

export async function terapkanImport(_prev: HasilImport, form: FormData): Promise<HasilImport> {
  const user = await wajibIzin("produk.kelola");
  const r = await rencanakan(form, punyaIzin(user.peran, "fee.atur"));
  if ("gagal" in r) return { token: r.token, jenis: r.jenis, pesan: r.gagal };

  const { token, jenis, namaFile, rencana } = r;
  // Dihitung ulang dari database terbaru: kalau sejak pratinjau ada yang berubah sampai bikin error, batal.
  if (rencana.error.length > 0) {
    return {
      token,
      jenis,
      namaFile,
      error: rencana.error.slice(0, 100),
      totalError: rencana.error.length,
      pesan: "Data di database berubah sejak pratinjau, dan sekarang ada baris yang bermasalah. Tidak ada yang disimpan.",
    };
  }

  const db = await getDb();
  if (jenis === "stok") await terapkanImportStok(db, rencana as RencanaStok, user.id, namaFile);
  else await terapkanImportKatalog(db, rencana as RencanaKatalog, user.id, namaFile);
  revalidatePath("/admin/produk");

  const ringkas = jenis === "stok" ? ringkasStok(rencana as RencanaStok) : ringkasKatalog(rencana as RencanaKatalog);
  return { token, jenis, namaFile, sukses: `Import ${namaFile} tersimpan.`, ringkasan: ringkas.ringkasan };
}
