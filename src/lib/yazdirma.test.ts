import { describe, expect, it } from "vitest";
import { YazdirmaAyarlariSemasi, soruSayisiMetni } from "./yazdirma";

describe("yazdirma", () => {
  it("fills defaults and recovers from bad values", () => {
    expect(YazdirmaAyarlariSemasi.parse({})).toEqual({ cevap: "alt", aciklama: "var", sutun: "2", yazi: "normal", konu: "var" });
    expect(YazdirmaAyarlariSemasi.parse({ cevap: "x", sutun: 3, yazi: "buyuk" })).toMatchObject({ cevap: "alt", sutun: "2", yazi: "buyuk" });
  });
  it("writes the short count", () => {
    expect(soruSayisiMetni(511, 511)).toBe("511 soru");
    expect(soruSayisiMetni(170, 511)).toBe("170 / 511 soru");
  });
});
