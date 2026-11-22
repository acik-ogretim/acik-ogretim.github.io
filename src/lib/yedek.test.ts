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
  it("cihaza özel Google eşitleme durumunu dışarıda bırakır", () => {
    const d = new Bellek();
    d.setItem("google-esitleme-acik", "1");
    d.setItem("google-esitleme-son", "123");
    d.setItem("cevaplar-auzef-anatomi", "{}");
    expect(Object.keys(topla(d as unknown as Storage).kayitlar)).toEqual(["cevaplar-auzef-anatomi"]);
    const b = new Bellek();
    yukle({ surum: 1, tarih: "", kayitlar: { "google-esitleme-acik": "1", theme: "dark" } }, b as unknown as Storage);
    expect(b.getItem("google-esitleme-acik")).toBeNull();
  });
  it("kaldığın yeri ve cevapları birleştirirken yeni olanı tutar", () => {
    const y = (sira: number, zaman: number) => ({ yol: "/u/b/d", ad: "D", soru: "q", unite: 1, sira, uniteToplam: 9, kip: "okuma", zaman });
    const yerel = JSON.stringify({ surum: 2, dersler: { "u/d": y(2, 5) } });
    const gelen = JSON.stringify({ surum: 2, dersler: { "u/d": y(7, 9), "u/e": y(1, 1) } });
    const m = JSON.parse(birlestir("kaldigin-yer", yerel, gelen));
    expect(m.dersler["u/d"].sira).toBe(7);
    expect(Object.keys(m.dersler)).toEqual(["u/d", "u/e"]);
    const c = (secim: string, zaman: number) => JSON.stringify({ surum: 1, cevaplar: { q: { secim, dogru: secim === "A", zaman } } });
    expect(JSON.parse(birlestir("cevaplar-u-d", c("A", 9), c("B", 3))).cevaplar.q.secim).toBe("A");
    expect(JSON.parse(birlestir("soru-siralama", '{"u/d":"cikma"}', '{"u/e":"yeni"}'))).toEqual({ "u/d": "cikma", "u/e": "yeni" });
  });
});

describe("üç yollu eşitleme (silinen geri gelmez)", () => {
  const yedek = (kayitlar: Record<string, string>) => ({ surum: 1 as const, tarih: "", kayitlar });
  const depo = (kayitlar: Record<string, string>) => {
    const d = new Bellek();
    for (const [k, v] of Object.entries(kayitlar)) d.setItem(k, v);
    return d as unknown as Storage;
  };

  it("bu cihazda silinen anahtar, uzak kopya değişmediyse geri gelmez", () => {
    const taban = yedek({ "favorite-x": '["a"]', "soru-siralama": '{"x":1}' });
    const d = depo({ "soru-siralama": '{"x":1}' }); // favorite-x deleted here
    yukle(taban, d, taban);
    expect(d.getItem("favorite-x")).toBeNull();
  });

  it("öteki cihazda silinen anahtar burada da silinir", () => {
    const taban = yedek({ "favorite-x": '["a"]' });
    const d = depo({ "favorite-x": '["a"]' });
    yukle(yedek({}), d, taban);
    expect(d.getItem("favorite-x")).toBeNull();
  });

  it("listeden silinen öğe, öteki cihaz başka öğe eklese de geri gelmez", () => {
    const taban = yedek({ "favorite-x": '["a","b"]' });
    const d = depo({ "favorite-x": '["a"]' }); // b removed here
    yukle(yedek({ "favorite-x": '["a","b","c"]' }), d, taban); // c added there
    expect(JSON.parse(d.getItem("favorite-x") ?? "[]")).toEqual(["a", "c"]);
  });

  it("nesnede silinen kayıt geri gelmez, öteki cihazın yenisi eklenir", () => {
    const taban = yedek({ "cevaplar-u-d": '{"s1":{"zaman":1},"s2":{"zaman":1}}' });
    const d = depo({ "cevaplar-u-d": '{"s1":{"zaman":1}}' }); // s2 cleared here
    yukle(yedek({ "cevaplar-u-d": '{"s1":{"zaman":1},"s2":{"zaman":1},"s3":{"zaman":5}}' }), d, taban);
    expect(Object.keys(JSON.parse(d.getItem("cevaplar-u-d") ?? "{}")).sort()).toEqual(["s1", "s3"]);
  });

  it("taban yoksa eski davranış: yalnız ekler", () => {
    const d = depo({});
    yukle(yedek({ "favorite-x": '["a"]' }), d);
    expect(d.getItem("favorite-x")).toBe('["a"]');
  });
});
