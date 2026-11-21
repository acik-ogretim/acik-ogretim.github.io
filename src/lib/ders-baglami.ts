// Everything the course page and its per-unit question files share: questions, unit order, unit titles,
// topic names and the book order of each unit. Both src/pages/[university]/[department]/[course].astro
// (skeleton) and src/pages/ders/[university]/[course]/ (course package files) read it, so the
// card numbers (question-<unit>-<index>) and titles can never drift apart.
import { createHash } from "node:crypto";
import { getDersIcerik, getKitapKonulari, getKitapUniteAdlari, getQuestions, type KitapKonu } from "./api";
import { uniteBasligi } from "./unite-basligi";
import { kitapSirala } from "./soru-siralama";
import type { Course, Question } from "./types";

export interface DersBaglami {
  questions: Question[];
  /** Unit numbers in page order (0 = unit not known yet, listed last). */
  units: number[];
  uniteAdi: Map<number, { baslik: string; alt: string[] }>;
  konuAdi: Map<string, string>;
  kitap: Awaited<ReturnType<typeof getKitapKonulari>>;
  icerik: Awaited<ReturnType<typeof getDersIcerik>>;
}

export async function dersBaglami(uniId: string, course: Pick<Course, "id" | "code">): Promise<DersBaglami> {
  const questions = await getQuestions(uniId, course.id);
  const icerik = await getDersIcerik(uniId, course.id);
  // Official topic list: in AUZEF and Anadolu the weekly topics are the units of the book.
  // Use it only when it covers every unit that has questions; a shorter list (merged weeks) would shift titles.
  const enBuyukUnite = Math.max(0, ...questions.map((q) => q.unitNumber));
  const resmiListe = (icerik?.konular ?? []).length >= enBuyukUnite ? (icerik?.konular ?? []) : [];
  const uniteAdi = new Map(resmiListe.map((k) => [k.no, uniteBasligi(k.baslik)]));
  // The book's own unit list wins over the weekly plan (weekly plans have exam weeks and differ from the book)
  const kitapUniteleri = await getKitapUniteAdlari(uniId, course.code);
  kitapUniteleri.forEach((baslik, i) => uniteAdi.set(i + 1, uniteBasligi(baslik)));
  // Book topic tree: unit titles where the official list has none, and the topic shown on each question
  const kitap = await getKitapKonulari(uniId, course.id);
  const konuAdi = new Map<string, string>();
  for (const u of kitap) {
    if (!uniteAdi.has(u.unite)) uniteAdi.set(u.unite, uniteBasligi(u.baslik));
    const gez = (k: KitapKonu) => {
      konuAdi.set(k.no, k.baslik);
      k.alt.forEach(gez);
    };
    u.konular.forEach(gez);
  }
  const units = [...new Set(questions.map((q) => q.unitNumber))].sort((a, b) => (a === 0 ? 1 : 0) - (b === 0 ? 1 : 0) || a - b);
  return { questions, units, uniteAdi, konuAdi, kitap, icerik };
}

/** One unit's questions in card order (book order). */
export function uniteSorulari(b: DersBaglami, unit: number): Question[] {
  return kitapSirala(b.questions.filter((q) => q.unitNumber === unit));
}

/**
 * unite/<n>.json of the course package: the unit's questions in source order (the page sorts them into book order).
 * Fields equal to the schema defaults are left out.
 */
export function paketUnitesi(b: DersBaglami, unit: number): { v: 1; unite: number; sorular: Record<string, unknown>[] } {
  return {
    v: 1,
    unite: unit,
    sorular: b.questions
      .filter((q) => q.unitNumber === unit)
      .map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        ...(q.explanation ? { explanation: q.explanation } : {}),
        ...(q.section ? { section: q.section, konu: q.section } : {}),
        source: q.source,
        ...(q.year ? { year: String(q.year) } : {}),
        examType: q.examType,
        ...(q.sinavlar?.length ? { sinavlar: q.sinavlar } : {}),
        ...(q.kontrol ? { kontrol: q.kontrol } : {}),
      })),
  };
}

/** index.json of the course package (the temporary producer: units and topics, no study material or media yet). */
export function paketDizini(uni: string, course: Pick<Course, "id" | "name" | "code" | "semester">, b: DersBaglami) {
  const dosyalar = b.units.map((unit) => {
    const yol = `unite/${unit}.json`;
    const metin = JSON.stringify(paketUnitesi(b, unit));
    return { yol, boyut: Buffer.byteLength(metin), metin };
  });
  const konular: Record<string, unknown>[] = [];
  const say = (unit: number, ust: string | undefined, k: KitapKonu) => {
    const soruSayisi = b.questions.filter((q) => q.unitNumber === unit && (q.section === k.no || q.section?.startsWith(`${k.no}.`))).length;
    konular.push({ id: k.no, no: k.no, baslik: k.baslik, unite: unit, ...(ust ? { ust } : {}), ...(k.sayfa ? { sayfa: k.sayfa } : {}), soruSayisi, kavramSayisi: 0, calismaVar: false, medyaAnlari: [] });
    k.alt.forEach((a) => say(unit, k.no, a));
  };
  b.kitap.forEach((u) => u.konular.forEach((k) => say(u.unite, undefined, k)));
  return {
    v: 1,
    uni,
    ders: course.id,
    ad: course.name,
    kod: course.code,
    donem: course.semester,
    surum: createHash("sha256").update(dosyalar.map((d) => d.metin).join("\n")).digest("hex").slice(0, 12),
    uretim: new Date().toISOString(),
    uniteler: b.units
      .filter((u) => u > 0)
      .map((no) => ({ no, baslik: b.uniteAdi.get(no)?.baslik ?? "", konular: b.kitap.find((u) => u.unite === no)?.konular.map((k) => k.no) ?? [], soruSayisi: b.questions.filter((q) => q.unitNumber === no).length })),
    konular,
    medyalar: [],
    dosyalar: dosyalar.map(({ yol, boyut }) => ({ yol, boyut })),
  };
}

/** Unit numbers per course, read once (the question files are large; getStaticPaths of the package routes asks per request in dev). */
const uniteListeleri = new Map<string, number[]>();
export async function uniteNumaralari(uniId: string, courseId: string): Promise<number[]> {
  const anahtar = `${uniId}/${courseId}`;
  let liste = uniteListeleri.get(anahtar);
  if (!liste) {
    const q = await getQuestions(uniId, courseId);
    liste = [...new Set(q.map((x) => x.unitNumber))].sort((a, b) => a - b);
    uniteListeleri.set(anahtar, liste);
  }
  return liste;
}

/** The context of the course whose files are being written now: a build writes a course's units one after another. */
let sonBaglam: { anahtar: string; sozu: Promise<DersBaglami> } | null = null;
export function dersBaglaminiAl(uniId: string, course: Pick<Course, "id" | "code">): Promise<DersBaglami> {
  const anahtar = `${uniId}/${course.id}`;
  if (sonBaglam?.anahtar !== anahtar) sonBaglam = { anahtar, sozu: dersBaglami(uniId, course) };
  return sonBaglam.sozu;
}
