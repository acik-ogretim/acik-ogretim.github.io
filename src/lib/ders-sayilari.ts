// Counts shown for a course (or any set of courses): questions, past-exam questions, exam years and types.
// Pure functions over raw question records, shared by the share image cards (src/lib/og) and meant to
// replace the inline copies in the course page (cikmisSayisi, sinavYillari) so every surface agrees.

/** The question fields the counts need; accepts parsed questions and raw JSON records alike. */
export type SoruKaydi = {
  unitNumber?: unknown;
  source?: string;
  year?: string | number;
  examType?: string;
  explanation?: string;
  aiExplanation?: string;
  sinavlar?: { year?: string; examType?: string }[];
};

export type DersSayilari = {
  soru: number;
  /** Questions with source "cikmis-soru". */
  cikmis: number;
  alistirma: number;
  unite: number;
  /** Distinct exam years by their starting year (academic year "2016-2017" counts as 2016), oldest first. */
  yillar: number[];
  /** Label of the oldest and the newest exam year as the data writes it ("2016-2017"). */
  ilkYil?: string;
  sonYil?: string;
  /** Exam types present, in display order ("vize", "final", ...); the generic "genel" is left out. */
  sinavTurleri: string[];
  aciklamali: number;
};

/** Display order and Turkish names of the exam types. */
export const SINAV_TURU_ADI: Record<string, string> = {
  vize: "Vize",
  final: "Final",
  butunleme: "Bütünleme",
  "tek-ders": "Tek ders",
  "yaz-okulu": "Yaz okulu",
  "uc-ders": "Üç ders",
  mezuniyet: "Mezuniyet",
};

/** Share of explained questions from which a course counts as "açıklamalı" (measured 21 Nov 2026: half the courses have none). */
export const ACIKLAMALI_ESIGI = 0.8;

const baslangic = (y: string) => Number.parseInt(y, 10);

type YilKaydi = { y: string; tur: string };
function sinavYillari(q: SoruKaydi): YilKaydi[] {
  if (q.sinavlar?.length) return q.sinavlar.map((s) => ({ y: String(s.year ?? ""), tur: s.examType ?? "genel" }));
  if (q.source === "cikmis-soru" && q.year) return [{ y: String(q.year), tur: q.examType ?? "genel" }];
  return [];
}

type Toplayici = { etiket: Map<number, string>; turler: Set<string> };

function topla(sorular: readonly SoruKaydi[], t: Toplayici): Omit<DersSayilari, "yillar" | "ilkYil" | "sonYil" | "sinavTurleri"> {
  const uniteler = new Set<number>();
  let cikmis = 0;
  let aciklamali = 0;
  for (const q of sorular) {
    const u = Number(q.unitNumber);
    if (u > 0) uniteler.add(u);
    if (q.source === "cikmis-soru") cikmis++;
    if (q.explanation?.trim() || q.aiExplanation?.trim()) aciklamali++;
    for (const { y, tur } of sinavYillari(q)) {
      const n = baslangic(y);
      if (!(n > 1990)) continue;
      if (!t.etiket.has(n)) t.etiket.set(n, y);
      if (SINAV_TURU_ADI[tur]) t.turler.add(tur);
    }
  }
  return { soru: sorular.length, cikmis, alistirma: sorular.length - cikmis, unite: uniteler.size, aciklamali };
}

function sonuclandir(s: Omit<DersSayilari, "yillar" | "ilkYil" | "sonYil" | "sinavTurleri">, t: Toplayici): DersSayilari {
  const yillar = [...t.etiket.keys()].sort((a, b) => a - b);
  return {
    ...s,
    yillar,
    ilkYil: yillar.length ? t.etiket.get(yillar[0]) : undefined,
    sonYil: yillar.length ? t.etiket.get(yillar[yillar.length - 1]) : undefined,
    sinavTurleri: Object.keys(SINAV_TURU_ADI).filter((k) => t.turler.has(k)),
  };
}

export function dersSayilari(sorular: readonly SoruKaydi[]): DersSayilari {
  const t: Toplayici = { etiket: new Map(), turler: new Set() };
  return sonuclandir(topla(sorular, t), t);
}

/** Sums the counts of several courses (department, university, whole site); years and types are unions. */
export function sayilariBirlestir(liste: readonly DersSayilari[]): DersSayilari {
  const t: Toplayici = { etiket: new Map(), turler: new Set() };
  const s = { soru: 0, cikmis: 0, alistirma: 0, unite: 0, aciklamali: 0 };
  for (const d of liste) {
    s.soru += d.soru;
    s.cikmis += d.cikmis;
    s.alistirma += d.alistirma;
    s.unite += d.unite;
    s.aciklamali += d.aciklamali;
    for (const n of d.yillar) if (!t.etiket.has(n)) t.etiket.set(n, String(n));
    if (d.ilkYil && d.yillar.length) t.etiket.set(d.yillar[0], d.ilkYil);
    if (d.sonYil && d.yillar.length) t.etiket.set(d.yillar[d.yillar.length - 1], d.sonYil);
    for (const k of d.sinavTurleri) t.turler.add(k);
  }
  return sonuclandir(s, t);
}

/** Most of the questions carry an explanation. */
export const cogunluklaAciklamali = (d: DersSayilari) => d.soru > 0 && d.aciklamali / d.soru >= ACIKLAMALI_ESIGI;

/** "2016-2017 ile 2024-2025 arası sınavlar", "2024-2025 sınavı", or "" without years. */
export function yilAraligiMetni(d: Pick<DersSayilari, "yillar" | "ilkYil" | "sonYil">): string {
  if (d.yillar.length === 0 || !d.ilkYil || !d.sonYil) return "";
  if (d.yillar.length === 1) return `${d.ilkYil} sınavı`;
  return `${d.ilkYil} ile ${d.sonYil} arası sınavlar`;
}

/** Names of the exam types present, e.g. ["Vize", "Final", "Bütünleme"]. */
export const sinavTuruAdlari = (d: Pick<DersSayilari, "sinavTurleri">) => d.sinavTurleri.map((k) => SINAV_TURU_ADI[k]);
