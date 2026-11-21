// Shared, pure pieces of the offline support: cache names, URL keys and the parsers that find what a course
// page needs. Used by the service worker (src/sw/sw.ts), the page modules next to this file and the build
// integration (src/integrations/cevrimdisi.ts), so the three always agree on keys. No DOM, no Cache API here.
// Strategy and names: docs/cevrimdisi.md.

/** Every cache this site creates starts with this; anything else under the origin is left alone. */
export const ONEK = "ao-";

export const ONBELLEK = {
  /** Hashed build assets (/_astro/*). Content addressed, so one cache serves every version. */
  varlik: "ao-varlik",
  /** Department pages, fetched in the background after the first visit. */
  bolum: "ao-bolum-v1",
  /** Downloaded courses: page, chat data, images and one metadata record per course. */
  ders: "ao-ders-v1",
  /** Pages the learner visited (small LRU), the fallback for pages that are neither shell nor download. */
  sayfa: "ao-sayfa-v1",
  /** Fonts, KaTeX and runtime images. */
  dis: "ao-dis-v1",
} as const;

/** Versioned app shell cache: one per service worker version, the old one is dropped on activate. */
export const kabukAdi = (surum: string): string => `${ONEK}kabuk-${surum}`;
export const KABUK_ONEKI = `${ONEK}kabuk-`;
/** Cache of the hand written worker before this one; removed on activate. */
export const ESKI_ONBELLEKLER = ["acik-ogretim-cache-v1"] as const;

/** Header the worker writes on cached shell and department pages: the build revision of that copy. */
export const SURUM_BASLIGI = "x-ao-surum";

/** Version manifests written at build time (small; per university so a learner only fetches their own). */
export const KOK_SURUM_YOLU = "/cevrimdisi-surum.json";
export const uniSurumYolu = (uni: string): string => `/cevrimdisi-surum/${uni}.json`;

/** Synthetic URL of a downloaded course's metadata record inside the course cache. */
export const META_ONEKI = "/__cevrimdisi__/";
export const metaYolu = (uni: string, ders: string): string => `${META_ONEKI}${uni}/${ders}.json`;

export const OFFLINE_YOLU = "/offline/";
export const YONETIM_YOLU = "/cevrimdisi/";

/** Navigation waits this long for the network before falling back to a stored copy. */
export const AG_BEKLEME_MS = 3000;
/** With no stored copy the page keeps waiting for the network up to this long, then shows /offline/. */
export const AG_SON_BEKLEME_MS = 15000;

/** Visited pages kept in ao-sayfa: course pages are large, so only the last few stay. */
export const SAYFA_SINIRI = { ders: 3, diger: 60 } as const;

const UZANTI = /\.[a-z0-9]{1,8}$/i;

/**
 * One key per page: "/offline", "/offline/" and "/offline/index.html" all become "/offline/".
 * Paths with a file extension (/sw.js, /veri/x.json) stay as they are. Repeated slashes collapse.
 */
export function yolNormalle(yol: string): string {
  let p = yol.replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/index\.html$/i, "/");
  const son = p.slice(p.lastIndexOf("/") + 1);
  if (son && !UZANTI.test(son)) p += "/";
  return p;
}

/** Absolute cache key: origin and normalized path, without query or hash (?bolum=, #question-3-1). */
export function anahtarUrl(adres: string | URL, taban?: string): string {
  const u = new URL(String(adres), taban);
  return `${u.origin}${yolNormalle(decodeURIComponent(u.pathname))}`;
}

export type DersYolu = { uni: string; bolum: string; ders: string };

const BOLUM = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * Parses a course path /uni/bolum/ders(/). Returns null for anything else, including /uni/bolum/ders/materyaller.
 * When `uniler` is given the first segment must be one of them.
 */
export function dersYolu(yol: string, uniler?: ReadonlySet<string>): DersYolu | null {
  const parcalar = yolNormalle(yol).split("/").filter(Boolean);
  if (parcalar.length !== 3) return null;
  const [uni, bolum, ders] = parcalar as [string, string, string];
  if (![uni, bolum, ders].every((s) => BOLUM.test(s))) return null;
  if (uniler && !uniler.has(uni)) return null;
  return { uni, bolum, ders };
}

/** Department page path /uni/bolum/ (two segments). */
export function bolumYolu(yol: string, uniler?: ReadonlySet<string>): { uni: string; bolum: string } | null {
  const parcalar = yolNormalle(yol).split("/").filter(Boolean);
  if (parcalar.length !== 2) return null;
  const [uni, bolum] = parcalar as [string, string];
  if (!BOLUM.test(uni) || !BOLUM.test(bolum) || (uniler && !uniler.has(uni))) return null;
  return { uni, bolum };
}

export const dersKimligi = (uni: string, ders: string): string => `${uni}/${ders}`;

/** Files a downloaded course keeps next to its page (paths are canonical, with the trailing slash). */
export function dersDosyalari(yol: string, uni: string, ders: string): { sayfa: string; materyal: string; veri: string } {
  const sayfa = yolNormalle(yol);
  return { sayfa, materyal: `${sayfa}materyaller/`, veri: `/veri/${uni}/${ders}.json` };
}

/**
 * Same-origin build files a page refers to: /_astro/* (scripts, styles, island components) and /_img/*
 * (question images moved out of the HTML after the build). Unique, in order of first appearance.
 */
export function sayfaVarliklari(html: string): { astro: string[]; img: string[] } {
  const astro = new Set<string>();
  const img = new Set<string>();
  for (const m of html.matchAll(/["'(=\s](\/_(astro|img)\/[^"'()\s?#<>]+)/g)) {
    const yol = m[1] as string;
    (m[2] === "astro" ? astro : img).add(yol);
  }
  return { astro: [...astro], img: [...img] };
}

/**
 * Relative imports of a built chunk ("./client.B1.js", import("./Sohbet.X.js")): the files a page needs
 * beyond the ones its HTML names. Returned as absolute /_astro/ paths.
 */
export function parcaBagimliliklari(js: string, dizin = "/_astro/"): string[] {
  const sonuc = new Set<string>();
  for (const m of js.matchAll(/["'`]\.\/([A-Za-z0-9_.@-]+\.(?:m?js|css))["'`]/g)) sonuc.add(`${dizin}${m[1]}`);
  return [...sonuc];
}

/** Course page text without build asset names, so a new JavaScript build alone does not mark every course changed. */
export function icerikIcinNormalle(html: string): string {
  return html.replace(/\/_astro\/[^"'()\s?#<>]+/g, "/_astro/").replace(/\sdata-astro-cid-[a-z0-9]+/g, "");
}

/** Course name from the page's #ders-adi heading (download metadata when nothing better is known). */
export function sayfadanDersAdi(html: string): string | null {
  const m = /<h1[^>]*id="ders-adi"[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (!m) return null;
  const metin = (m[1] as string)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
  return metin || null;
}

/** "1,4 MB", "820 KB": sizes as the learner reads them (decimal units, Turkish comma). */
export function boyutMetni(bayt: number): string {
  if (!Number.isFinite(bayt) || bayt <= 0) return "0 KB";
  const birim = bayt >= 1e9 ? ["GB", 1e9] : bayt >= 1e6 ? ["MB", 1e6] : ["KB", 1e3];
  const deger = bayt / (birim[1] as number);
  const yuvar = deger >= 100 || birim[0] === "KB" ? Math.max(1, Math.round(deger)) : Math.round(deger * 10) / 10;
  return `${String(yuvar).replace(".", ",")} ${birim[0]}`;
}
