// JSON-LD builders and their validator. Only types Google still supports for this site are emitted
// (docs/yz-ve-ajan-hazirligi.md): Organization and WebSite on the home page, BreadcrumbList on every
// catalog page, and a schema.org LearningResource describing the study page of a course.
// Course list and Education Q&A rich results are English-only (and Course Info was retired in 2025),
// so Course is only named as the topic (`about`) of the resource, never as a top-level item.
import { z } from "zod";
import { DEPO_ADRESI, PAYLASIM_GORSELI, SITE_ADI, VARSAYILAN_ACIKLAMA, mutlakUrl, siteKoku } from "./seo";

type Site = URL | string | undefined;
export type JsonLdDugum = Record<string, unknown> & { "@type": string };
export type JsonLdGraf = { "@context": "https://schema.org"; "@graph": JsonLdDugum[] };

export const organizasyonKimligi = (site: Site) => `${siteKoku(site)}/#organizasyon`;
export const siteKimligi = (site: Site) => `${siteKoku(site)}/#site`;

export function graf(...dugumler: JsonLdDugum[]): JsonLdGraf {
  return { "@context": "https://schema.org", "@graph": dugumler };
}

export function organizasyon(site: Site): JsonLdDugum {
  return {
    "@type": "Organization",
    "@id": organizasyonKimligi(site),
    name: SITE_ADI,
    url: mutlakUrl(site, "/"),
    logo: { "@type": "ImageObject", url: mutlakUrl(site, PAYLASIM_GORSELI.yol), width: PAYLASIM_GORSELI.genislik, height: PAYLASIM_GORSELI.yukseklik },
    description: VARSAYILAN_ACIKLAMA,
    sameAs: [DEPO_ADRESI],
  };
}

/** SearchAction points at /ara; Google retired the sitelinks search box (2024) but agents still read it. */
export function webSitesi(site: Site): JsonLdDugum {
  return {
    "@type": "WebSite",
    "@id": siteKimligi(site),
    name: SITE_ADI,
    alternateName: "AÖF Portal",
    url: mutlakUrl(site, "/"),
    inLanguage: "tr",
    publisher: { "@id": organizasyonKimligi(site) },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: mutlakUrl(site, "/ara/?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

export type KirintiOgesi = { ad: string; yol: string };

export function kirintiListesi(site: Site, ogeler: KirintiOgesi[]): JsonLdDugum {
  return {
    "@type": "BreadcrumbList",
    itemListElement: ogeler.map((o, i) => ({ "@type": "ListItem", position: i + 1, name: o.ad, item: mutlakUrl(site, o.yol) })),
  };
}

export type DersKaynagiGirdisi = {
  yol: string;
  dersAdi: string;
  kod?: string;
  aciklama: string;
  dersAciklamasi?: string;
  universite: string;
  universiteAdresi?: string;
  derece: string;
  cikmis: number;
  alistirma: number;
  uniteler: string[];
};

export function dersKaynagi(site: Site, d: DersKaynagiGirdisi): JsonLdDugum {
  const url = mutlakUrl(site, d.yol);
  const turler = [d.cikmis > 0 ? "Çıkmış sınav soruları" : null, d.alistirma > 0 ? "Alıştırma soruları" : null].filter(
    (x): x is string => x !== null,
  );
  return {
    "@type": "LearningResource",
    "@id": `${url}#kaynak`,
    name: `${d.dersAdi} soruları ve çözümleri`,
    description: d.aciklama,
    url,
    inLanguage: "tr",
    isAccessibleForFree: true,
    learningResourceType: turler,
    educationalLevel: d.derece,
    ...(d.uniteler.length ? { teaches: d.uniteler } : {}),
    isPartOf: { "@id": siteKimligi(site) },
    publisher: { "@id": organizasyonKimligi(site) },
    about: {
      "@type": "Course",
      name: d.dersAdi,
      ...(d.kod ? { courseCode: d.kod } : {}),
      description: d.dersAciklamasi || d.aciklama,
      provider: {
        "@type": "CollegeOrUniversity",
        name: d.universite,
        ...(d.universiteAdresi ? { sameAs: d.universiteAdresi } : {}),
      },
    },
  };
}

// ---- Validation (unit tests and scripts/tests/seo-dist.test.ts) ----

const url = z.string().url().refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), "tam https adresi");
const metin = z.string().trim().min(1);
const ref = z.object({ "@id": url });

const OrganizasyonSema = z.object({ "@type": z.literal("Organization"), "@id": url, name: metin, url, logo: z.object({ url }), sameAs: z.array(url).optional() });
const WebSitesiSema = z.object({
  "@type": z.literal("WebSite"),
  "@id": url,
  name: metin,
  url,
  inLanguage: z.literal("tr"),
  potentialAction: z
    .object({
      "@type": z.literal("SearchAction"),
      target: z.object({ urlTemplate: url.refine((u) => u.includes("{search_term_string}"), "arama yer tutucusu") }),
      "query-input": z.literal("required name=search_term_string"),
    })
    .optional(),
});
const KirintiSema = z.object({
  "@type": z.literal("BreadcrumbList"),
  itemListElement: z
    .array(z.object({ "@type": z.literal("ListItem"), position: z.number().int().positive(), name: metin, item: url }))
    .min(1)
    .refine((l) => l.every((o, i) => o.position === i + 1), "position 1'den başlayıp sırayla artmalı"),
});
const KaynakSema = z.object({
  "@type": z.literal("LearningResource"),
  name: metin,
  description: metin.max(300),
  url,
  inLanguage: z.literal("tr"),
  isAccessibleForFree: z.literal(true),
  learningResourceType: z.array(metin).min(1),
  isPartOf: ref,
  publisher: ref,
  about: z.object({
    "@type": z.literal("Course"),
    name: metin,
    description: metin,
    provider: z.object({ "@type": z.literal("CollegeOrUniversity"), name: metin }),
  }),
});

const SEMALAR: Record<string, z.ZodTypeAny> = {
  Organization: OrganizasyonSema,
  WebSite: WebSitesiSema,
  BreadcrumbList: KirintiSema,
  LearningResource: KaynakSema,
};
/** Types that would promise a rich result this site cannot get (FAQ, HowTo, Turkish Quiz/Course). */
const YASAK = new Set(["FAQPage", "HowTo", "Quiz", "Course", "PracticeProblem", "QAPage"]);

/** Returns readable problems for one JSON-LD block (empty list = valid). */
export function yapisalVeriDenetle(veri: unknown): string[] {
  const sorunlar: string[] = [];
  const kok = z.object({ "@context": z.literal("https://schema.org"), "@graph": z.array(z.object({ "@type": z.string() }).passthrough()).min(1) }).safeParse(veri);
  if (!kok.success) return [`kök: ${kok.error.issues.map((i) => i.message).join("; ")}`];
  for (const dugum of kok.data["@graph"]) {
    const tur = dugum["@type"];
    if (YASAK.has(tur)) {
      sorunlar.push(`${tur}: bu site için Google uygunluğu yok, eklenmemeli`);
      continue;
    }
    const sema = SEMALAR[tur];
    if (!sema) {
      sorunlar.push(`${tur}: tanımsız tür`);
      continue;
    }
    const r = sema.safeParse(dugum);
    if (!r.success) sorunlar.push(...r.error.issues.map((i) => `${tur}.${i.path.join(".")}: ${i.message}`));
  }
  return sorunlar;
}
