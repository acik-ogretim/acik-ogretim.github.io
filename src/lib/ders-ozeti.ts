// Markdown summary of one course for agents (/<uni>/<bolum>/<ders>/ozet.md): unit titles, book
// topics, question counts and a few sample questions with links. The full question set stays on the
// course page only: the questions belong to the universities, and one file per course with every
// question would double the build output (docs/yz-ve-ajan-hazirligi.md).
import { toPlainText } from "../../scripts/utils/clean-html";
import { kitapSirala } from "./soru-siralama";
import { cikmaSayisi, soruSirala } from "./soru-sirasi";
import { SITE_ADI, kisalt, mutlakUrl } from "./seo";
import type { Question } from "./types";

type Site = URL | string | undefined;

/** Plain text of question HTML; tags become spaces, so tidy the space left before punctuation. */
const duz = (html: string) => toPlainText(html).replace(/\s+([.,;:!?)])/g, "$1");

/** How many sample questions a summary shows. */
export const ORNEK_SORU_SAYISI = 3;

export type OzetUnitesi = { no: number; baslik?: string; konular: string[] };
export type DersOzetiGirdisi = {
  yol: string;
  dersAdi: string;
  kod?: string;
  donem: number;
  universite: string;
  fakulte: string;
  bolumler: string[];
  derece: string;
  amac?: string;
  resmiSayfa?: string;
  guncel?: boolean;
  uniteler: OzetUnitesi[];
  sorular: Question[];
};

/** Exam years of the questions, oldest first. */
export function sinavYillari(sorular: Question[]): number[] {
  const yillar = new Set<number>();
  for (const q of sorular) {
    const liste = q.sinavlar?.length ? q.sinavlar.map((s) => s.year) : q.source === "cikmis-soru" && q.year ? [q.year] : [];
    for (const y of liste) {
      const n = Number.parseInt(String(y), 10);
      if (n > 1990) yillar.add(n);
    }
  }
  return [...yillar].sort((a, b) => a - b);
}

/** Anchor of a question on the course page: #question-<unit>-<index in book order>, as the page renders it. */
export function soruCapasi(q: Question, sorular: Question[]): string {
  const sira = kitapSirala(sorular.filter((x) => x.unitNumber === q.unitNumber)).indexOf(q);
  return `#question-${q.unitNumber}-${Math.max(sira, 0)}`;
}

/** Most asked questions first, one per unit where possible, never cancelled or answerless ones. */
export function ornekSorular(sorular: Question[], adet = ORNEK_SORU_SAYISI): Question[] {
  const uygun = soruSirala(sorular.filter((q) => q.text.trim() && q.correctAnswer && q.options.length >= 2));
  const secilen: Question[] = [];
  const uniteler = new Set<number>();
  for (const q of uygun) {
    if (secilen.length >= adet) break;
    if (uniteler.has(q.unitNumber)) continue;
    uniteler.add(q.unitNumber);
    secilen.push(q);
  }
  for (const q of uygun) {
    if (secilen.length >= adet) break;
    if (!secilen.includes(q)) secilen.push(q);
  }
  return secilen;
}

export function dersOzetiMetni(site: Site, d: DersOzetiGirdisi): string {
  const url = mutlakUrl(site, d.yol);
  const cikmis = d.sorular.filter((q) => q.source === "cikmis-soru").length;
  const yillar = sinavYillari(d.sorular);
  const sayac = new Map<number, number>();
  for (const q of d.sorular) sayac.set(q.unitNumber, (sayac.get(q.unitNumber) ?? 0) + 1);

  const kunye = [
    `- Üniversite: ${d.universite} ${d.fakulte}`,
    `- Bölüm: ${d.bolumler.join(", ")} (${d.derece})`,
    d.kod ? `- Ders kodu: ${d.kod}` : null,
    `- Dönem: ${d.donem}`,
    `- Soru: ${d.sorular.length} (${cikmis} çıkmış soru, ${d.sorular.length - cikmis} alıştırma)`,
    yillar.length ? `- Sınav yılları: ${yillar[0]}${yillar.length > 1 ? `-${yillar[yillar.length - 1]}` : ""}` : null,
    d.guncel === false ? "- Not: ders güncel müfredatta yer almıyor" : null,
    `- Ders sayfası: ${url}`,
    `- Materyaller: ${url}materyaller/`,
    d.resmiSayfa ? `- Resmî ders sayfası: ${d.resmiSayfa}` : null,
  ].filter((x): x is string => x !== null);

  const uniteSatirlari: string[] = [];
  for (const u of d.uniteler) {
    const n = sayac.get(u.no) ?? 0;
    if (n === 0 && u.konular.length === 0) continue;
    const ad = u.no === 0 ? "Ünitesi belirlenmemiş sorular" : `Ünite ${u.no}${u.baslik ? `: ${u.baslik}` : ""}`;
    uniteSatirlari.push(`### ${ad}`, "", `${n} soru · ${url}#unite-${u.no}`);
    if (u.konular.length) uniteSatirlari.push("", ...u.konular.map((k) => `- ${k}`));
    uniteSatirlari.push("");
  }

  const ornekler = ornekSorular(d.sorular).flatMap((q, i) => {
    const secenekler = q.options.map((o) => `   - ${o.key}) ${duz(o.text)}`);
    const aciklama = duz(q.explanation);
    const kez = cikmaSayisi(q);
    const kaynak = q.source === "cikmis-soru" ? (kez > 1 ? `çıkmış soru, ${kez} sınavda` : "çıkmış soru") : "alıştırma";
    return [
      `${i + 1}. ${duz(q.text)} (${q.unitNumber === 0 ? "ünitesi belirlenmemiş" : `Ünite ${q.unitNumber}`}, ${kaynak})`,
      ...secenekler,
      `   - Doğru cevap: ${q.correctAnswer}`,
      ...(aciklama ? [`   - Açıklama: ${kisalt(aciklama, 400)}`] : []),
      `   - Bağlantı: ${url}${soruCapasi(q, d.sorular)}`,
      "",
    ];
  });

  return [
    `# ${d.dersAdi}`,
    "",
    `> ${d.universite} ${d.bolumler[0] ?? ""} programının ${d.dersAdi} dersi için ${SITE_ADI} çalışma sayfasının özeti. Bütün sorular, doğru cevaplar ve açıklamalar ders sayfasındadır.`,
    "",
    ...kunye,
    "",
    ...(d.amac ? ["## Dersin amacı", "", duz(d.amac), ""] : []),
    "## Üniteler",
    "",
    ...uniteSatirlari,
    "## Örnek sorular",
    "",
    `Bu dosyada en sık sorulan ${ORNEK_SORU_SAYISI} soru örnek olarak yer alır; geri kalanı için ders sayfasını açın.`,
    "",
    ...ornekler,
    "## Atıf",
    "",
    `Açık Öğretim Portal, ${d.dersAdi} (${d.universite}), ${url}. İçerik lisansı CC BY-NC-SA 4.0; sınav sorularının hakları ilgili üniversiteye aittir.`,
    "",
  ].join("\n");
}
