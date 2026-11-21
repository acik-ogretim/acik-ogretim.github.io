import { describe, expect, it } from "vitest";
import { cumleleriBol, okunacakMetin } from "./cumle";

const parcalar = (m: string) => cumleleriBol(m).map((c) => m.slice(c.bas, c.son));

describe("cumleleriBol", () => {
  it("splits at sentence ends followed by a capital, Turkish İ and Ç included", () => {
    expect(parcalar("Çocuk bir kavramdır. İletişim ise başka! Neden böyle? Çünkü öyle.")).toEqual([
      "Çocuk bir kavramdır.",
      "İletişim ise başka!",
      "Neden böyle?",
      "Çünkü öyle.",
    ]);
  });
  it("keeps abbreviations, single letters and lower-case continuations together", () => {
    expect(parcalar("Dr. Ayşe Yılmaz geldi. Bkz. Ünite 2 ve vb. kaynaklar var.")).toEqual([
      "Dr. Ayşe Yılmaz geldi.",
      "Bkz. Ünite 2 ve vb. kaynaklar var.",
    ]);
    expect(parcalar("Bu 3. madde değil. Sonra devam.")).toEqual(["Bu 3. madde değil.", "Sonra devam."]);
  });
  it("returns offsets into the original text", () => {
    const m = "Bir. İki.";
    const c = cumleleriBol(m);
    expect(c).toEqual([{ bas: 0, son: 4 }, { bas: 5, son: 9 }]);
  });
  it("cuts very long sentences", () => {
    const uzun = Array.from({ length: 80 }, () => "kelime").join(" ") + ".";
    const c = cumleleriBol(uzun);
    expect(c.length).toBeGreaterThan(1);
    expect(Math.max(...c.map((x) => x.son - x.bas))).toBeLessThanOrEqual(320);
  });
  it("handles empty input", () => {
    expect(cumleleriBol("  ")).toEqual([]);
  });
});

describe("okunacakMetin", () => {
  it("drops author-year citations", () => {
    expect(okunacakMetin("Kaçamaz (Mouritsen, 2002:37-38). Devam.")).toBe("Kaçamaz. Devam.");
    expect(okunacakMetin("Bütünüdür [2]. Devam.")).toBe("Bütünüdür. Devam.");
    expect(okunacakMetin("Kapsam (bkz. aşağıda) var.")).toBe("Kapsam (bkz. aşağıda) var.");
  });
});
