import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kredensialBlob } from "@/lib/foto/kredensial-blob";

describe("kredensialBlob", () => {
  it("token read-write dulu, termasuk nama berprefix", () => {
    assert.deepEqual(kredensialBlob({ BLOB_READ_WRITE_TOKEN: "a", BLOB_STORE_ID: "store_x" }), {
      nama: "BLOB_READ_WRITE_TOKEN",
      opsi: { token: "a" },
    });
    assert.deepEqual(kredensialBlob({ STORAGE_READ_WRITE_TOKEN: "vercel_blob_rw_b", HOME: "/x" }), {
      nama: "STORAGE_READ_WRITE_TOKEN",
      opsi: { token: "vercel_blob_rw_b" },
    });
  });

  it("tanpa token, pakai ID store (login OIDC)", () => {
    assert.deepEqual(kredensialBlob({ BLOB_STORE_ID: "store_x" }), { nama: "BLOB_STORE_ID", opsi: { storeId: "store_x" } });
    assert.deepEqual(kredensialBlob({ STORAGE_STORE_ID: "store_y" }), { nama: "STORAGE_STORE_ID", opsi: { storeId: "store_y" } });
  });

  it("mengabaikan env lain yang bukan milik Blob", () => {
    assert.equal(kredensialBlob({ GITHUB_READ_WRITE_TOKEN: "ghp_x", REDIS_STORE_ID: "123", BLOB_READ_WRITE_TOKEN: "" }), null);
  });
});
