import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM module without types
import { konuyaEsle } from "../lib/konu-esle.mjs";

const konu = (no: string, unite: number, baslik: string, metin: string) => ({ no, unite, baslik, metin: metin.repeat(6), kitapKavramlari: [] as string[] });
const konular = [
  konu("1.1", 1, "Hücre zarı", "Hücre zarı seçici geçirgenlik sağlar; fosfolipit çift katman proteinlerle çalışır. "),
  konu("1.2", 1, "Mitokondri", "Mitokondri enerji üretir; ATP sentezi iç zar kıvrımlarında olur. "),
  konu("2.1", 2, "Kalıtım", "Kalıtım genler aracılığıyla aktarılır; Mendel bezelye çaprazlamalarını inceledi. "),
  konu("2.2", 2, "Değerlendirme Soruları", "Aşağıdakilerden hangisi doğrudur sorusu cevap anahtarı seçenek. "),
];
const satir = (m: string, i: number) => ({ i, bas: i * 10, bit: i * 10 + 10, k: "Can", m, konu: null as string | null, g: 0 });

describe("konuyaEsle", () => {
  it("assigns every line, follows book order and attaches the closing line to the last real topic", () => {
    const s = [
      satir("Hücre zarı seçici geçirgenlik sağlar, fosfolipit çift katman proteinlerle çalışır.", 0),
      satir("Mitokondri enerji üretir, ATP sentezi iç zar kıvrımlarında yapılır.", 1),
      satir("Kalıtım genler aracılığıyla aktarılır, Mendel bezelye çaprazlamaları yaptı.", 2),
      satir("Bir sonraki yayında görüşmek üzere, kendinize çok iyi bakın.", 3),
    ];
    konuyaEsle(s, konular);
    expect(s.map((x) => x.konu)).toEqual(["1.1", "1.2", "2.1", "2.1"]);
    expect(s.every((x) => x.konu && x.g >= 0 && x.g <= 1)).toBe(true);
    expect(s[3].y).toBe(1); // closing line: weak link to the previous topic
  });
  it("never assigns the evaluation-questions topic", () => {
    const s = [satir("Aşağıdakilerden hangisi doğrudur sorusu cevap anahtarı seçenek.", 0)];
    konuyaEsle(s, konular);
    expect(s[0].konu).not.toBe("2.2");
  });
});

import { dokumSatiriSemaya } from "../lib/konu-esle.mjs";
import { DokumSatiriSemasi } from "../../src/lib/ders-paketi/sema";

describe("dokumSatiriSemaya", () => {
  it("ders paketi döküm satırı şemasına uyar", () => {
    const o = dokumSatiriSemaya({ i: 3, bas: 1.5, bit: 4, k: "Can", m: "Merhaba", konu: "1.2", g: 0.8 });
    expect(DokumSatiriSemasi.parse(o)).toEqual({ bas: 1.5, bit: 4, konusmaci: "Can", metin: "Merhaba", konu: "1.2", guven: 0.8 });
  });
});
