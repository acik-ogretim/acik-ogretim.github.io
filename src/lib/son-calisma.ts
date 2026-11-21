// "Kaldığın yer": the last question the learner was on, written by the course page and read by the
// home page. Device-local (not carried by /yedek): it only points back into a course page.

export const SON_CALISMA_ANAHTARI = "son-calisma";

export type SonCalisma = {
  /** Course page path, e.g. /auzef/cocuk-gelisimi/erken-cocukluk. */
  yol: string;
  ad: string;
  /** Element id of the question card to jump back to. */
  hedef: string;
  unite: number;
  sira: number;
  uniteToplam: number;
  /** Date.now() of the last write. */
  zaman: number;
};

export function sonCalismaOku(ham: string | null): SonCalisma | null {
  if (!ham) return null;
  try {
    const v = JSON.parse(ham) as Partial<SonCalisma>;
    const sayi = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
    if (typeof v.yol !== "string" || !v.yol.startsWith("/") || typeof v.ad !== "string" || !v.ad) return null;
    if (typeof v.hedef !== "string" || !/^question-\d+-\d+$/.test(v.hedef)) return null;
    if (!sayi(v.unite) || !sayi(v.sira) || !sayi(v.uniteToplam) || !sayi(v.zaman)) return null;
    return { yol: v.yol, ad: v.ad, hedef: v.hedef, unite: v.unite, sira: v.sira, uniteToplam: v.uniteToplam, zaman: v.zaman };
  } catch {
    return null;
  }
}

/** "Ünite 4 · Soru 12 / 40" ("Diğer sorular" for unit 0). */
export const sonCalismaMetni = (s: SonCalisma): string =>
  `${s.unite === 0 ? "Diğer sorular" : `Ünite ${s.unite}`} · Soru ${s.sira} / ${s.uniteToplam}`;
