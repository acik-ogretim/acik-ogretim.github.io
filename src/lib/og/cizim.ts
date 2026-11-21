// Share image (1200x630) renderer: satori lays the card out as SVG, resvg rasterizes it, sharp encodes it.
// Node only (build time). Self-contained on purpose: scripts/og/olc.mts imports it without the Astro toolchain.
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

export const OG_GENISLIK = 1200;
export const OG_YUKSEKLIK = 630;
export const OG_SURUM = 5; // bump when the design changes (cache key)

const MAVI = "#2563B8";
const ZEMIN = "#FCFCFB";
const MUREKKEP = "#111B2E";
const GRI = "#556070";
const CIZGI = "#E2E6EB";
const KENAR = 64;

/** What one card shows. Every field except `baslik` is optional: missing data leaves the line out. */
export type OgKarti = {
  baslik: string;
  /** Small tag before the context text (university short name); `renk` tints it. */
  etiket?: string;
  renk?: string;
  baglam?: string;
  /** The big fact, e.g. { sayi: "1.240", etiket: "çıkmış soru" }. */
  buyuk?: { sayi: string; etiket: string };
  /** Supporting lines under the big fact (exam years, then totals), already formatted. */
  satirlar?: string[];
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

const ICERIK_YUKSEKLIGI = OG_YUKSEKLIK - 2 * KENAR; // 502
const ICERIK_GENISLIGI = OG_GENISLIK - 2 * KENAR; // 1072
const BAGLAM_Y = 44;
const ALT_BANT_Y = 96;
const OLGU_ARASI = 30;
const BUYUK_Y = 62;
const BUYUK_ARA = 6;
const SATIR_Y = 36;

/** Largest title size whose estimated lines (max 3) fit the room the facts leave; Inter Display Bold averages ~0.55 em per glyph. */
export function baslikBoyutu(metin: string, satirSayisi = 0, buyukVar = false): number {
  const oda = ICERIK_YUKSEKLIGI - BAGLAM_Y - ALT_BANT_Y - 40 - (satirSayisi || buyukVar ? OLGU_ARASI : 0) - (buyukVar ? BUYUK_Y + BUYUK_ARA : 0) - satirSayisi * SATIR_Y;
  for (const boyut of [96, 80, 68, 60, 54, 48]) {
    const harf = Math.floor(ICERIK_GENISLIGI / (0.57 * boyut));
    const satir = Math.ceil(metin.length / (harf * 0.88));
    if (satir <= 3 && satir * boyut * 1.1 <= oda) return boyut;
  }
  return 44;
}

/** "#rrggbb" + alpha as an rgba() string, for the tinted university tag. */
function seffaf(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(37,99,184,${a})`;
  const n = Number.parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function agac(k: OgKarti): Dugum {
  const renk = k.renk && /^#[0-9a-f]{6}$/i.test(k.renk) ? k.renk : MAVI;
  const baglam: Dugum[] = [];
  if (k.etiket) {
    baglam.push(
      h(
        "div",
        { display: "flex", padding: "6px 16px", borderRadius: 999, backgroundColor: seffaf(renk, 0.1), color: renk, fontFamily: "Inter", fontWeight: 500, fontSize: 28 },
        k.etiket,
      ),
    );
  }
  if (k.baglam) baglam.push(h("div", { display: "flex", color: GRI, fontFamily: "Inter", fontWeight: 500, fontSize: 28, marginLeft: k.etiket ? 18 : 0 }, k.baglam));

  const satirlar = k.satirlar ?? [];
  const olgular: Dugum[] = [];
  if (k.buyuk) {
    olgular.push(
      h("div", { display: "flex", alignItems: "baseline", height: BUYUK_Y, marginBottom: BUYUK_ARA }, [
        h("div", { display: "flex", fontFamily: "Inter Display", fontWeight: 700, fontSize: 56, letterSpacing: -1, color: MUREKKEP, marginRight: 14 }, k.buyuk.sayi),
        h("div", { display: "flex", fontFamily: "Inter Display", fontWeight: 600, fontSize: 32, color: MUREKKEP }, k.buyuk.etiket),
      ]),
    );
  }
  satirlar.forEach((t, i) =>
    olgular.push(h("div", { display: "flex", height: SATIR_Y, alignItems: "center", fontFamily: "Inter", fontWeight: i === 0 ? 500 : 400, fontSize: 27, color: GRI }, t)),
  );

  const boyut = baslikBoyutu(k.baslik, satirlar.length, !!k.buyuk);
  return h(
    "div",
    { display: "flex", flexDirection: "column", width: OG_GENISLIK, height: OG_YUKSEKLIK, backgroundColor: ZEMIN, padding: KENAR, boxSizing: "border-box" },
    [
      h("div", { display: "flex", alignItems: "center", height: BAGLAM_Y }, baglam),
      h("div", { display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, paddingTop: 6, paddingBottom: 6 }, [
        h(
          "div",
          {
            display: "block",
            fontFamily: "Inter Display",
            fontWeight: 700,
            fontSize: boyut,
            lineHeight: 1.1,
            letterSpacing: boyut > 80 ? -2 : -1.2,
            color: MUREKKEP,
            lineClamp: 3,
            textOverflow: "ellipsis",
          },
          k.baslik,
        ),
      ]),
      ...(olgular.length ? [h("div", { display: "flex", flexDirection: "column", marginBottom: OLGU_ARASI }, olgular)] : []),
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `2px solid ${CIZGI}`, paddingTop: 24 }, [
        h("div", { display: "flex", flexDirection: "column" }, [
          h("div", { display: "flex", fontFamily: "Inter Display", fontWeight: 600, fontSize: 32, color: MAVI }, "Açık Öğretim Portal"),
          h("div", { display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 24, color: GRI, marginTop: 4 }, "acik-ogretim.github.io"),
        ]),
        h("img", { width: 64, height: 64 }, undefined, { src: logo(), width: 64, height: 64 }),
      ]),
    ],
  );
}

/** Rasterizes one card to a PNG buffer (1200x630). */
export async function kartPng(k: OgKarti): Promise<Buffer> {
  const svg = await satori(agac(k) as never, { width: OG_GENISLIK, height: OG_YUKSEKLIK, fonts: yazilariYukle() });
  return new Resvg(svg, { fitTo: { mode: "width", value: OG_GENISLIK }, font: { loadSystemFonts: false } }).render().asPng();
}

export type OgBicim = "jpg" | "png" | "webp";

/** Encodes the rasterized card. JPEG keeps full chroma resolution so thin text stays crisp. */
export function kodla(png: Buffer, bicim: OgBicim): Promise<Buffer> {
  const s = sharp(png);
  if (bicim === "jpg") return s.jpeg({ quality: 82, progressive: true, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer();
  if (bicim === "webp") return s.webp({ quality: 80, effort: 4 }).toBuffer();
  return s.png({ palette: true, quality: 90, effort: 2, colours: 128, dither: 0, compressionLevel: 9 }).toBuffer();
}
