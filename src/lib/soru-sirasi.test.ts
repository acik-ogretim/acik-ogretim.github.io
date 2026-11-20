import { describe, expect, it } from "vitest";
import { soruSirala } from "./soru-sirasi";
import type { Question } from "./types";

const q = (id: string, extra: Partial<Question>): Question =>
  ({ id, unitNumber: 1, text: id, options: [], correctAnswer: "A", explanation: "", source: "deneme", year: "", examType: "genel", sinavlar: [], ...extra }) as Question;

describe("soruSirala", () => {
  it("orders by exam count, then exam questions, then practice, respecting sections", () => {
    const sinav = (n: number) => Array.from({ length: n }, (_, i) => ({ year: `202${i}-202${i + 1}`, examType: "vize" as const }));
    const sonuc = soruSirala([
      q("alistirma", { source: "deneme" }),
      q("bir-kez", { source: "cikmis-soru", sinavlar: sinav(1) }),
      q("uc-kez", { source: "cikmis-soru", sinavlar: sinav(3) }),
      q("bir-kez-bolum-1.2", { source: "cikmis-soru", sinavlar: sinav(1), section: "1.2" }),
      q("bir-kez-bolum-1.10", { source: "cikmis-soru", sinavlar: sinav(1), section: "1.10" }),
      q("yilli", { source: "cikmis-soru", year: "2024-2025" }),
    ]).map((x) => x.id);
    expect(sonuc).toEqual(["uc-kez", "bir-kez-bolum-1.2", "bir-kez-bolum-1.10", "bir-kez", "yilli", "alistirma"]);
  });
});
