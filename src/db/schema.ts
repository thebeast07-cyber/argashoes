import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { FEE_MAX, FEE_MIN } from "../lib/domain/fee";
import { PERAN } from "../lib/auth/roles";
import { STATUS_ORDER } from "../lib/domain/order-status";
import { JENIS_USULAN, STATUS_USULAN } from "../lib/domain/usulan";

// Semua nominal uang disimpan sebagai integer rupiah (tanpa desimal).
// Semua waktu disimpan dengan zona waktu; konversi ke WIB dilakukan di kode.

const dibuat = () => timestamp("dibuat", { withTimezone: true }).notNull().defaultNow();

export const peranEnum = pgEnum("peran", PERAN);
export const statusOrderEnum = pgEnum("status_order", STATUS_ORDER);

// --- Akun admin -------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  peran: peranEnum("peran").notNull(),
  passwordHash: text("password_hash").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  dibuat: dibuat(),
});

export const sessions = pgTable(
  "sessions",
  {
    // sha256 dari token di cookie; token mentah tidak pernah disimpan.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kedaluwarsa: timestamp("kedaluwarsa", { withTimezone: true }).notNull(),
    dibuat: dibuat(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// --- Katalog ----------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nama: text("nama").notNull(),
    brand: text("brand").notNull(),
    kategori: text("kategori"),
    deskripsi: text("deskripsi"),
    harga: integer("harga").notNull(),
    hargaCoret: integer("harga_coret"),
    // Opsional. Kalau diisi, menimpa tier fee berdasarkan rentang harga.
    feePerPasang: integer("fee_per_pasang"),
    foto: jsonb("foto").$type<string[]>().notNull().default([]),
    aktif: boolean("aktif").notNull().default(true),
    dibuat: dibuat(),
  },
  (t) => [
    check("products_harga_check", sql`${t.harga} >= 0`),
    check(
      "products_fee_check",
      sql`${t.feePerPasang} is null or ${t.feePerPasang} between ${sql.raw(String(FEE_MIN))} and ${sql.raw(String(FEE_MAX))}`,
    ),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    size: text("size").notNull(),
    stok: integer("stok").notNull().default(0),
  },
  (t) => [
    uniqueIndex("variants_product_size_uq").on(t.productId, t.size),
    check("variants_stok_check", sql`${t.stok} >= 0`),
  ],
);

// Tier fee per rentang harga: harga_min inklusif, harga_max eksklusif (null = tanpa batas atas).
export const feeTiers = pgTable(
  "fee_tiers",
  {
    id: serial("id").primaryKey(),
    hargaMin: integer("harga_min").notNull(),
    hargaMax: integer("harga_max"),
    fee: integer("fee").notNull(),
  },
  (t) => [
    check("fee_tiers_rentang_check", sql`${t.hargaMin} >= 0 and (${t.hargaMax} is null or ${t.hargaMax} > ${t.hargaMin})`),
    check(
      "fee_tiers_fee_check",
      sql`${t.fee} between ${sql.raw(String(FEE_MIN))} and ${sql.raw(String(FEE_MAX))}`,
    ),
  ],
);

// --- Pelanggan dan order ----------------------------------------------------

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: text("nama").notNull(),
  noWa: text("no_wa").notNull().unique(),
  email: text("email"),
  alamatTerakhir: text("alamat_terakhir"),
  persetujuanPada: timestamp("persetujuan_pada", { withTimezone: true }),
  // Untuk login pelanggan (fase berikutnya). Kosong untuk tamu.
  userId: uuid("user_id"),
  dibuat: dibuat(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kode: text("kode").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: statusOrderEnum("status").notNull().default("lead"),
    total: integer("total").notNull(),
    // Salinan saat order dibuat, supaya riwayat tidak berubah.
    nama: text("nama").notNull(),
    noWa: text("no_wa").notNull(),
    alamat: text("alamat").notNull(),
    catatan: text("catatan"),
    catatanInternal: text("catatan_internal"),
    waClickedAt: timestamp("wa_clicked_at", { withTimezone: true }),
    resiNomor: text("resi_nomor"),
    resiFoto: text("resi_foto"),
    dikirimPada: timestamp("dikirim_pada", { withTimezone: true }),
    // Wajib saat Batal (dijaga transisiStatus dan CHECK di bawah).
    alasanBatal: text("alasan_batal"),
    utmSource: text("utm_source"),
    dibuat: dibuat(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_customer_idx").on(t.customerId),
    index("orders_dikirim_pada_idx").on(t.dikirimPada),
    // Aturan PRD: status Dikirim/Selesai tidak boleh tanpa nomor resi.
    check(
      "orders_resi_check",
      sql`${t.status} not in ('dikirim', 'selesai') or (${t.resiNomor} is not null and length(trim(${t.resiNomor})) > 0 and ${t.dikirimPada} is not null)`,
    ),
    check("orders_alasan_batal_check", sql`${t.status} <> 'batal' or (${t.alasanBatal} is not null and length(trim(${t.alasanBatal})) > 0)`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // set null supaya varian yang dihapus tidak menghapus riwayat order.
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    namaProduk: text("nama_produk").notNull(),
    size: text("size").notNull(),
    hargaSatuan: integer("harga_satuan").notNull(),
    jumlah: integer("jumlah").notNull(),
    // Disalin dari produk/tier saat order dibuat; perubahan aturan tidak mengubah order lama.
    feePerPasang: integer("fee_per_pasang").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_jumlah_check", sql`${t.jumlah} > 0`),
  ],
);

// Append-only: UPDATE/DELETE ditolak trigger di migrasi.
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    dariStatus: statusOrderEnum("dari_status"),
    keStatus: statusOrderEnum("ke_status").notNull(),
    // Null berarti otomatis oleh sistem (mis. order baru jadi Lead).
    olehUserId: uuid("oleh_user_id").references(() => users.id),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
    // Alasan batal, supaya tetap terbaca di riwayat yang tidak bisa diubah.
    catatan: text("catatan"),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

// Append-only: riwayat perubahan penting (stok, produk, akun, pengaturan).
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    olehUserId: uuid("oleh_user_id").references(() => users.id),
    aksi: text("aksi").notNull(),
    entitas: text("entitas").notNull(),
    entitasId: text("entitas_id"),
    data: jsonb("data"),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entitas_idx").on(t.entitas, t.entitasId)],
);

// --- Fee dan pengaturan -----------------------------------------------------

export const feePayments = pgTable("fee_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Format YYYY-MM (bulan kalender WIB).
  bulan: text("bulan").notNull().unique(),
  total: integer("total").notNull(),
  dibayarPada: timestamp("dibayar_pada", { withTimezone: true }),
  catatan: text("catatan"),
});

