import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenBlob } from "@/lib/foto/token-blob";

describe("tokenBlob", () => {
  it("BLOB_READ_WRITE_TOKEN dulu, lalu nama berprefix", () => {
    assert.deepEqual(tokenBlob({ BLOB_READ_WRITE_TOKEN: "a", STORAGE_READ_WRITE_TOKEN: "vercel_blob_rw_b" }), {
      nama: "BLOB_READ_WRITE_TOKEN",
      token: "a",
    });
    assert.deepEqual(tokenBlob({ STORAGE_READ_WRITE_TOKEN: "vercel_blob_rw_b", HOME: "/x" }), {
      nama: "STORAGE_READ_WRITE_TOKEN",
      token: "vercel_blob_rw_b",
    });
  });

  it("mengabaikan token lain yang bukan token Blob", () => {
    assert.equal(tokenBlob({ GITHUB_READ_WRITE_TOKEN: "ghp_x", BLOB_READ_WRITE_TOKEN: "" }), null);
  });
});
