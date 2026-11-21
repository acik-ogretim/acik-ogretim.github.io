// Share image renderer. Two designs from the same card data:
//  - "genis" 1200x630 (og:image): three zones. The centre column (630 px, the part a WhatsApp square crop keeps)
//    carries the site mark, course name, big fact and exam years; the 285 px side panels carry the details.
//  - "kare" 800x800 (second og:image): designed natively for squares, not cropped.
// satori lays the card out as SVG, resvg rasterizes it, sharp encodes it. Node only (build time); self-contained
// so scripts/og/olc.mts can import it without the Astro toolchain.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

export const OG_GENISLIK = 1200;
export const OG_YUKSEKLIK = 630;
export const OG_KARE = 800;
export const OG_SURUM = 8; // bump when the design changes (cache key)

const MAVI = "#2563B8";
const ZEMIN = "#FCFCFB";
const YUZEY = "#F2F5F8";
const MUREKKEP = "#111B2E";
const GRI = "#556070";
const CIZGI = "#DCE1E7";

/** One detail tile of the right panel: a bold figure with its label, or (kucuk) a short phrase with a caption. */
export type OgKutu = { baslik: string; etiket: string; kucuk?: boolean };

/** What one card shows. Every field except `baslik` is optional: missing data leaves the block out. */
export type OgKarti = {
  baslik: string;
  /** The big fact, e.g. { sayi: "1.240", etiket: "çıkmış soru" }. */
  buyuk?: { sayi: string; etiket: string };
  /** Exam-year lines under the big fact (one or two short lines). */
  yil?: string[];
  /** Left panel: university tag, main line (department), secondary line (degree), or a plain list (home). */
  sol?: { etiket?: string; renk?: string; ana?: string; alt?: string; liste?: string[] };
  /** Right panel tiles (at most four are drawn). */
  kutular?: OgKutu[];
  /** Plain-text facts for the og:image alt text. */
  ozet?: string;
};

const KOK = process.cwd();
const yazi = (ad: string) => fs.readFileSync(path.join(KOK, "scripts/og/fonts", ad));
let yazilar: { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: "normal" }[] | null = null;
function yazilariYukle() {
  yazilar ??= [
    { name: "Inter", data: yazi("Inter-Regular.otf"), weight: 400, style: "normal" },
    { name: "Inter", data: yazi("Inter-Medium.otf"), weight: 500, style: "normal" },
    { name: "Inter Display", data: yazi("InterDisplay-SemiBold.otf"), weight: 600, style: "normal" },
    { name: "Inter Display", data: yazi("InterDisplay-Bold.otf"), weight: 700, style: "normal" },
  ];
  return yazilar;
}

let logoUri: string | null = null;
function logo() {
  logoUri ??= `data:image/svg+xml;base64,${fs.readFileSync(path.join(KOK, "public/logo.svg")).toString("base64")}`;
  return logoUri;
}

type Dugum = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Dugum => ({
  type,
  props: { style, ...(children === undefined ? {} : { children }), ...extra },
});
const sutun = (style: Record<string, unknown>, c: unknown) => h("div", { display: "flex", flexDirection: "column", ...style }, c);
const metin = (style: Record<string, unknown>, c: string) => h("div", { display: "flex", ...style }, c);

/**
 * Largest title size whose estimated lines (max 3) fit the box; Inter Display Bold averages ~0.57 em per glyph.
 * Titles that still do not fit at the smallest size are cut with an ellipsis (lineClamp).
 */
export function baslikBoyutu(text: string, genislik: number, yukseklik: number, enBuyuk = 96): number {
  for (const boyut of [96, 84, 72, 64, 56, 48, 42, 38]) {
    if (boyut > enBuyuk) continue;
    const harf = Math.floor(genislik / (0.53 * boyut));
    const satir = Math.ceil(text.length / (harf * 0.9));
    if (satir <= 3 && satir * boyut * 1.1 <= yukseklik) return boyut;
  }
  return 36;
}

