import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bisaTransisi,
  STATUS_ORDER,
  transisiStatus,
  type OrderUntukTransisi,
  type StatusOrder,
} from "@/lib/domain/order-status";

const WAKTU = new Date("2026-10-16T03:00:00Z");
const order = (o: Partial<OrderUntukTransisi> = {}): OrderUntukTransisi => ({
  status: "lead",
  resiNomor: null,
  dikirimPada: null,
  ...o,
});

describe("bisaTransisi", () => {
  const DIIZINKAN: [StatusOrder, StatusOrder][] = [
    ["lead", "dikonfirmasi"],
    ["lead", "batal"],
    ["dikonfirmasi", "dikirim"],
    ["dikonfirmasi", "batal"],
    ["dikirim", "selesai"],
  ];

  it("hanya transisi yang ada di tabel yang diizinkan", () => {
    for (const dari of STATUS_ORDER) {
      for (const ke of STATUS_ORDER) {
        const harap = DIIZINKAN.some(([d, k]) => d === dari && k === ke);
        assert.equal(bisaTransisi(dari, ke), harap, `${dari} -> ${ke}`);
      }
    }
  });

  it("tidak ada jalan kembali ke lead, dan selesai/batal adalah status akhir", () => {
    for (const dari of STATUS_ORDER) assert.equal(bisaTransisi(dari, "lead"), false);
    for (const ke of STATUS_ORDER) {
      assert.equal(bisaTransisi("selesai", ke), false);
      assert.equal(bisaTransisi("batal", ke), false);
    }
  });
});

describe("transisiStatus", () => {
  it("lead ke dikonfirmasi menghasilkan perubahan dan event", () => {
    const hasil = transisiStatus({ order: order(), ke: "dikonfirmasi", waktu: WAKTU });
    assert.deepEqual(hasil, {
      ok: true,
      perubahan: { status: "dikonfirmasi", resiNomor: null, dikirimPada: null },
      event: { dariStatus: "lead", keStatus: "dikonfirmasi", waktu: WAKTU, catatan: null },
    });
  });

  it("batal wajib alasan; alasan dirapikan dan ikut tercatat di event", () => {
    assert.deepEqual(transisiStatus({ order: order(), ke: "batal", waktu: WAKTU }), { ok: false, error: "ALASAN_WAJIB" });
    assert.deepEqual(transisiStatus({ order: order(), ke: "batal", alasanBatal: "   ", waktu: WAKTU }), { ok: false, error: "ALASAN_WAJIB" });
    const hasil = transisiStatus({ order: order(), ke: "batal", alasanBatal: "  Stok   habis ", waktu: WAKTU });
    assert.deepEqual(hasil, {
      ok: true,
      perubahan: { status: "batal", resiNomor: null, dikirimPada: null, alasanBatal: "Stok habis" },
      event: { dariStatus: "lead", keStatus: "batal", waktu: WAKTU, catatan: "Stok habis" },
    });
  });

  it("menolak status yang sama", () => {
    assert.deepEqual(transisiStatus({ order: order(), ke: "lead", waktu: WAKTU }), { ok: false, error: "STATUS_SAMA" });
  });

  it("menolak transisi yang tidak diizinkan", () => {
    assert.deepEqual(transisiStatus({ order: order(), ke: "dikirim", resiNomor: "JNE1", waktu: WAKTU }), {
      ok: false,
      error: "TRANSISI_TIDAK_VALID",
    });
    assert.deepEqual(transisiStatus({ order: order({ status: "batal" }), ke: "dikonfirmasi", waktu: WAKTU }), {
      ok: false,
      error: "TRANSISI_TIDAK_VALID",
    });
  });

  it("Dikirim tidak bisa tanpa nomor resi", () => {
    const o = order({ status: "dikonfirmasi" });
    for (const resiNomor of [undefined, null, "", "   "]) {
      assert.deepEqual(transisiStatus({ order: o, ke: "dikirim", resiNomor, waktu: WAKTU }), {
        ok: false,
        error: "RESI_WAJIB",
      });
    }
  });

  it("Dikirim menyimpan resi (dirapikan) dan mencatat dikirimPada", () => {
    const hasil = transisiStatus({ order: order({ status: "dikonfirmasi" }), ke: "dikirim", resiNomor: " JNE123 ", waktu: WAKTU });
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.perubahan, { status: "dikirim", resiNomor: "JNE123", dikirimPada: WAKTU });
  });

  it("resi yang sudah tersimpan di order boleh dipakai", () => {
    const hasil = transisiStatus({ order: order({ status: "dikonfirmasi", resiNomor: "SICEPAT9" }), ke: "dikirim", waktu: WAKTU });
    assert.ok(hasil.ok);
    assert.equal(hasil.perubahan.resiNomor, "SICEPAT9");
  });

  it("Selesai tidak mengubah dikirimPada, supaya periode fee tetap", () => {
    const dikirimPada = new Date("2026-09-30T10:00:00Z");
    const hasil = transisiStatus({
      order: order({ status: "dikirim", resiNomor: "JNE1", dikirimPada }),
      ke: "selesai",
      waktu: WAKTU,
    });
    assert.ok(hasil.ok);
    assert.deepEqual(hasil.perubahan, { status: "selesai", resiNomor: "JNE1", dikirimPada });
  });
});
