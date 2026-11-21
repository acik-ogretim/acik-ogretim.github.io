import { describe, expect, it } from "vitest";
import { cogunluklaAciklamali, dersSayilari, sayilariBirlestir, sinavTuruAdlari, yilAraligiMetni, type SoruKaydi } from "./ders-sayilari";

const cikmis = (yil: string, tur = "vize", unite = 1, ek: Partial<SoruKaydi> = {}): SoruKaydi => ({
  unitNumber: unite,
  source: "cikmis-soru",
  sinavlar: [{ year: yil, examType: tur }],
  ...ek,
});

describe("dersSayilari", () => {
  it("çıkmış soru, alıştırma, ünite ve yıl aralığını sayar", () => {
    const d = dersSayilari([
      cikmis("2016-2017", "vize", 1),
      cikmis("2024-2025", "final", 2),
      cikmis("2020-2021", "butunleme", 2),
      { unitNumber: 3, source: "soru-bankasi" },
    ]);
    expect(d).toMatchObject({ soru: 4, cikmis: 3, alistirma: 1, unite: 3, ilkYil: "2016-2017", sonYil: "2024-2025", yillar: [2016, 2020, 2024] });
    expect(yilAraligiMetni(d)).toBe("2016-2017 ile 2024-2025 arası sınavlar");
    expect(sinavTuruAdlari(d)).toEqual(["Vize", "Final", "Bütünleme"]);
  });

  it("tek yıl: '<yıl> sınavı'", () => {
    const d = dersSayilari([cikmis("2023-2024"), cikmis("2023-2024", "final")]);
    expect(d.yillar).toEqual([2023]);
    expect(yilAraligiMetni(d)).toBe("2023-2024 sınavı");
  });

  it("yalnız alıştırma: yıl ve sınav türü yok, çıkmış sıfır", () => {
    const d = dersSayilari([{ unitNumber: 1, source: "soru-bankasi" }, { unitNumber: 2, source: "unite-sonu" }]);
    expect(d).toMatchObject({ soru: 2, cikmis: 0, alistirma: 2, unite: 2, yillar: [], sinavTurleri: [] });
    expect(yilAraligiMetni(d)).toBe("");
  });

  it("sinavlar boşsa çıkmış sorunun year alanına döner; 1990 öncesi ve geçersiz yıl atlanır", () => {
    const d = dersSayilari([
      { source: "cikmis-soru", year: "2019-2020", examType: "final", sinavlar: [] },
      { source: "cikmis-soru", sinavlar: [{ year: "abc" }, { year: "1980" }] },
      { source: "soru-bankasi", year: "2001", sinavlar: [] },
    ]);
    expect(d.yillar).toEqual([2019]);
    expect(d.sinavTurleri).toEqual(["final"]);
  });

  it("genel sınav türü listeye girmez; sıra sabittir", () => {
    const d = dersSayilari([cikmis("2020-2021", "genel"), cikmis("2020-2021", "yaz-okulu"), cikmis("2020-2021", "vize")]);
    expect(d.sinavTurleri).toEqual(["vize", "yaz-okulu"]);
  });

  it("açıklamalı eşiği yüzde 80", () => {
    const var_ = (n: number, toplam: number) => dersSayilari(Array.from({ length: toplam }, (_, i) => ({ unitNumber: 1, explanation: i < n ? "Çünkü." : "" })));
    expect(cogunluklaAciklamali(var_(8, 10))).toBe(true);
    expect(cogunluklaAciklamali(var_(7, 10))).toBe(false);
    expect(cogunluklaAciklamali(dersSayilari([]))).toBe(false);
  });
});

describe("sayilariBirlestir", () => {
  it("toplamları toplar, yıl ve türlerin birleşimini alır", () => {
    const a = dersSayilari([cikmis("2016-2017", "vize"), { source: "soru-bankasi", unitNumber: 1 }]);
    const b = dersSayilari([cikmis("2024-2025", "final")]);
    const t = sayilariBirlestir([a, b]);
    expect(t).toMatchObject({ soru: 3, cikmis: 2, alistirma: 1, ilkYil: "2016-2017", sonYil: "2024-2025", yillar: [2016, 2024], sinavTurleri: ["vize", "final"] });
  });
  it("boş liste sıfır döner", () => {
    expect(sayilariBirlestir([])).toMatchObject({ soru: 0, cikmis: 0, yillar: [] });
  });
});
