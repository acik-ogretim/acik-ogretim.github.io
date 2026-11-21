// Page head helpers shared by SeoHead.astro, the sitemaps, llms.txt and the course summaries.
// Pure functions only, so they run in the build and in unit tests alike.

export const SITE_ADI = "Açık Öğretim Portal";
export const VARSAYILAN_ACIKLAMA =
  "Anadolu AÖF, Atatürk AÖF, İstanbul AUZEF ve Ankara ANKUZEF öğrencileri için ücretsiz çalışma portalı: çıkmış sorular, ünite ünite alıştırmalar ve açıklamalı çözümler.";
/** Square logo used as the share image (public/og-logo-512.png). */
export const PAYLASIM_GORSELI = { yol: "/og-logo-512.png", genislik: 512, yukseklik: 512 } as const;
export const DEPO_ADRESI = "https://github.com/acik-ogretim";

/** Site origin without a trailing slash; the CI passes the Pages origin through `--site`. */
export function siteKoku(site: URL | string | undefined): string {
  const ham = site ? String(site) : "https://acik-ogretim.github.io";
  return ham.replace(/\/+$/, "");
}

/**
 * Canonical path of a page: directory-format builds are served with a trailing slash
 * (GitHub Pages redirects /x to /x/), files such as /robots.txt keep their name.
 */
export function kanonikYol(pathname: string): string {
  const yol = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (yol === "" || yol === "/") return "/";
  const son = yol.split("/").pop() ?? "";
  if (son.includes(".")) return yol;
  return yol.endsWith("/") ? yol : `${yol}/`;
}

export function mutlakUrl(site: URL | string | undefined, yol: string): string {
  if (/^https?:\/\//.test(yol)) return yol;
  return `${siteKoku(site)}${yol.startsWith("/") ? yol : `/${yol}`}`;
}

/** Cuts at a word boundary and adds an ellipsis; search results show about 150-160 characters. */
export function kisalt(metin: string, sinir = 160): string {
  const temiz = metin.replace(/\s+/g, " ").trim();
  if (temiz.length <= sinir) return temiz;
  const kesik = temiz.slice(0, sinir - 1);
  const bosluk = kesik.lastIndexOf(" ");
  return `${(bosluk > sinir * 0.6 ? kesik.slice(0, bosluk) : kesik).replace(/[\s,;:.·-]+$/, "")}…`;
}

export type DersOzetBilgisi = {
  dersAdi: string;
  kod?: string;
  universite: string;
  bolum: string;
  soru: number;
  cikmis: number;
  yillar: number[];
};

/** Meta description of a course page: course, university, question counts and exam years. */
export function dersAciklamasi(d: DersOzetBilgisi): string {
  const kod = d.kod ? ` (${d.kod})` : "";
  const yil =
    d.yillar.length === 0 ? "" : d.yillar.length === 1 ? `, ${d.yillar[0]} sınavları` : `, ${d.yillar[0]}-${d.yillar[d.yillar.length - 1]} sınavları`;
  const cikmis = d.cikmis > 0 ? ` (${d.cikmis} çıkmış soru${yil})` : "";
  return kisalt(`${d.dersAdi}${kod} dersi, ${d.universite} ${d.bolum}: ${d.soru} soru${cikmis} ve ünite ünite açıklamalı çözümler. Ücretsiz çalışma sayfası.`);
}

/** Serializes JSON-LD for a <script> tag; "<" is escaped so the data can never close the tag. */
export function jsonLdMetni(veri: unknown): string {
  return JSON.stringify(veri).replace(/</g, "\\u003c");
}
