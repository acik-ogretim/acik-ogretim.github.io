import { describe, expect, it } from "vitest";
import { sonCalismaMetni, sonCalismaOku } from "./son-calisma";

const iyi = { yol: "/auzef/x/y", ad: "Ders", hedef: "question-4-11", unite: 4, sira: 12, uniteToplam: 40, zaman: 1 };

describe("son-calisma", () => {
  it("geçerli kaydı okur", () => {
    expect(sonCalismaOku(JSON.stringify(iyi))).toEqual(iyi);
    expect(sonCalismaMetni(iyi)).toBe("Ünite 4 · Soru 12 / 40");
    expect(sonCalismaMetni({ ...iyi, unite: 0 })).toBe("Diğer sorular · Soru 12 / 40");
  });
  it("bozuk ve eksik kaydı yok sayar", () => {
    expect(sonCalismaOku(null)).toBeNull();
    expect(sonCalismaOku("{")).toBeNull();
    expect(sonCalismaOku(JSON.stringify({ ...iyi, yol: "https://x" }))).toBeNull();
    expect(sonCalismaOku(JSON.stringify({ ...iyi, hedef: "x\"><img" }))).toBeNull();
    expect(sonCalismaOku(JSON.stringify({ ...iyi, sira: "12" }))).toBeNull();
  });
});
