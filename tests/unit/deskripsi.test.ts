import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uraiDeskripsi, type BlokDeskripsi } from "@/lib/domain/deskripsi";

const poin = (butir: [string | null, string][], berurut = false): BlokDeskripsi => ({
  jenis: "daftar",
  berurut,
  butir: butir.map(([label, isi]) => ({ label, isi })),
});

describe("uraiDeskripsi", () => {
  it("contoh dari Production: judul, poin disambung dengan •, label tebal", () => {
    const teks = [
      "Sneaker hitam serbaguna dari bahan daur ulang.",
      "",
      "Fitur Unggulan:",
      "• Classic Look: Siluet low-top yang mirip AF1, gampang di-mix and match • Nyaman Seharian: Perforasi di toe box + lining empuk • All Black: Warna Black/White yang netral",
      "Spesifikasi:",
      "• Artikel: DH2987-001 • Model: Nike Court Vision Low Next Nature Men's Shoes • Kondisi: BNIB 100% Original",
    ].join("\n");
    assert.deepEqual(uraiDeskripsi(teks), [
      { jenis: "paragraf", teks: "Sneaker hitam serbaguna dari bahan daur ulang." },
      { jenis: "judul", teks: "Fitur Unggulan" },
      poin([
        ["Classic Look", "Siluet low-top yang mirip AF1, gampang di-mix and match"],
        ["Nyaman Seharian", "Perforasi di toe box + lining empuk"],
        ["All Black", "Warna Black/White yang netral"],
      ]),
      { jenis: "judul", teks: "Spesifikasi" },
      poin([
        ["Artikel", "DH2987-001"],
        ["Model", "Nike Court Vision Low Next Nature Men's Shoes"],
        ["Kondisi", "BNIB 100% Original"],
      ]),
    ]);
  });

  it("gaya Shopee: judul dibungkus atau HURUF BESAR, poin emoji, label dengan spasi sebelum titik dua, hashtag dibuang", () => {
    const teks = [
      "【 SPESIFIKASI 】",
      "✅ Warna : Hitam",
      "✅Bahan: Kulit sintetis",
      "➤ Ukuran normal",
      "=========",
      "✨ DETAIL PRODUK",
      "🔥 Ringan dipakai seharian",
      "#nike #sneakers #original",
    ].join("\n");
    assert.deepEqual(uraiDeskripsi(teks), [
      { jenis: "judul", teks: "Spesifikasi" },
      poin([
        ["Warna", "Hitam"],
        ["Bahan", "Kulit sintetis"],
        [null, "Ukuran normal"],
      ]),
      { jenis: "judul", teks: "Detail Produk" },
      poin([[null, "Ringan dipakai seharian"]]),
    ]);
  });

  it("daftar bernomor jadi daftar berurut terpisah dari poin", () => {
    assert.deepEqual(uraiDeskripsi("Cara order:\n1. Pilih size\n2) Isi data\n- catatan"), [
      { jenis: "judul", teks: "Cara order" },
      poin(
        [
          [null, "Pilih size"],
          [null, "Isi data"],
        ],
        true,
      ),
      poin([[null, "catatan"]]),
    ]);
  });

  it("judul di depan poin sebaris, poin dengan - atau *", () => {
    assert.deepEqual(uraiDeskripsi("Kelebihan: • Ringan • Empuk\n- Ukuran: normal\n* tanpa label"), [
      { jenis: "judul", teks: "Kelebihan" },
      poin([
        [null, "Ringan"],
        [null, "Empuk"],
        ["Ukuran", "normal"],
        [null, "tanpa label"],
      ]),
    ]);
  });

  it("teks biasa tetap paragraf; kalimat, angka negatif, jam, dan tautan tidak salah tebak", () => {
    const panjang = "Sepatu ini cocok untuk sekolah, kantor, dan jalan santai di akhir pekan:";
    assert.deepEqual(uraiDeskripsi(`Baris satu\n-20% hari ini saja\n${panjang}\nBuka 10:30 WIB.`), [
      { jenis: "paragraf", teks: "Baris satu" },
      { jenis: "paragraf", teks: "-20% hari ini saja" },
      { jenis: "paragraf", teks: panjang },
      { jenis: "paragraf", teks: "Buka 10:30 WIB." },
    ]);
    assert.deepEqual(uraiDeskripsi("- Link: https://contoh.com/a")[0], poin([["Link", "https://contoh.com/a"]]));
    assert.deepEqual(uraiDeskripsi("- https://contoh.com/a")[0], poin([[null, "https://contoh.com/a"]]));
    assert.deepEqual(uraiDeskripsi("100% ORIGINAL BNIB.")[0], { jenis: "paragraf", teks: "100% ORIGINAL BNIB." });
  });

  it("baris kosong memisahkan dua daftar; kosong menghasilkan kosong", () => {
    const b = uraiDeskripsi("• a\n\n• b");
    assert.equal(b.length, 2);
    assert.ok(b.every((x) => x.jenis === "daftar"));
    assert.deepEqual(uraiDeskripsi("  \n "), []);
  });
});
