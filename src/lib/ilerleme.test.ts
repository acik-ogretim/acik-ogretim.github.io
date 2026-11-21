import { describe, expect, it } from "vitest";
import { ilerlemeOzeti, olc } from "./ilerleme";

describe("ilerleme", () => {
  it("yalnız kayıttaki sonuçlardan ölçer", () => {
    expect(olc({ a: [true, true], b: [false, true], c: [true, false], d: [], e: "bozuk" })).toEqual({
      cozulen: 3,
      dogru: 2,
      oran: 67,
      ikiKez: 1,
      tekrar: 2,
    });
  });
  it("dersleri toplar ve çözülmemişleri atar", () => {
    const { toplam, dersler } = ilerlemeOzeti([
      { ders: "x", veri: { a: [true] } },
      { ders: "y", veri: { a: [false], b: [true, true] } },
      { ders: "z", veri: {} },
    ]);
    expect(dersler.map((d) => d.ders)).toEqual(["y", "x"]);
    expect(toplam).toEqual({ cozulen: 3, dogru: 2, oran: 67, ikiKez: 1, tekrar: 1 });
  });
});
