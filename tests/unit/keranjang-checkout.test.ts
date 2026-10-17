import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buatKodeOrder,
  isKodeOrder,
  lewatBatasKirim,
  linkWhatsApp,
  pesanWhatsApp,
  rencanakanOrder,
  validasiPembeli,
  type VarianTerkini,
} from "@/lib/domain/checkout";
import { FEE_MIN } from "@/lib/domain/fee";
import { hapusItem, ITEM_MAKS, JUMLAH_MAKS, parseKeranjang, tambahItem, totalKeranjang, ubahJumlah, type ItemKeranjang } from "@/lib/domain/keranjang";

const SAMBA = { productId: "p1", size: "43", nama: "Samba OG", brand: "Adidas", harga: 1_399_000, foto: null };
const DUNK = { productId: "p2", size: "42", nama: "Dunk Low", brand: "Nike", harga: 1_549_000, foto: "/foto/a.jpg" };

describe("keranjang", () => {
  it("model + size sama digabung, jumlah dibatasi", () => {
    let k: ItemKeranjang[] = [];
    k = tambahItem(k, SAMBA);
    k = tambahItem(k, DUNK);
    k = tambahItem(k, SAMBA);
    assert.deepEqual(k.map((i) => [i.productId, i.jumlah]), [["p2", 1], ["p1", 2]]);
    for (let n = 0; n < 10; n++) k = tambahItem(k, SAMBA);
    assert.equal(k.find((i) => i.productId === "p1")?.jumlah, JUMLAH_MAKS);
    assert.deepEqual(totalKeranjang(ubahJumlah(k, SAMBA, 2)), { pasang: 3, subtotal: 2 * 1_399_000 + 1_549_000 });
    assert.equal(ubahJumlah(k, SAMBA, 0)[1].jumlah, 1);
    assert.deepEqual(hapusItem(k, DUNK).map((i) => i.productId), ["p1"]);
  });

  it("size beda dari model yang sama jadi item terpisah, jumlah item dibatasi", () => {
    let k = tambahItem([], SAMBA);
    k = tambahItem(k, { ...SAMBA, size: "42" });
    assert.equal(k.length, 2);
    for (let n = 0; n < 15; n++) k = tambahItem(k, { ...DUNK, productId: `x${n}` });
    assert.equal(k.length, ITEM_MAKS);
  });

  it("isi localStorage yang rusak dibuang", () => {
    assert.deepEqual(parseKeranjang(null), []);
    assert.deepEqual(parseKeranjang("{bukan json"), []);
    assert.deepEqual(parseKeranjang('{"a":1}'), []);
    const campur = JSON.stringify([{ ...SAMBA, jumlah: 99 }, { productId: 1 }, { ...SAMBA, jumlah: 1 }, { ...DUNK, jumlah: 1.5 }]);
    assert.deepEqual(parseKeranjang(campur), [{ ...SAMBA, jumlah: JUMLAH_MAKS }]);
  });
});

describe("validasiPembeli", () => {
  const ISI = { nama: " Budi  Santoso ", wa: "0812-3456-7890", alamat: "Jl. Mawar 1, Kec. A, Kota B 12345", catatan: "", setuju: true };

  it("data dirapikan, nomor WA jadi format 62", () => {
    assert.deepEqual(validasiPembeli(ISI), {
      ok: true,
      data: { nama: "Budi Santoso", noWa: "6281234567890", alamat: "Jl. Mawar 1, Kec. A, Kota B 12345", catatan: null },
    });
  });

  it("semua isian wajib diperiksa sekaligus", () => {
    const r = validasiPembeli({ nama: " ", wa: "12", alamat: "Jl. A", catatan: "x".repeat(501), setuju: false });
    assert.equal(r.ok, false);
    assert.deepEqual(Object.keys(r.ok ? {} : r.error).sort(), ["alamat", "catatan", "nama", "setuju", "wa"]);
  });
});

