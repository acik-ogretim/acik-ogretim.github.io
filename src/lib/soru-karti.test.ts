import { describe, expect, it } from "vitest";
import { SourceEnum, ExamTypeEnum } from "./schemas";
import { KAYNAKLAR, SINAV_TURLERI, paketAdresi, paketUniteSchema, type SoruKaydi } from "./unite-verisi";
import { UniteSorulariSemasi, paketDosyalari } from "./ders-paketi/sema";
import { esc, examKeys, kunyeAyrintiHtml, kunyeOzeti, konuYolu, soruKartiHtml, type KartBaglam } from "./soru-karti";

const q: SoruKaydi = {
  id: "162830",
  text: "<strong>Hangisi?</strong>",
  options: [
    { key: "A", text: "Hukuki fiil" },
    { key: "B", text: "Hukuki kurum" },
  ],
  correctAnswer: "B",
  explanation: "Açıklama <b>metni</b>",
  section: "1.2.5",
  source: "cikmis-soru",
  sinavlar: [
    { year: "2025-2026", examType: "final" },
    { year: "2019-2020", examType: "vize" },
    { year: "2019-2020", examType: "uc-ders" },
  ],
  eski: 3,
};
const baglam: KartBaglam = { unit: 1, konular: { "1.2": "HUKUK", "1.2.5": "ALT KONU" }, uniteBaslik: "Hukuk ve Toplum", calismaYolu: "/calisma/hukuk/" };

describe("soru kartı", () => {
  it("sabit sınıf, kimlik ve öznitelikleri üretir", () => {
    const h = soruKartiHtml(q, 0, baglam);
    for (const s of [
      'class="question-card"', 'id="question-1-0"', 'data-unit="1"', 'data-id="162830"', 'data-konu="1.2.5"', 'data-eski="3"',
      'data-source="cikmis-soru"', 'data-sinav="2025-2026 final;2019-2020 vize;2019-2020 uc-ders"', 'data-testid="question-card"',
      'class="option-item correct-option"', 'class="option-key"', 'class="option-text"', 'explanation-box', 'id="content-1-0"',
      'class="answer-meta-card', 'class="question-text"', 'data-q-tartis', 'data-ai="ask"', "Soru 1", "2025-2026 Final +2",
    ]) expect(h).toContain(s);
    expect(h).not.toContain("original-content-store");
    expect(h).not.toContain("<svg");
  });
  it("açıklaması olmayan soruda yapay zekâ ile açıkla düğmesi çıkar", () => {
    const h = soruKartiHtml({ ...q, explanation: undefined }, 4, baglam);
    expect(h).toContain("aciklama-yok");
    expect(h).toContain('data-ai="regenerate"');
    expect(h).toContain('id="content-1-4"');
  });
  it("özgün metin ve kullanıcı alanları kaçışlanır, soru HTML'i olduğu gibi gelir", () => {
    const h = soruKartiHtml({ ...q, id: 'a"b' }, 0, baglam);
    expect(h).toContain('data-id="a&quot;b"');
    expect(h).toContain("<strong>Hangisi?</strong>");
    expect(esc("<&>")).toBe("&lt;&amp;&gt;");
  });
  it("künye ayrıntısı sınav, konu yolu, kaynak ve anlatım bağlantısını verir", () => {
    const h = kunyeAyrintiHtml(q, baglam);
    expect(h).toContain("3 sınavda çıktı");
    expect(h).toContain("1.2 HUKUK › 1.2.5 ALT KONU");
    expect(h).toContain('href="/calisma/hukuk/?konu=1.2.5"');
    expect(h).toContain('href="#unite-1"');
    expect(kunyeAyrintiHtml(q, { ...baglam, calismaYolu: undefined })).not.toContain("q-anlatim");
  });
  it("özet ve anahtarlar", () => {
    expect(kunyeOzeti({ source: "soru-bankasi" })).toBe("Alıştırma");
    expect(examKeys({ source: "soru-bankasi" })).toBe("");
    expect(konuYolu("1.2.5", baglam.konular)).toEqual(["1.2 HUKUK", "1.2.5 ALT KONU"]);
  });
  it("tarayıcı şeması ders paketi birim dosyasını okur, tam şema da kabul eder", () => {
    const dosya = { v: 1, unite: 1, sorular: [{ ...q, konu: "1.2.5", eski: undefined }] };
    expect(paketUniteSchema.safeParse(dosya).success).toBe(true);
    expect(UniteSorulariSemasi.safeParse(dosya).success).toBe(true);
    expect(paketUniteSchema.safeParse({ v: 1, unite: "x", sorular: [] }).success).toBe(false);
  });
  it("adresler paketDosyalari ile aynı", () => {
    expect(paketAdresi.dizin("u", "d")).toBe(paketDosyalari.dizin("u", "d"));
    expect(paketAdresi.unite("u", "d", 3)).toBe(paketDosyalari.unite("u", "d", 3));
  });
  it("tarayıcı şemasının sabitleri schemas.ts ile aynı", () => {
    expect([...KAYNAKLAR]).toEqual(SourceEnum.options);
    expect([...SINAV_TURLERI]).toEqual(ExamTypeEnum.options);
  });
});
