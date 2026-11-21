import { describe, expect, it } from "vitest";
import {
  cevaplarAyristir,
  cevaplarMetni,
  cevaplariAyir,
  cevaplariBirlestir,
  dersAnahtari,
  devamBaglantisi,
  eskiKaydiTasi,
  ilerlemeyiTasi,
  kaldiginYerAyristir,
  kaliciAnahtarlar,
  say,
  sonCalisilanlar,
  yerMetni,
  yerleriBirlestir,
  type Yer,
} from "./calisma-durumu";

const yer = (extra: Partial<Yer> = {}): Yer => ({
  yol: "/auzef/cocuk-gelisimi/anatomi",
  ad: "Anatomi",
  soru: "q-12",
  unite: 4,
  sira: 12,
  uniteToplam: 40,
  kip: "okuma",
  zaman: 10,
  ...extra,
});

describe("keys", () => {
  it("course key leaves the department out", () => {
    expect(dersAnahtari("/auzef/cocuk-gelisimi/anatomi")).toBe("auzef/anatomi");
    expect(dersAnahtari("/auzef/cocuk-gelisimi")).toBeNull();
    expect(dersAnahtari("https://x/a/b/c")).toBeNull();
  });
  it("persistent keys tell duplicate ids apart", () => {
    expect(kaliciAnahtarlar(["a", "b", "a", "a"])).toEqual(["a", "b", "a#2", "a#3"]);
  });
});

describe("kaldigin-yer", () => {
  it("keeps one entry per course and drops broken ones", () => {
    const ham = JSON.stringify({
      surum: 2,
      dersler: {
        "auzef/anatomi": yer(),
        "auzef/fizyoloji": yer({ yol: "/auzef/cocuk-gelisimi/fizyoloji", zaman: 20 }),
        "auzef/bozuk": { ...yer(), yol: "https://kotu.example/a/b/c" },
        "kotu anahtar": yer(),
      },
    });
    const k = kaldiginYerAyristir(ham);
    expect(Object.keys(k.dersler).sort()).toEqual(["auzef/anatomi", "auzef/fizyoloji"]);
    expect(sonCalisilanlar(k)[0][0]).toBe("auzef/fizyoloji");
  });
  it("moves the old son-calisma record", () => {
    const eski = JSON.stringify({ yol: "/auzef/x/y", ad: "Ders", hedef: "question-4-11", unite: 4, sira: 12, uniteToplam: 40, zaman: 1 });
    expect(eskiKaydiTasi(eski)).toEqual({
      ders: "auzef/y",
      yer: { yol: "/auzef/x/y", ad: "Ders", soru: "", eskiHedef: "question-4-11", unite: 4, sira: 12, uniteToplam: 40, kip: "okuma", zaman: 1 },
    });
    expect(Object.keys(kaldiginYerAyristir(null, eski).dersler)).toEqual(["auzef/y"]);
    expect(eskiKaydiTasi(JSON.stringify({ yol: "/auzef/x/y", ad: "D", hedef: 'x"><img', unite: 1, sira: 1, uniteToplam: 1, zaman: 1 }))).toBeNull();
    expect(eskiKaydiTasi("{")).toBeNull();
  });
  it("a new record wins over the old one", () => {
    const yeni = JSON.stringify({ surum: 2, dersler: { "auzef/anatomi": yer() } });
    const eski = JSON.stringify({ yol: "/auzef/x/y", ad: "Ders", hedef: "question-4-11", unite: 4, sira: 12, uniteToplam: 40, zaman: 1 });
    expect(Object.keys(kaldiginYerAyristir(yeni, eski).dersler)).toEqual(["auzef/anatomi"]);
  });
  it("builds the resume link and the label", () => {
    expect(devamBaglantisi(yer())).toBe("/auzef/cocuk-gelisimi/anatomi#kaldigin-yer");
    expect(devamBaglantisi(yer({ bolum: "isletme" }))).toBe("/auzef/cocuk-gelisimi/anatomi?bolum=isletme#kaldigin-yer");
    expect(yerMetni(yer())).toBe("Ünite 4 · Soru 12 / 40");
    expect(yerMetni(yer({ unite: 0 }))).toBe("Diğer sorular · Soru 12 / 40");
  });
  it("backup merge keeps the later position per course", () => {
    const a = JSON.stringify({ surum: 2, dersler: { "u/a": yer({ zaman: 5 }), "u/b": yer({ zaman: 9 }) } });
    const b = JSON.stringify({ surum: 2, dersler: { "u/a": yer({ zaman: 7, sira: 3 }), "u/b": yer({ zaman: 1, sira: 1 }) } });
    const m = kaldiginYerAyristir(yerleriBirlestir(a, b)).dersler;
    expect(m["u/a"].sira).toBe(3);
    expect(m["u/b"].zaman).toBe(9);
  });
});

describe("answers", () => {
  const c = {
    q1: { secim: "A" as const, dogru: true, zaman: 1 },
    q2: { secim: "B" as const, dogru: false, zaman: 2 },
    q3: { secim: null, dogru: false, zaman: 3 },
  };
  it("round trips and drops invalid entries", () => {
    const ham = JSON.stringify({ surum: 1, cevaplar: { ...c, kotu: { secim: "Z", dogru: true, zaman: 1 } } });
    expect(cevaplarAyristir(ham)).toEqual(c);
    expect(cevaplarAyristir(cevaplarMetni(c))).toEqual(c);
    expect(cevaplarAyristir(JSON.stringify({ surum: 9, cevaplar: c }))).toEqual({});
    expect(cevaplarAyristir("{")).toEqual({});
  });
  it("counts right, wrong and revealed", () => {
    expect(say(c)).toEqual({ dogru: 1, yanlis: 1, gosterilen: 1, oran: 50 });
    expect(say({})).toEqual({ dogru: 0, yanlis: 0, gosterilen: 0, oran: 0 });
  });
  it("splits a unit out for clearing and undo", () => {
    const { kalan, silinen } = cevaplariAyir(c, new Set(["q1", "q3"]));
    expect(Object.keys(kalan)).toEqual(["q2"]);
    expect(Object.keys(silinen)).toEqual(["q1", "q3"]);
    expect(cevaplariAyir(c, null).kalan).toEqual({});
  });
  it("backup merge keeps the later answer per question", () => {
    const yerel = cevaplarMetni({ q1: { secim: "A", dogru: true, zaman: 5 } });
    const gelen = cevaplarMetni({ q1: { secim: "C", dogru: false, zaman: 2 }, q9: { secim: "D", dogru: true, zaman: 1 } });
    expect(cevaplarAyristir(cevaplariBirlestir(yerel, gelen))).toEqual({
      q1: { secim: "A", dogru: true, zaman: 5 },
      q9: { secim: "D", dogru: true, zaman: 1 },
    });
  });
});

describe("ilerlemeyiTasi", () => {
  it("moves DOM id keys to persistent keys and merges results", () => {
    const eslesme = new Map([
      ["question-1-0", "q-a"],
      ["question-1-1", "q-b"],
    ]);
    const { veri, degisti } = ilerlemeyiTasi(
      { "question-1-0": [false], "question-1-1": [true, true], "q-a": [true], "question-9-9": [false], "q-c": "kotu" },
      eslesme,
    );
    expect(degisti).toBe(true);
    expect(veri).toEqual({ "q-a": [false, true], "q-b": [true, true], "question-9-9": [false], "q-c": [] });
  });
  it("reports no change when nothing is old", () => {
    expect(ilerlemeyiTasi({ "q-a": [true] }, new Map()).degisti).toBe(false);
  });
});
