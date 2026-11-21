import { yildizAnahtari, yildizAyristir, yildizlariBirlestir } from "./yildiz";
import { describe, expect, it } from "vitest";
import { kavramMotoru } from "./kavram";
import { satirBul } from "./sema";
import { demirBul, demirle, vurgulariBirlestir, vurgulariOku } from "./vurgu";

describe("satirBul", () => {
  const s = [{ bas: 0 }, { bas: 10 }, { bas: 25 }];
  it("finds the playing line", () => {
    expect(satirBul(s, 0)).toBe(0);
    expect(satirBul(s, 24.9)).toBe(1);
    expect(satirBul(s, 99)).toBe(2);
    expect(satirBul(s, -1)).toBe(-1);
  });
});

describe("kavramMotoru", () => {
  const m = kavramMotoru([
    { terim: "Hukuk kuralı", tanim: "x", konu: "1.1", kaynak: "etkinlik" },
    { terim: "Devlet", tanim: "y", konu: "1.2", kaynak: "kitap" },
  ]);
  it("matches inflected forms with Turkish casing", () => {
    const metin = "HUKUK KURALLARININ yaptırımı DEVLET eliyle";
    const e = m.eslestir(metin);
    expect(e.map((x) => metin.slice(x.bas, x.son))).toEqual(["HUKUK KURALLARININ", "DEVLET"]);
  });
  it("ignores partial words", () => {
    expect(m.eslestir("Kamu devletçilik")).toHaveLength(0);
    expect(m.eslestir("ödevlet")).toHaveLength(0);
  });
  it("matches one-word terms only as whole words", () => {
    const k = kavramMotoru([{ terim: "Hukuk", tanim: "x", konu: "1.1", kaynak: "etkinlik" }]);
    expect(k.eslestir("Hukukun Temel Kavramları, hukuki işlem")).toHaveLength(0);
    expect(k.eslestir("Hukuk ve hukuklar")).toHaveLength(2);
  });
});

describe("vurgu", () => {
  it("anchors by context", () => {
    const tam = "kanun yürürlüğe girer. sonra kanun iptal edilir.";
    const a = demirle(tam, 28, 33);
    expect(demirBul(tam, a)).toEqual([28, 33]);
  });
  it("skips invalid stored items and merges by id", () => {
    const depo = { getItem: () => JSON.stringify([{ id: "a" }, { id: "b", hedef: "s1", konu: null, exact: "x", prefix: "", suffix: "", sn: null, zaman: 1 }]) };
    expect(vurgulariOku("d", depo)).toHaveLength(1);
    const v = (id: string, z: number) => ({ id, hedef: "s1", konu: null, exact: "x", prefix: "", suffix: "", sn: null, zaman: z });
    const b = JSON.parse(vurgulariBirlestir(JSON.stringify([v("a", 1)]), JSON.stringify([v("a", 2), v("b", 1)])));
    expect(b).toHaveLength(2);
  });
});

describe("yıldızlı kavramlar", () => {
  const y = (terim: string, konu: string, zaman: number) => ({ terim, konu, zaman });
  it("parses valid items only and keys by anahtar", () => {
    expect(yildizAnahtari("ataturk-aof", "psikoloji")).toBe("yildizli-kavramlar-ataturk-aof-psikoloji");
    expect(yildizAyristir(JSON.stringify([y("Hukuk", "1.1", 1), { terim: "x" }, "z"]))).toHaveLength(1);
    expect(yildizAyristir("bozuk")).toEqual([]);
  });
  it("merges by concept, later wins", () => {
    const b = JSON.parse(yildizlariBirlestir(JSON.stringify([y("Hukuk", "1.1", 1)]), JSON.stringify([y("Hukuk", "1.1", 5), y("Devlet", "2.1", 2)])));
    expect(b).toHaveLength(2);
    expect(b.find((x: { terim: string }) => x.terim === "Hukuk").zaman).toBe(5);
  });
});
