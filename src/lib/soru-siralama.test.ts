import { describe, expect, it } from "vitest";
import {
  bolumKarsilastir,
  kitapSirala,
  sinavDegeri,
  sirala,
  siralamaOku,
  siralamaYaz,
  type SiralanacakSoru,
} from "./soru-siralama";

const s = (anahtar: string, unitNumber: number, sira: number, sinavlar: string[] = []): SiralanacakSoru => ({ anahtar, unitNumber, sira, sinavlar });

describe("bolumKarsilastir", () => {
  it("compares topic numbers part by part, not as text", () => {
    const liste = ["1.10", "1.7.4", "1.2", "1.7", "2.1", undefined, "1.2.1"];
    const sirali = [...liste].sort(bolumKarsilastir);
    expect(sirali).toEqual(["1.2", "1.2.1", "1.7", "1.7.4", "1.10", "2.1", undefined]);
  });
  it("treats equal numbers and two missing topics as ties", () => {
    expect(bolumKarsilastir("3.4", "3.4")).toBe(0);
    expect(bolumKarsilastir(undefined, "")).toBe(0);
  });
});

describe("kitapSirala", () => {
  it("orders by topic number and keeps the file order for ties", () => {
    const sonuc = kitapSirala([
      { id: "a", section: "1.10" },
      { id: "b" },
      { id: "c", section: "1.2" },
      { id: "d", section: "1.7.4" },
      { id: "e", section: "1.2" },
    ]).map((x) => x.id);
    expect(sonuc).toEqual(["c", "e", "d", "a", "b"]);
  });
});

describe("sinavDegeri", () => {
  it("puts the year first and the exam kind second", () => {
    expect(sinavDegeri("2024-2025 final")).toBeGreaterThan(sinavDegeri("2024-2025 vize"));
    expect(sinavDegeri("2025-2026 vize")).toBeGreaterThan(sinavDegeri("2024-2025 butunleme"));
    expect(sinavDegeri("2023 genel")).toBe(20230);
    expect(sinavDegeri(" genel")).toBe(0);
  });
});

describe("sirala", () => {
  const sorular = [
    s("u1-a", 1, 0, ["2022 vize"]),
    s("u1-b", 1, 1, ["2020 vize", "2021 final", "2024 final"]),
    s("u1-c", 1, 2),
    s("u1-d", 1, 3, ["2019 final", "2023 vize"]),
    s("u2-a", 2, 4, ["2025 vize"]),
    s("u2-b", 2, 5),
    s("u0-a", 0, 6, ["2018 final"]),
  ];
  const ids = (x: SiralanacakSoru[]) => x.map((q) => q.anahtar);

  it("keeps book order", () => {
    expect(ids(sirala(sorular, "kitap"))).toEqual(ids(sorular));
  });
  it("most asked first, inside each unit", () => {
    expect(ids(sirala(sorular, "cikma"))).toEqual(["u1-b", "u1-d", "u1-a", "u1-c", "u2-a", "u2-b", "u0-a"]);
  });
  it("newest exam first; questions without an exam last", () => {
    expect(ids(sirala(sorular, "yeni"))).toEqual(["u1-b", "u1-d", "u1-a", "u1-c", "u2-a", "u2-b", "u0-a"]);
  });
  it("oldest exam first; questions without an exam last", () => {
    expect(ids(sirala(sorular, "eski"))).toEqual(["u1-d", "u1-b", "u1-a", "u1-c", "u2-a", "u2-b", "u0-a"]);
  });
  it("wrong answers first and unsolved first use the context", () => {
    const yanlis = new Set(["u1-c", "u2-b"]);
    const cozulen = new Set(["u1-a", "u1-c", "u2-a"]);
    const baglam = { yanlis: (k: string) => yanlis.has(k), cozuldu: (k: string) => cozulen.has(k) };
    expect(ids(sirala(sorular, "yanlis", baglam))).toEqual(["u1-c", "u1-a", "u1-b", "u1-d", "u2-b", "u2-a", "u0-a"]);
    expect(ids(sirala(sorular, "cozulmemis", baglam))).toEqual(["u1-b", "u1-d", "u1-a", "u1-c", "u2-b", "u2-a", "u0-a"]);
  });
  it("handles 3000 questions quickly", () => {
    const cok = Array.from({ length: 3000 }, (_, i) => s(`q${i}`, (i % 14) + 1, i, i % 3 ? [`20${10 + (i % 15)} vize`] : []));
    const t = performance.now();
    const sonuc = sirala(cok, "yeni");
    expect(sonuc).toHaveLength(3000);
    expect(performance.now() - t).toBeLessThan(200);
  });
});

describe("stored choice", () => {
  it("reads per course and falls back to book order", () => {
    const ham = siralamaYaz(null, "auzef/anatomi", "cikma");
    expect(siralamaOku(ham, "auzef/anatomi")).toBe("cikma");
    expect(siralamaOku(ham, "auzef/baska")).toBe("kitap");
    expect(siralamaOku("{bozuk", "auzef/anatomi")).toBe("kitap");
    expect(siralamaOku(JSON.stringify({ "auzef/anatomi": "rastgele" }), "auzef/anatomi")).toBe("kitap");
  });
  it("drops the course entry when set back to the default", () => {
    const ham = siralamaYaz(siralamaYaz(null, "a/b", "yeni"), "a/b", "kitap");
    expect(JSON.parse(ham)).toEqual({});
  });
});
