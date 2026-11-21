import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calismaCoz, calismaDolu } from "./calisma";
import { KonuSemasi } from "./sema";
import { dersiParcala, uniteOku } from "./parcala";

const kok = "tests/fixtures/konu-fikstur/ataturk-aof/fikstur-ders/kitap";
const etkinlik = JSON.parse(readFileSync(`${kok}/etkinlik/unite-01.json`, "utf8")) as unknown;

describe("calismaCoz", () => {
  it("reads the fixture keyed by topic number and normalises answers to strings", () => {
    const m = calismaCoz(etkinlik);
    const c = m.get("1.1");
    expect(c?.miniTest).toHaveLength(3);
    expect(c?.miniTest?.[1].cevap).toBe("false");
    expect(c?.kavramlar?.[0].terim).toBe("Toplumsal norm");
    expect(m.has("1.2")).toBe(false);
  });
  it("accepts the wrapped form and k- prefixed keys", () => {
    expect(calismaCoz({ konular: { "k-2.1": { ozet: "Kısa özet." } } }).get("2.1")?.ozet).toBe("Kısa özet.");
  });
  it("skips invalid and empty records without throwing", () => {
    const m = calismaCoz({ "1.1": { miniTest: [{ tur: "bilinmeyen" }] }, "1.2": {}, "1.3": { ozet: "  " }, "1.4": 5 });
    expect(m.size).toBe(0);
    expect(calismaCoz(null).size).toBe(0);
    expect(calismaDolu({})).toBe(false);
  });
});

describe("fixture topic file", () => {
  it("passes the drawer schema with calisma attached", () => {
    const u = uniteOku(readFileSync(`${kok}/unite-01.mdx`, "utf8"));
    const { konular } = dersiParcala([u], "ataturk-aof", "fikstur-ders");
    const calisma = calismaCoz(etkinlik).get("1.1");
    const dosya = { ...konular[0], calisma };
    const p = KonuSemasi.safeParse(JSON.parse(JSON.stringify(dosya)));
    expect(p.success).toBe(true);
    expect(KonuSemasi.safeParse(JSON.parse(JSON.stringify(konular[1]))).success).toBe(true);
    expect(konular[0].kavramlar).toContain("Toplumsal norm");
  });
});
