import { describe, expect, it } from "vitest";
import { dersOzetiMetni, ornekSorular, ORNEK_SORU_SAYISI, sinavYillari, soruCapasi } from "./ders-ozeti";
import { questionSchema } from "./schemas";
import type { Question } from "./types";

const soru = (id: string, unite: number, ek: Record<string, unknown> = {}): Question =>
  questionSchema.parse({
    id,
    unitNumber: unite,
    text: `Soru ${id}?`,
    options: ["Bir", "İki", "Üç", "Dört"],
    correctAnswer: "B",
    explanation: "<p>Çünkü <b>iki</b>.</p>",
    ...ek,
  }) as Question;

const sorular = [
  soru("a", 1, { section: "1.2" }),
  soru("b", 1, { section: "1.1", source: "cikmis-soru", sinavlar: [{ year: "2021", examType: "vize" }, { year: "2023", examType: "final" }] }),
  soru("c", 2, { source: "cikmis-soru", year: 2019 }),
  soru("d", 2),
  soru("e", 3),
  soru("f", 3, { text: "" }),
  soru("g", 4),
];

describe("ders özeti", () => {
  it("örnekler en çok sorulandan başlar, mümkünse her üniteden bir tane alır", () => {
    const o = ornekSorular(sorular);
    expect(o).toHaveLength(ORNEK_SORU_SAYISI);
    expect(o[0].id).toBe("b");
    expect(new Set(o.map((q) => q.unitNumber)).size).toBe(ORNEK_SORU_SAYISI);
    expect(o.some((q) => q.id === "f")).toBe(false);
  });

  it("soru bağlantısı sayfadaki kitap sırasını kullanır", () => {
    // Unit 1 in book order: b (1.1), a (1.2)
    expect(soruCapasi(sorular[1], sorular)).toBe("#question-1-0");
    expect(soruCapasi(sorular[0], sorular)).toBe("#question-1-1");
  });

  it("sınav yılları sinavlar ve year alanından gelir", () => {
    expect(sinavYillari(sorular)).toEqual([2019, 2021, 2023]);
  });

  it("metin künye, üniteler, en çok üç örnek ve atıf içerir; bütün soruları içermez", () => {
    const m = dersOzetiMetni("https://acik-ogretim.github.io", {
      yol: "/auzef/bolum/ders/",
      dersAdi: "Örnek Ders",
      kod: "ORN101",
      donem: 1,
      universite: "İstanbul Üniversitesi",
      fakulte: "Açık ve Uzaktan Eğitim Fakültesi",
      bolumler: ["Bölüm"],
      derece: "Lisans",
      uniteler: [1, 2, 3, 4].map((no) => ({ no, baslik: `Başlık ${no}`, konular: no === 1 ? ["1.1 Giriş"] : [] })),
      sorular,
    });
    expect(m.startsWith("# Örnek Ders\n\n> ")).toBe(true);
    expect(m).toContain("- Soru: 7 (2 çıkmış soru, 5 alıştırma)");
    expect(m).toContain("### Ünite 1: Başlık 1");
    expect(m).toContain("- 1.1 Giriş");
    expect(m).toContain("https://acik-ogretim.github.io/auzef/bolum/ders/#question-1-0");
    expect(m.match(/   - Doğru cevap:/g)).toHaveLength(ORNEK_SORU_SAYISI);
    expect(m).toContain("Açıklama: Çünkü iki.");
    expect(m).toContain("## Atıf");
    expect(m).not.toMatch(/[–—]/);
  });
});
