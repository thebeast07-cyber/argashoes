import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  halamanKatalog,
  kalimatMerek,
  opsiKatalog,
  parseCariKatalog,
  ringkasSizeKartu,
  saringKatalog,
  urlKatalog,
  type CariKatalog,
  type ItemKatalog,
} from "@/lib/domain/katalog";

const tgl = (hari: number) => new Date(Date.UTC(2026, 9, hari));
const item = (o: Partial<ItemKatalog> & Pick<ItemKatalog, "id">): ItemKatalog => ({
  nama: o.id,
  brand: "Nike",
  kategori: null,
  harga: 1_000_000,
  hargaCoret: null,
  sampul: null,
  dibuat: tgl(1),
  varian: [{ size: "42", stok: 3 }],
  ...o,
});

const SAMBA = item({ id: "samba", nama: "Samba OG", brand: "Adidas", kategori: "Lifestyle", harga: 1_399_000, dibuat: tgl(3), varian: [{ size: "42", stok: 1 }, { size: "43", stok: 0 }] });
const DUNK = item({ id: "dunk", nama: "Dunk Low", harga: 1_549_000, dibuat: tgl(2), varian: [{ size: "42", stok: 5 }, { size: "43", stok: 2 }] });
const COURT = item({ id: "court", nama: "Court Vision", kategori: "Lifestyle", harga: 899_000, dibuat: tgl(1), varian: [{ size: "41", stok: 4 }] });
const KOSONG = item({ id: "kosong", varian: [] });
const SEMUA = [SAMBA, DUNK, COURT, KOSONG];
const DASAR: CariKatalog = { urut: "baru", hal: 1 };
const id = (xs: ItemKatalog[]) => xs.map((x) => x.id);

describe("parseCariKatalog", () => {
  it("nilai kosong atau aneh diabaikan", () => {
    assert.deepEqual(parseCariKatalog({}), DASAR);
    assert.deepEqual(parseCariKatalog({ urut: "acak", hal: "-3", min: "abc", size: "  " }), DASAR);
  });

  it("harga boleh bertitik, min dan maks yang terbalik ditukar", () => {
    const c = parseCariKatalog({ min: "1.500.000", maks: "900000", brand: " Nike ", urut: "murah", hal: "2", size: ["42", "43"] });
    assert.deepEqual(c, { ...DASAR, brand: "Nike", size: "42", hargaMin: 900_000, hargaMax: 1_500_000, urut: "murah", hal: 2 });
  });
});

describe("saringKatalog", () => {
  it("model tanpa size disembunyikan; default urut terbaru", () => {
    assert.deepEqual(id(saringKatalog(SEMUA, DASAR)), ["samba", "dunk", "court"]);
  });

  it("pilih size: hanya yang masih ada stoknya di size itu, stok terbanyak dulu", () => {
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, size: "42" })), ["dunk", "samba"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, size: "43" })), ["dunk"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, size: "45" })), []);
  });

  it("brand, kategori, kata kunci, rentang harga, dan urut harga", () => {
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, brand: "Adidas" })), ["samba"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, kategori: "Lifestyle" })), ["samba", "court"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, q: "adidas samba" })), ["samba"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, hargaMin: 1_000_000, hargaMax: 1_400_000 })), ["samba"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, urut: "murah" })), ["court", "samba", "dunk"]);
    assert.deepEqual(id(saringKatalog(SEMUA, { ...DASAR, urut: "mahal", size: "42" })), ["dunk", "samba"]);
  });
});

describe("halamanKatalog", () => {
  it("halaman di luar jangkauan dijepit ke halaman terakhir", () => {
    const xs = Array.from({ length: 5 }, (_, i) => i);
    assert.deepEqual(halamanKatalog(xs, 2, 2), { items: [2, 3], total: 5, hal: 2, totalHalaman: 3 });
    assert.deepEqual(halamanKatalog(xs, 9, 2).hal, 3);
    assert.deepEqual(halamanKatalog([], 1, 2), { items: [], total: 0, hal: 1, totalHalaman: 1 });
  });
});

describe("opsiKatalog", () => {
  it("size hanya yang masih ada stoknya, urut sebagai angka", () => {
    assert.deepEqual(opsiKatalog(SEMUA), { size: ["41", "42", "43"], brand: ["Adidas", "Nike"], kategori: ["Lifestyle"] });
  });
});

describe("ringkasSizeKartu", () => {
  it("hanya yang ada stok, maksimal 4, sisa sedikit ditulis terpisah", () => {
    const varian = ["44", "40", "41", "42", "43", "39"].map((size, i) => ({ size, stok: i === 5 ? 0 : i + 1 }));
    assert.deepEqual(ringkasSizeKartu(varian, { readyMin: 3 }), {
      tampil: [
        { size: "40", sisaSedikit: true },
        { size: "41", sisaSedikit: false },
        { size: "42", sisaSedikit: false },
        { size: "43", sisaSedikit: false },
      ],
      lebih: 1,
      sisaSedikit: ["40"],
    });
  });
});

describe("urlKatalog", () => {
  it("parameter default tidak ditulis, ubah filter kembali ke halaman 1", () => {
    assert.equal(urlKatalog(DASAR), "/");
    const c: CariKatalog = { ...DASAR, size: "42", brand: "Nike", hal: 3 };
    assert.equal(urlKatalog(c, { brand: undefined }), "/?size=42");
    assert.equal(urlKatalog(c, { hal: 4 }), "/?size=42&brand=Nike&hal=4");
    assert.equal(urlKatalog({ ...DASAR, urut: "murah", hargaMin: 500_000 }), "/?min=500000&urut=murah");
  });
});

describe("kalimatMerek", () => {
  it("1 sampai 4 brand disebut, lebih dari itu atau kosong: null", () => {
    assert.equal(kalimatMerek([]), null);
    assert.equal(kalimatMerek(["Nike"]), "Nike");
    assert.equal(kalimatMerek(["Adidas", "Nike"]), "Adidas dan Nike");
    assert.equal(kalimatMerek(["Adidas", "New Balance", "Nike"]), "Adidas, New Balance, dan Nike");
    assert.equal(kalimatMerek(["A", "B", "C", "D", "E"]), null);
  });
});
