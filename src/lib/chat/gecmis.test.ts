import { beforeEach, describe, expect, it } from "vitest";
import { basligaCevir, kaydet, listele, sil, threadId } from "./gecmis";

class Bellek {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new Bellek();
});

describe("sohbet geçmişi", () => {
  it("eski tek sohbeti listede gösterir", () => {
    localStorage.setItem("tanstack-ai:" + threadId("ata/psikoloji", ""), "{}");
    expect(listele("ata/psikoloji").map((k) => k.baslik)).toEqual(["Önceki sohbet"]);
  });
  it("ilk mesajı başlık yapar, yeniyi üste koyar, siler", () => {
    kaydet("d", "a", "Birinci soru");
    kaydet("d", "b", "İkinci soru");
    expect(listele("d").map((k) => k.baslik)).toEqual(["İkinci soru", "Birinci soru"]);
    sil("d", "b");
    expect(listele("d").map((k) => k.id)).toEqual(["a"]);
  });
  it("uzun başlığı kısaltır", () => {
    expect(basligaCevir("x".repeat(80)).length).toBe(58);
  });
});
