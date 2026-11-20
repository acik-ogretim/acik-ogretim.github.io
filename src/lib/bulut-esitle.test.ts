import { describe, expect, it } from "vitest";
import { coz, sifrele } from "./bulut-esitle";

describe("şifreli eşitleme", () => {
  it("doğru parolayla açar, yanlış parolayla açmaz", async () => {
    const y = { surum: 1 as const, tarih: "2026-11-20T00:00:00Z", kayitlar: { theme: "dark" } };
    const s = await sifrele(y, "uzun-bir-parola");
    expect(s.veri).not.toContain("dark");
    expect(await coz(s, "uzun-bir-parola")).toEqual(y);
    await expect(coz(s, "baska-parola")).rejects.toThrow("Parola yanlış");
  });
});