/** "#rrggbb" + alpha as an rgba() string, for the tinted university tag. */
function seffaf(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(37,99,184,${a})`;
  const n = Number.parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const etiketKutusu = (etiket: string, renk: string | undefined, boyut: number) => {
  const r = renk && /^#[0-9a-f]{6}$/i.test(renk) ? renk : MAVI;
  return h(
    "div",
    { display: "flex", alignSelf: "flex-start", padding: `${Math.round(boyut * 0.22)}px ${Math.round(boyut * 0.55)}px`, borderRadius: 999, backgroundColor: seffaf(r, 0.1), color: r, fontFamily: "Inter", fontWeight: 500, fontSize: boyut },
    etiket,
  );
};

const baslikDugumu = (text: string, boyut: number) =>
  h("div", { display: "block", fontFamily: "Inter Display", fontWeight: 700, fontSize: boyut, lineHeight: 1.1, letterSpacing: boyut > 80 ? -2 : -1, color: MUREKKEP, lineClamp: 3, textOverflow: "ellipsis" }, text);

function buyukOlgu(k: OgKarti, sayiBoyut: number, etiketBoyut: number): Dugum[] {
  if (!k.buyuk) return [];
  return [
    h("div", { display: "flex", alignItems: "baseline" }, [
      metin({ fontFamily: "Inter Display", fontWeight: 700, fontSize: sayiBoyut, letterSpacing: -1.5, color: MUREKKEP, marginRight: 12 }, k.buyuk.sayi),
      metin({ fontFamily: "Inter Display", fontWeight: 600, fontSize: etiketBoyut, color: MUREKKEP }, k.buyuk.etiket),
    ]),
  ];
}

function yilSatirlari(k: OgKarti, boyut: number): Dugum[] {
  return (k.yil ?? []).map((t, i) => metin({ fontFamily: "Inter", fontWeight: i === 0 ? 500 : 400, fontSize: boyut, lineHeight: 1.3, color: i === 0 ? MUREKKEP : GRI, marginTop: i === 0 ? 8 : 0 }, t));
}

// ---------------------------------------------------------------- wide card (1200x630)

const KENAR = 48;
const PANEL = 285;
const ORTA = OG_GENISLIK - 2 * PANEL; // 630

function solPanel(k: OgKarti): Dugum {
  const s = k.sol ?? {};
  const ic: Dugum[] = [];
  if (s.etiket) ic.push(etiketKutusu(s.etiket, s.renk, 26));
  if (s.ana) ic.push(h("div", { display: "block", marginTop: s.etiket ? 24 : 0, fontFamily: "Inter Display", fontWeight: 600, fontSize: 30, lineHeight: 1.18, color: MUREKKEP, lineClamp: 4, textOverflow: "ellipsis" }, s.ana));
  if (s.alt) ic.push(h("div", { display: "block", marginTop: 12, fontFamily: "Inter", fontWeight: 400, fontSize: 24, lineHeight: 1.25, color: GRI, lineClamp: 3, textOverflow: "ellipsis" }, s.alt));
  for (const [i, l] of (s.liste ?? []).entries()) {
    ic.push(metin({ fontFamily: "Inter", fontWeight: 500, fontSize: 28, color: i === 0 ? MUREKKEP : MUREKKEP, paddingTop: i === 0 ? 0 : 14, marginTop: i === 0 ? 0 : 14, borderTop: i === 0 ? "none" : `1px solid ${CIZGI}` }, l));
  }
  return sutun({ width: PANEL, height: OG_YUKSEKLIK, backgroundColor: YUZEY, borderRight: `1px solid ${CIZGI}`, padding: `${KENAR}px 32px`, boxSizing: "border-box" }, ic);
}

function sagPanel(k: OgKarti): Dugum {
  const kutular = (k.kutular ?? []).slice(0, 4).map((b, i) =>
    sutun({ paddingTop: i === 0 ? 0 : 16, marginTop: i === 0 ? 0 : 16, borderTop: i === 0 ? "none" : `1px solid ${CIZGI}` }, [
      b.kucuk
        ? h("div", { display: "block", fontFamily: "Inter Display", fontWeight: 600, fontSize: 26, lineHeight: 1.15, color: MUREKKEP, lineClamp: 3, textOverflow: "ellipsis" }, b.baslik)
        : metin({ fontFamily: "Inter Display", fontWeight: 700, fontSize: 40, letterSpacing: -1, color: MUREKKEP }, b.baslik),
      metin({ fontFamily: "Inter", fontWeight: 400, fontSize: 22, color: GRI, marginTop: 2 }, b.etiket),
    ]),
  );
  return h(
    "div",
    { display: "flex", flexDirection: "column", justifyContent: "space-between", width: PANEL, height: OG_YUKSEKLIK, backgroundColor: YUZEY, borderLeft: `1px solid ${CIZGI}`, padding: `${KENAR}px 32px`, boxSizing: "border-box" },
    [sutun({}, kutular), h("img", { width: 56, height: 56 }, undefined, { src: logo(), width: 56, height: 56 })],
  );
}

function agacGenis(k: OgKarti): Dugum {
  const yilSatiri = (k.yil ?? []).length;
  const olguY = (k.buyuk ? 74 : 0) + yilSatiri * 34 + (yilSatiri ? 8 : 0);
  const siteY = 58;
  const oda = OG_YUKSEKLIK - 2 * KENAR - siteY - olguY - 36;
  const boyut = baslikBoyutu(k.baslik, ORTA - 2 * KENAR, oda, 72);
  const orta = sutun({ width: ORTA, height: OG_YUKSEKLIK, padding: `${KENAR}px`, boxSizing: "border-box", backgroundColor: ZEMIN }, [
    sutun({ height: siteY }, [
      metin({ fontFamily: "Inter Display", fontWeight: 600, fontSize: 26, color: MAVI }, "Açık Öğretim Portal"),
      metin({ fontFamily: "Inter", fontWeight: 400, fontSize: 19, color: GRI, marginTop: 2 }, "acik-ogretim.github.io"),
    ]),
    sutun({ flexGrow: 1, justifyContent: "center" }, [baslikDugumu(k.baslik, boyut)]),
    sutun({ minHeight: olguY }, [...buyukOlgu(k, 64, 30), ...yilSatirlari(k, 27)]),
  ]);
  return h("div", { display: "flex", width: OG_GENISLIK, height: OG_YUKSEKLIK, backgroundColor: ZEMIN }, [solPanel(k), orta, sagPanel(k)]);
}

// ---------------------------------------------------------------- square card (800x800)

function agacKare(k: OgKarti): Dugum {
  const M = 56;
  const s = k.sol ?? {};
  const baglamMetni = [s.ana, s.alt].filter(Boolean).join(" · ") || (s.liste ?? []).join(" · ");
  const baglam: Dugum[] = [];
  if (s.etiket) baglam.push(etiketKutusu(s.etiket, s.renk, 26));
  if (baglamMetni) baglam.push(h("div", { display: "block", marginLeft: s.etiket ? 16 : 0, fontFamily: "Inter", fontWeight: 500, fontSize: 26, color: GRI, lineClamp: 1, textOverflow: "ellipsis", flexShrink: 1 }, baglamMetni));
  const yilSatiri = (k.yil ?? []).length;
  const olguY = (k.buyuk ? 92 : 0) + yilSatiri * 40 + (yilSatiri ? 8 : 0);
  const oda = OG_KARE - 2 * M - 48 - olguY - 96 - 60;
  const boyut = baslikBoyutu(k.baslik, OG_KARE - 2 * M, oda, 92);
  return sutun({ width: OG_KARE, height: OG_KARE, backgroundColor: ZEMIN, padding: M, boxSizing: "border-box" }, [
    h("div", { display: "flex", alignItems: "center", height: 48, overflow: "hidden" }, baglam),
    sutun({ flexGrow: 1, justifyContent: "center" }, [baslikDugumu(k.baslik, boyut)]),
    sutun({ marginBottom: 36 }, [...buyukOlgu(k, 78, 36), ...yilSatirlari(k, 30)]),
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `2px solid ${CIZGI}`, paddingTop: 24 }, [
      sutun({}, [
        metin({ fontFamily: "Inter Display", fontWeight: 600, fontSize: 32, color: MAVI }, "Açık Öğretim Portal"),
        metin({ fontFamily: "Inter", fontWeight: 400, fontSize: 24, color: GRI, marginTop: 4 }, "acik-ogretim.github.io"),
      ]),
      h("img", { width: 72, height: 72 }, undefined, { src: logo(), width: 72, height: 72 }),
    ]),
  ]);
}

export type OgDuzen = "genis" | "kare";

/** Rasterizes one card to a PNG buffer: 1200x630 ("genis") or 800x800 ("kare"). */
export async function kartPng(k: OgKarti, duzen: OgDuzen = "genis"): Promise<Buffer> {
  const [g, y, agac] = duzen === "genis" ? [OG_GENISLIK, OG_YUKSEKLIK, agacGenis(k)] : [OG_KARE, OG_KARE, agacKare(k)];
  const svg = await satori(agac as never, { width: g, height: y, fonts: yazilariYukle() });
  return new Resvg(svg, { fitTo: { mode: "width", value: g }, font: { loadSystemFonts: false } }).render().asPng();
}

export type OgBicim = "jpg" | "png" | "webp";

/** Encodes the rasterized card. Palette PNG is the smallest and keeps thin text crisp; JPEG and WebP stay for measuring. */
export function kodla(png: Buffer, bicim: OgBicim): Promise<Buffer> {
  const s = sharp(png);
  if (bicim === "jpg") return s.jpeg({ quality: 82, progressive: true, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer();
  if (bicim === "webp") return s.webp({ quality: 80, effort: 4 }).toBuffer();
  return s.png({ palette: true, quality: 90, effort: 2, colours: 128, dither: 0, compressionLevel: 9 }).toBuffer();
}