describe("rencanakanOrder", () => {
  const TERKINI: VarianTerkini[] = [
    { productId: "p1", variantId: "v1", size: "43", stok: 2, nama: "Samba OG", brand: "Adidas", harga: 1_399_000, feeProduk: 80_000 },
    { productId: "p2", variantId: "v2", size: "42", stok: 5, nama: "Dunk Low", brand: "Nike", harga: 1_549_000, feeProduk: null },
    { productId: "p3", variantId: "v3", size: "40", stok: 0, nama: "Gazelle", brand: "Adidas", harga: 1_299_000, feeProduk: null },
  ];
  const TIER = [{ hargaMin: 1_500_000, hargaMax: null, fee: 70_000 }];

  it("harga dari database, fee khusus menimpa tier, tanpa tier pakai batas bawah", () => {
    const r = rencanakanOrder(
      [{ productId: "p1", size: "43", jumlah: 2 }, { productId: "p2", size: "42", jumlah: 1 }],
      [...TERKINI, { ...TERKINI[1], productId: "p4", variantId: "v4", harga: 900_000 }],
      TIER,
    );
    assert.deepEqual(r, {
      ok: true,
      total: 2 * 1_399_000 + 1_549_000,
      items: [
        { variantId: "v1", namaProduk: "Adidas Samba OG", size: "43", hargaSatuan: 1_399_000, jumlah: 2, feePerPasang: 80_000 },
        { variantId: "v2", namaProduk: "Nike Dunk Low", size: "42", hargaSatuan: 1_549_000, jumlah: 1, feePerPasang: 70_000 },
      ],
    });
    const tanpaTier = rencanakanOrder([{ productId: "p2", size: "42", jumlah: 1 }], TERKINI, []);
    assert.equal(tanpaTier.ok && tanpaTier.items[0].feePerPasang, FEE_MIN);
  });

  it("size hilang, habis, kurang stok, jumlah aneh: semua masalah dilaporkan", () => {
    const r = rencanakanOrder(
      [
        { productId: "p9", size: "41", jumlah: 1 },
        { productId: "p3", size: "40", jumlah: 1 },
        { productId: "p1", size: "43", jumlah: 3 },
        { productId: "p2", size: "42", jumlah: 0 },
      ],
      TERKINI,
      TIER,
    );
    assert.equal(r.ok, false);
    const pesan = r.ok ? [] : r.masalah.map((m) => m.pesan);
    assert.match(pesan[0], /sudah tidak dijual/);
    assert.match(pesan[1], /baru saja habis/);
    assert.match(pesan[2], /tinggal 2 pasang/);
    assert.match(pesan[3], /1 sampai 5/);
    assert.equal(rencanakanOrder([], TERKINI, TIER).ok, false);
  });
});

describe("kode order dan WhatsApp", () => {
  it("kode WEB-XXXX tanpa huruf yang mirip angka", () => {
    const kode = buatKodeOrder(new Uint8Array([0, 7, 30, 255]));
    assert.equal(kode, "WEB-29Z9");
    assert.equal(isKodeOrder(kode), true);
    assert.equal(isKodeOrder("WEB-0O1I"), false);
    assert.equal(isKodeOrder("web-29z6"), false);
  });

  it("pesan berisi kode, item, subtotal, nama, alamat; catatan hanya kalau ada", () => {
    const pesan = pesanWhatsApp({
      kode: "WEB-29Z9",
      nama: "Budi",
      alamat: "Jl. Mawar 1",
      catatan: null,
      total: 2_798_000,
      items: [{ namaProduk: "Adidas Samba OG", size: "43", jumlah: 2, hargaSatuan: 1_399_000 }],
    });
    assert.equal(
      pesan,
      "Halo, saya mau pesan. Kode pesanan: WEB-29Z9\n\n2x Adidas Samba OG, size 43, Rp 1.399.000\n\nSubtotal: Rp 2.798.000 (belum termasuk ongkir)\nNama: Budi\nAlamat: Jl. Mawar 1",
    );
    assert.equal(linkWhatsApp("6281234567890", "a b&c"), "https://wa.me/6281234567890?text=a%20b%26c");
  });

  it("batas kirim per nomor dalam satu jam", () => {
    const now = new Date("2026-10-17T10:00:00Z");
    const menit = (m: number) => new Date(now.getTime() - m * 60_000);
    assert.equal(lewatBatasKirim([menit(5), menit(20)], now), false);
    assert.equal(lewatBatasKirim([menit(5), menit(20), menit(59)], now), true);
    assert.equal(lewatBatasKirim([menit(5), menit(20), menit(61)], now), false);
  });
});

describe("parseItemDiminta", () => {
  it("hanya productId, size, jumlah yang diambil; bentuk salah dibuang", async () => {
    const { parseItemDiminta } = await import("@/lib/domain/checkout");
    assert.deepEqual(parseItemDiminta("bukan json"), []);
    assert.deepEqual(
      parseItemDiminta(JSON.stringify([{ productId: "p1", size: "43", jumlah: 2, harga: 1 }, { productId: "p2" }, null, { productId: "p3", size: "40", jumlah: "2" }])),
      [{ productId: "p1", size: "43", jumlah: 2 }],
    );
  });
});
