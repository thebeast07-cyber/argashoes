import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daftarTautan, urlWa, URL_INSTAGRAM, URL_KATALOG } from "@/lib/domain/tautan";

describe("urlWa", () => {
  it("nomor berformat bebas jadi link wa.me dengan kode negara", () => {
    assert.equal(urlWa("+62 896-3090-8542"), "https://wa.me/6289630908542");
    assert.equal(urlWa("0896-3090-8542"), "https://wa.me/6289630908542");
  });

  it("pesan sapaan di-encode", () => {
    assert.equal(urlWa("0896-3090-8542", "Halo, mau tanya"), "https://wa.me/6289630908542?text=Halo%2C%20mau%20tanya");
  });

  it("nomor tidak sah menghasilkan null", () => {
    assert.equal(urlWa("bukan nomor"), null);
    assert.equal(urlWa("123"), null);
  });
});

describe("daftarTautan", () => {
  const daftar = daftarTautan();

  it("katalog jadi tautan utama dan satu-satunya yang utama", () => {
    assert.deepEqual(daftar.filter((t) => t.utama).map((t) => t.kunci), ["katalog"]);
    assert.equal(daftar[0].href, URL_KATALOG);
  });

  it("memuat WhatsApp ke nomor toko dan Instagram tanpa parameter pelacak", () => {
    const wa = daftar.find((t) => t.kunci === "whatsapp");
    assert.ok(wa);
    assert.ok(wa.href.startsWith("https://wa.me/6289630908542?text="));
    const ig = daftar.find((t) => t.kunci === "instagram");
    assert.equal(ig?.href, URL_INSTAGRAM);
    assert.ok(!ig?.href.includes("?"));
  });

  it("semua tautan https dan kuncinya unik", () => {
    for (const t of daftar) assert.ok(t.href.startsWith("https://"), t.kunci);
    assert.equal(new Set(daftar.map((t) => t.kunci)).size, daftar.length);
  });
});
