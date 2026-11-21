import { beforeEach, describe, expect, it } from "vitest";
import { DERS_BOLUMU_ANAHTARI, geriBolumu } from "./ders-bolumu";

const depo = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => depo.get(k) ?? null,
  setItem: (k: string, v: string) => void depo.set(k, v),
  removeItem: (k: string) => void depo.delete(k),
  clear: () => depo.clear(),
  key: () => null,
  length: 0,
} as Storage;

const bolumler = [
  { id: "cocuk-gelisimi-lisans", ad: "Çocuk Gelişimi Lisans" },
  { id: "sosyoloji", ad: "Sosyoloji" },
  { id: "tarih", ad: "Tarih" },
];
const sayfa = bolumler[0];

describe("geriBolumu", () => {
  beforeEach(() => depo.clear());

  it("uses ?bolum and remembers it for the course", () => {
    expect(geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "?bolum=sosyoloji").id).toBe("sosyoloji");
    expect(JSON.parse(depo.get(DERS_BOLUMU_ANAHTARI)!)).toEqual({ "ataturk-aof/turk-dili-i": "sosyoloji" });
    expect(geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "").id).toBe("sosyoloji");
  });

  it("ignores a department that does not list the course", () => {
    expect(geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "?bolum=hukuk").id).toBe(sayfa.id);
  });

  it("falls back to a starred department, then to the page's own", () => {
    depo.set("favorite-departments", JSON.stringify(["isletme", "tarih"]));
    expect(geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "").id).toBe("tarih");
    depo.clear();
    expect(geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "").id).toBe(sayfa.id);
  });

  it("keeps courses apart", () => {
    geriBolumu("ataturk-aof", "turk-dili-i", bolumler, sayfa, "?bolum=tarih");
    expect(geriBolumu("ataturk-aof", "sosyolojiye-giris", bolumler, sayfa, "").id).toBe(sayfa.id);
  });
});
