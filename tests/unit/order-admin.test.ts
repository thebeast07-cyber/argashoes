import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { awalHariWib, isiEmailOrderBaru, leadTerbengkalai, umur } from "@/lib/domain/order-admin";

describe("leadTerbengkalai", () => {
  const dibuat = new Date("2026-10-17T00:00:00Z");
  it("hanya Lead yang dibiarkan 24 jam atau lebih", () => {
    assert.equal(leadTerbengkalai({ status: "lead", dibuat }, new Date("2026-10-17T23:59:00Z")), false);
    assert.equal(leadTerbengkalai({ status: "lead", dibuat }, new Date("2026-10-18T00:00:00Z")), true);
    assert.equal(leadTerbengkalai({ status: "dikonfirmasi", dibuat }, new Date("2026-10-20T00:00:00Z")), false);
  });
});

describe("awalHariWib", () => {
  it("pukul 00.00 WIB = 17.00 UTC hari sebelumnya", () => {
    // 17 Okt 01.00 WIB
    assert.equal(awalHariWib(new Date("2026-10-16T18:00:00Z")).toISOString(), "2026-10-16T17:00:00.000Z");
    // 17 Okt 23.30 WIB
    assert.equal(awalHariWib(new Date("2026-10-17T16:30:00Z")).toISOString(), "2026-10-16T17:00:00.000Z");
    // 18 Okt 00.10 WIB
    assert.equal(awalHariWib(new Date("2026-10-17T17:10:00Z")).toISOString(), "2026-10-17T17:00:00.000Z");
  });
});

describe("umur", () => {
  const t = new Date("2026-10-17T10:00:00Z");
  const lalu = (menit: number) => new Date(t.getTime() - menit * 60_000);
  it("menit, jam, hari", () => {
    assert.equal(umur(lalu(0), t), "baru saja");
    assert.equal(umur(lalu(45), t), "45 menit lalu");
    assert.equal(umur(lalu(150), t), "2 jam lalu");
    assert.equal(umur(lalu(60 * 50), t), "2 hari lalu");
  });
});

describe("isiEmailOrderBaru", () => {
  it("subjek ringkas; isi lengkap dengan link admin", () => {
    const e = isiEmailOrderBaru(
      {
        kode: "WEB-NR7W",
        nama: "Budi",
        noWa: "6281234567890",
        alamat: "Jl. Mawar 1",
        catatan: "Kirim sore",
        total: 2_798_000,
        dibuat: new Date("2026-10-17T07:05:00Z"),
        items: [{ namaProduk: "Adidas Samba OG", size: "43", jumlah: 2, hargaSatuan: 1_399_000 }],
      },
      "https://argashoes.vercel.app/admin/order/WEB-NR7W",
    );
    assert.equal(e.subjek, "Order baru WEB-NR7W: 2 pasang, Rp 2.798.000");
    assert.match(e.teks, /2x Adidas Samba OG, size 43, Rp 1\.399\.000/);
    assert.match(e.teks, /WhatsApp: \+6281234567890/);
    assert.match(e.teks, /Catatan: Kirim sore/);
    assert.match(e.teks, /Waktu: 17 Okt 2026, 14\.05 WIB/);
    assert.match(e.teks, /Buka di admin: https:\/\/argashoes\.vercel\.app\/admin\/order\/WEB-NR7W$/);
  });
});

describe("kirimEmail", () => {
  it("tanpa API key atau penerima: dilewati, tidak memanggil fetch", async () => {
    const { kirimEmail } = await import("@/lib/notifikasi/email");
    let dipanggil = 0;
    const palsu = (async () => {
      dipanggil++;
      return new Response("{}");
    }) as typeof fetch;
    assert.equal(await kirimEmail({ ke: ["a@b.com"], subjek: "s", teks: "t" }, { apiKey: "", fetch: palsu }), "dilewati");
    assert.equal(await kirimEmail({ ke: [], subjek: "s", teks: "t" }, { apiKey: "k", fetch: palsu }), "dilewati");
    assert.equal(dipanggil, 0);
  });

  it("mengirim ke Resend; respons gagal atau error jaringan jadi 'gagal', bukan exception", async () => {
    const { kirimEmail } = await import("@/lib/notifikasi/email");
    let diminta: { url: string; init?: RequestInit } | undefined;
    const ok = (async (url: string, init?: RequestInit) => {
      diminta = { url, init };
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    assert.equal(await kirimEmail({ ke: ["p@contoh.com"], subjek: "Order baru", teks: "isi" }, { apiKey: "rk", pengirim: "A <a@b.com>", fetch: ok }), "terkirim");
    assert.equal(diminta?.url, "https://api.resend.com/emails");
    assert.deepEqual(JSON.parse(String(diminta?.init?.body)), { from: "A <a@b.com>", to: ["p@contoh.com"], subject: "Order baru", text: "isi" });
    assert.equal((diminta?.init?.headers as Record<string, string>).Authorization, "Bearer rk");

    const tolak = (async () => new Response("bad", { status: 422 })) as typeof fetch;
    const putus = (async () => {
      throw new Error("jaringan");
    }) as typeof fetch;
    const errAsli = console.error;
    console.error = () => {};
    try {
      assert.equal(await kirimEmail({ ke: ["p@contoh.com"], subjek: "s", teks: "t" }, { apiKey: "rk", fetch: tolak }), "gagal");
      assert.equal(await kirimEmail({ ke: ["p@contoh.com"], subjek: "s", teks: "t" }, { apiKey: "rk", fetch: putus }), "gagal");
    } finally {
      console.error = errAsli;
    }
  });
});
