import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { urlDatabase, urlDatabaseMigrasi } from "@/db/url";

describe("urlDatabase", () => {
  it("DATABASE_URL dulu, lalu POSTGRES_URL, lalu nama berprefix", () => {
    assert.deepEqual(urlDatabase({ DATABASE_URL: "a", POSTGRES_URL: "b" }), { nama: "DATABASE_URL", url: "a" });
    assert.deepEqual(urlDatabase({ POSTGRES_URL: "b" }), { nama: "POSTGRES_URL", url: "b" });
    assert.deepEqual(urlDatabase({ STORAGE_DATABASE_URL: "c", HOME: "/x" }), { nama: "STORAGE_DATABASE_URL", url: "c" });
    assert.deepEqual(urlDatabase({ NEON_POSTGRES_URL: "d" }), { nama: "NEON_POSTGRES_URL", url: "d" });
    assert.equal(urlDatabase({ DATABASE_URL: "", HOME: "/x" }), null);
  });

  it("migrasi memilih alamat tanpa pooler kalau ada", () => {
    assert.deepEqual(urlDatabaseMigrasi({ DATABASE_URL: "a", DATABASE_URL_UNPOOLED: "u" }), { nama: "DATABASE_URL_UNPOOLED", url: "u" });
    assert.deepEqual(urlDatabaseMigrasi({ STORAGE_DATABASE_URL: "a", STORAGE_DATABASE_URL_UNPOOLED: "u" }), { nama: "STORAGE_DATABASE_URL_UNPOOLED", url: "u" });
    assert.deepEqual(urlDatabaseMigrasi({ DATABASE_URL: "a" }), { nama: "DATABASE_URL", url: "a" });
  });
});
