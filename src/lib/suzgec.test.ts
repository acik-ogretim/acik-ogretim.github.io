import { describe, expect, it } from "vitest";
import { sinavEtiketi, suz, suzgecEtkin, suzgecOku, suzgecYaz, VARSAYILAN_SUZGEC, type SuzulecekSoru } from "./suzgec";

const sorular: SuzulecekSoru[] = [
  { id: "a", unitNumber: 1, source: "cikmis-soru", sinavlar: ["2023 final"] },
  { id: "b", unitNumber: 2, source: "soru-bankasi", sinavlar: [] },
  { id: "c", unitNumber: 3, source: "cikmis-soru", sinavlar: ["2022 vize", "2023 final"] },
  { id: "d", unitNumber: 4, source: "deneme", sinavlar: [] },
  { id: "e", unitNumber: 0, source: "cikmis-soru", sinavlar: ["2021 vize"] },
];
const ilerleme = { a: [true, false], b: [true], c: [true, true] };
const ids = (l: SuzulecekSoru[]) => l.map((q) => q.id);

describe("suz", () => {
  it("varsayılanla hepsini bırakır", () => {
    expect(ids(suz(sorular, VARSAYILAN_SUZGEC, ilerleme))).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("ünite, yarı ve kaynak süzgeçleri", () => {
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterUnite: "3" }, {}))).toEqual(["c"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterUnite: "first_half" }, {}))).toEqual(["a", "b", "e"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterUnite: "second_half" }, {}))).toEqual(["c", "d"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterSource: "alistirma" }, {}))).toEqual(["b", "d"]);
  });
  it("sınav, yanlış ve cevaplanmamış", () => {
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterExam: "2023 final" }, {}))).toEqual(["a", "c"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterIncorrect: true }, ilerleme))).toEqual(["a"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterUnanswered: true }, ilerleme))).toEqual(["d", "e"]);
    expect(ids(suz(sorular, { ...VARSAYILAN_SUZGEC, filterIncorrect: true, filterUnanswered: true }, ilerleme))).toEqual(["a", "d", "e"]);
  });
});

describe("quiz-settings okuma ve yazma", () => {
  it("bozuk ya da eksik kaydı varsayılana çeker", () => {
    expect(suzgecOku(null)).toEqual(VARSAYILAN_SUZGEC);
    expect(suzgecOku("{bozuk")).toEqual(VARSAYILAN_SUZGEC);
    expect(suzgecOku('{"filterSource":"x","filterIncorrect":true}')).toEqual({ ...VARSAYILAN_SUZGEC, filterIncorrect: true });
  });
  it("diğer ayarları korur", () => {
    const yeni = JSON.parse(suzgecYaz('{"playbackRate":1.5,"filterUnite":"2"}', { ...VARSAYILAN_SUZGEC, filterExam: "2023 final" }));
    expect(yeni).toMatchObject({ playbackRate: 1.5, filterUnite: "all", filterExam: "2023 final" });
  });
  it("etkinlik ve sınav etiketi", () => {
    expect(suzgecEtkin(VARSAYILAN_SUZGEC)).toBe(false);
    expect(suzgecEtkin({ ...VARSAYILAN_SUZGEC, filterUnite: "1" })).toBe(true);
    expect(sinavEtiketi("2023 final")).toBe("2023 Final");
    expect(sinavEtiketi(" genel")).toBe("Yılı bilinmeyen");
  });
});
