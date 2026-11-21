import { describe, expect, it } from "vitest";
import { DersDiziniSemasi, KonuDosyasiSemasi, UniteSorulariSemasi, kimlikYap, paketDosyalari } from "./sema";

describe("ders paketi şeması", () => {
  it("builds paths in one place", () => {
    expect(paketDosyalari.konu("ataturk-aof", "sosyolojiye-giris", "1.3.2")).toBe("/ders/ataturk-aof/sosyolojiye-giris/konu/1.3.2.json");
    expect(paketDosyalari.unite("ataturk-aof", "sosyolojiye-giris", 2)).toBe("/ders/ataturk-aof/sosyolojiye-giris/unite/2.json");
  });
  it("slugs Turkish terms", () => {
    expect(kimlikYap("Toplumsal Yapı ve Değişme")).toBe("toplumsal-yapi-ve-degisme");
    expect(kimlikYap("İçgüdü")).toBe("icgudu");
  });
  it("accepts a minimal index, topic and unit file", () => {
    expect(() =>
      DersDiziniSemasi.parse({
        v: 1, uni: "ataturk-aof", ders: "sosyolojiye-giris", ad: "Sosyolojiye Giriş", surum: "abc", uretim: "2026-11-21",
        uniteler: [{ no: 1, baslik: "Sosyolojinin Doğuşu", konular: ["1.1"], soruSayisi: 1 }],
        konular: [{ id: "1.1", no: "1.1", baslik: "Giriş", unite: 1, soruSayisi: 1, kavramSayisi: 0, calismaVar: false, medyaAnlari: [{ medya: "kisa", bas: 12, bit: 40 }] }],
        medyalar: [{ id: "kisa", tur: "youtube", cesit: "kisa-ozet", baslik: "Vize özeti", kaynak: "1CsJ2AeNWws", sure: 1800, dokum: "medya/kisa.json" }],
        dosyalar: [{ yol: "konu/1.1.json", boyut: 100 }],
      }),
    ).not.toThrow();
    expect(() =>
      KonuDosyasiSemasi.parse({ v: 1, id: "1.1", no: "1.1", baslik: "Giriş", unite: 1, onceki: null, sonraki: "1.2", kitap: { html: "<p>x</p>" }, kavramlar: [], sorular: ["9"], medyaAnlari: [], baglantilar: [] }),
    ).not.toThrow();
    const u = UniteSorulariSemasi.parse({ v: 1, unite: 1, sorular: [{ id: 9, unitNumber: 1, text: "Soru?", options: ["a", "b"], correctAnswer: "a", konu: "1.1" }] });
    expect(u.sorular[0]).toMatchObject({ id: "9", konu: "1.1", correctAnswer: "A" });
  });
});
