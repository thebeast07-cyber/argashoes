import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rapikanHurufBesar } from "@/lib/domain/teks";

describe("rapikanHurufBesar", () => {
  it("nama huruf besar semua dari Production", () => {
    assert.equal(rapikanHurufBesar("NIKE INITIATOR METALIC BLUE/SILVER/OBSIDIAN"), "Nike Initiator Metalic Blue/Silver/Obsidian");
    assert.equal(rapikanHurufBesar("NIKE AIR MAX 90 VALENTINE DAY"), "Nike Air Max 90 Valentine Day");
    assert.equal(rapikanHurufBesar("NIKE COURT VISION BLACK WHITE"), "Nike Court Vision Black White");
  });

  it("kode berangka dan singkatan sepatu tetap huruf besar", () => {
    assert.equal(rapikanHurufBesar("ADIDAS SAMBA OG CLOUD WHITE"), "Adidas Samba OG Cloud White");
    assert.equal(rapikanHurufBesar("AIR FORCE 1 '07 LV8"), "Air Force 1 '07 LV8");
    assert.equal(rapikanHurufBesar("NIKE SB DUNK LOW PRO"), "Nike SB Dunk Low Pro");
    assert.equal(rapikanHurufBesar("NMD_R1 GTX"), "NMD_R1 GTX");
    assert.equal(rapikanHurufBesar("MEN'S SHOES  DH2987-001"), "Men's Shoes DH2987-001");
  });

  it("isian dengan huruf kecil dibiarkan", () => {
    assert.equal(rapikanHurufBesar("Air Force 1 '07 White"), "Air Force 1 '07 White");
    assert.equal(rapikanHurufBesar("iPhone CASE"), "iPhone CASE");
    assert.equal(rapikanHurufBesar("990 v6"), "990 v6");
    assert.equal(rapikanHurufBesar("  "), "");
  });
});