export const settings = pgTable("settings", {
  kunci: text("kunci").primaryKey(),
  nilai: jsonb("nilai").notNull(),
});

// Banner promo (mis. 11.11): overlay gambar di beranda publik. Tampil otomatis selama mulai <= sekarang < selesai dan aktif.
export const banner = pgTable(
  "banner",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    judul: text("judul").notNull(),
    // Overlay di beranda: potret untuk HP, lanskap untuk layar lebar. Wajib keduanya selama banner aktif.
    gambarPotret: text("gambar_potret"),
    gambarLanskap: text("gambar_lanskap"),
    // Tujuan saat gambar diketuk: path internal (/produk/...) atau URL https. Null berarti tidak bisa diketuk.
    tautan: text("tautan"),
    mulai: timestamp("mulai", { withTimezone: true }).notNull(),
    selesai: timestamp("selesai", { withTimezone: true }).notNull(),
    aktif: boolean("aktif").notNull().default(true),
    dibuatPada: timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("banner_jadwal_idx").on(t.aktif, t.mulai, t.selesai),
    check("banner_jadwal_check", sql`${t.selesai} > ${t.mulai}`),
    check("banner_gambar_check", sql`not ${t.aktif} or (${t.gambarPotret} is not null and ${t.gambarLanskap} is not null)`),
  ],
);

export const jenisUsulanEnum = pgEnum("jenis_usulan", JENIS_USULAN);
export const statusUsulanEnum = pgEnum("status_usulan", STATUS_USULAN);

// Usulan admin toko (tier fee, fee per produk, rekening) yang baru berlaku setelah disetujui pemilik.
export const usulan = pgTable(
  "usulan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jenis: jenisUsulanEnum("jenis").notNull(),
    kunci: text("kunci").notNull(),
    productId: uuid("product_id").references(() => products.id),
    // Dibungkus { nilai } supaya nilai null ("ikut tier", "belum ada rekening") tetap bisa disimpan.
    isi: jsonb("isi").$type<{ nilai: unknown }>().notNull(),
    // Nilai yang berlaku saat diusulkan, untuk menolak persetujuan usulan yang sudah basi.
    dasar: jsonb("dasar").$type<{ nilai: unknown }>().notNull(),
    alasan: text("alasan"),
    status: statusUsulanEnum("status").notNull().default("menunggu"),
    diajukanOleh: uuid("diajukan_oleh")
      .notNull()
      .references(() => users.id),
    diajukanPada: timestamp("diajukan_pada", { withTimezone: true }).notNull().defaultNow(),
    diputuskanOleh: uuid("diputuskan_oleh").references(() => users.id),
    diputuskanPada: timestamp("diputuskan_pada", { withTimezone: true }),
    catatanKeputusan: text("catatan_keputusan"),
  },
  (t) => [
    uniqueIndex("usulan_satu_menunggu_uq").on(t.kunci).where(sql`${t.status} = 'menunggu'`),
    index("usulan_status_idx").on(t.status, t.diajukanPada),
    check("usulan_keputusan_check", sql`(${t.status} = 'menunggu') = (${t.diputuskanPada} is null)`),
  ],
);
