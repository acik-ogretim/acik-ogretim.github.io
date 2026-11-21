// Indexable page list shared by the sitemaps, robots.txt and llms(-full).txt.
// One sitemap per university keeps every university's data in its own file; course pages appear
// once, under their canonical department (src/lib/kanonik.ts), and only when they have questions.
import { getCourses, getUniversities, sorusuOlanDersler } from "./api";
import { canonicalDepartments } from "./kanonik";
import { mutlakUrl } from "./seo";
import type { Course, Department, University } from "./types";

type Site = URL | string | undefined;

/** Public pages outside the catalog that are worth indexing (personal pages carry noindex). */
export const STATIK_SAYFALAR = [
  "/",
  "/rehber/",
  "/hakkimizda/",
  "/iletisim/",
  "/gizlilik/",
  "/kullanim-kosullari/",
  "/telif/",
  "/sohbet/",
] as const;

export type KatalogDersi = {
  uni: University;
  bolum: Department;
  ders: Course;
  yol: string;
};
export type KatalogBolumu = { bolum: Department; yol: string; dersSayisi: number };
export type KatalogUniversitesi = { uni: University; yol: string; bolumler: KatalogBolumu[]; dersler: KatalogDersi[] };

let onbellek: Promise<KatalogUniversitesi[]> | null = null;

/** Every university with its indexable departments and canonical courses (memoized per build). */
export function katalog(): Promise<KatalogUniversitesi[]> {
  onbellek ??= katalogKur();
  return onbellek;
}

async function katalogKur(): Promise<KatalogUniversitesi[]> {
  const kanonik = await canonicalDepartments();
  const sonuc: KatalogUniversitesi[] = [];
  for (const uni of await getUniversities()) {
    const bolumler: KatalogBolumu[] = [];
    const dersler: KatalogDersi[] = [];
    const gorulen = new Set<string>();
    for (const bolum of uni.departments || []) {
      const dolu = await sorusuOlanDersler(uni.id, await getCourses(uni.id, bolum.id));
      if (dolu.length === 0) continue;
      bolumler.push({ bolum, yol: `/${uni.id}/${bolum.id}/`, dersSayisi: dolu.length });
      for (const ders of dolu) {
        const anahtar = `${uni.id}/${ders.id}`;
        if (gorulen.has(anahtar) || (kanonik.get(anahtar) ?? bolum.id) !== bolum.id) continue;
        gorulen.add(anahtar);
        dersler.push({ uni, bolum, ders, yol: `/${uni.id}/${bolum.id}/${ders.id}/` });
      }
    }
    if (bolumler.length > 0) sonuc.push({ uni, yol: `/${uni.id}/`, bolumler, dersler });
  }
  return sonuc;
}

const xmlKacis = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** A urlset sitemap. lastmod is left out on purpose: the CI checkout has no per-file dates to trust. */
export function sitemapXml(site: Site, yollar: readonly string[]): string {
  const satirlar = yollar.map((y) => `  <url><loc>${xmlKacis(mutlakUrl(site, y))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${satirlar.join("\n")}\n</urlset>\n`;
}

export function sitemapDiziniXml(site: Site, dosyalar: readonly string[]): string {
  const satirlar = dosyalar.map((y) => `  <sitemap><loc>${xmlKacis(mutlakUrl(site, y))}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${satirlar.join("\n")}\n</sitemapindex>\n`;
}

export const universiteSitemapYolu = (uniId: string) => `/sitemap-${uniId}.xml`;
export const SAYFALAR_SITEMAP = "/sitemap-sayfalar.xml";
export const SITEMAP_DIZINI = "/sitemap-index.xml";

/** Pages of one university: its own page, departments with questions and canonical course pages. */
export function universiteYollari(k: KatalogUniversitesi): string[] {
  return [k.yol, ...k.bolumler.map((b) => b.yol), ...k.dersler.map((d) => d.yol)];
}

export const xmlYaniti = (govde: string) =>
  new Response(govde, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
export const metinYaniti = (govde: string, tur = "text/plain") =>
  new Response(govde, { headers: { "Content-Type": `${tur}; charset=utf-8` } });
