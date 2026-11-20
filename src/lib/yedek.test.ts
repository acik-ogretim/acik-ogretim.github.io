import { describe, expect, it } from "vitest";
import { birlestir, topla, yukle } from "./yedek";

class Bellek {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

describe("yedek", () => {
  it("alt çubuk düzenini taşır", () => {
    const d = new Bellek();
    d.setItem("cubuk-duzeni", '{"v":1,"ids":["geri","ileri"]}');
    expect(JSON.stringify(topla(d))).toContain("cubuk-duzeni");
  });

  it("API anahtarını dışarıda bırakır", () => {
    const d = new Bellek();
    d.setItem("gemini-api-key", "gizli");
    d.setItem("quiz-progress-ata/psikoloji", "{}");
    expect(Object.keys(topla(d as unknown as Storage).kayitlar)).toEqual(["quiz-progress-ata/psikoloji"]);
  });
  it("çözüm kaydını ve favorileri birleştirir", () => {
    expect(JSON.parse(birlestir("quiz-progress-x", '{"a":[true]}', '{"a":[false],"b":[true]}'))).toEqual({ a: [true, false], b: [true] });
    expect(JSON.parse(birlestir("favorite-courses", '["x"]', '["x","y"]'))).toEqual(["x", "y"]);
  });
  it("yedeği başka cihaza yükler", () => {
    const a = new Bellek();
    a.setItem("theme", "dark");
    const b = new Bellek();
    expect(yukle(topla(a as unknown as Storage), b as unknown as Storage)).toBe(1);
    expect(b.getItem("theme")).toBe("dark");
  });
});
