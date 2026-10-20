import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uraiDeskripsi } from "@/lib/domain/deskripsi";

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
      {
        jenis: "daftar",
        butir: [
          { label: "Classic Look", isi: "Siluet low-top yang mirip AF1, gampang di-mix and match" },
          { label: "Nyaman Seharian", isi: "Perforasi di toe box + lining empuk" },
          { label: "All Black", isi: "Warna Black/White yang netral" },
        ],
      },
      { jenis: "judul", teks: "Spesifikasi" },
      {
        jenis: "daftar",
        butir: [
          { label: "Artikel", isi: "DH2987-001" },
          { label: "Model", isi: "Nike Court Vision Low Next Nature Men's Shoes" },
          { label: "Kondisi", isi: "BNIB 100% Original" },
        ],
      },
    ]);
  });

  it("poin dengan - atau * di awal baris, teks sebelum • di baris yang sama", () => {
    assert.deepEqual(uraiDeskripsi("Kelebihan: • Ringan • Empuk\n- Ukuran: normal\n* tanpa label"), [
      { jenis: "judul", teks: "Kelebihan" },
      {
        jenis: "daftar",
        butir: [
          { label: null, isi: "Ringan" },
          { label: null, isi: "Empuk" },
          { label: "Ukuran", isi: "normal" },
          { label: null, isi: "tanpa label" },
        ],
      },
    ]);
  });

  it("teks biasa tetap paragraf per baris; tautan dan kalimat panjang berakhiran titik dua tidak jadi judul", () => {
    const panjang = "Sepatu ini cocok untuk sekolah, kantor, dan jalan santai di akhir pekan:";
    assert.deepEqual(uraiDeskripsi(`Baris satu\nBaris dua\n${panjang}`), [
      { jenis: "paragraf", teks: "Baris satu" },
      { jenis: "paragraf", teks: "Baris dua" },
      { jenis: "paragraf", teks: panjang },
    ]);
    assert.deepEqual(uraiDeskripsi("- Link: https://contoh.com/a")[0], { jenis: "daftar", butir: [{ label: "Link", isi: "https://contoh.com/a" }] });
    assert.deepEqual(uraiDeskripsi("- https://contoh.com/a")[0], { jenis: "daftar", butir: [{ label: null, isi: "https://contoh.com/a" }] });
  });

  it("baris kosong memisahkan dua daftar", () => {
    const b = uraiDeskripsi("• a\n\n• b");
    assert.equal(b.length, 2);
    assert.ok(b.every((x) => x.jenis === "daftar"));
  });

  it("kosong", () => {
    assert.deepEqual(uraiDeskripsi("  \n "), []);
  });
});
