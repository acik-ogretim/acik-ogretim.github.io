// Checks the built site for search and agent metadata. Runs only when SEO_DIST points at a build:
//   ONIZLEME_BOLUMLERI="auzef/hemsirelik-lisans-tamamlama" npx astro build --outDir dist-seo
//   SEO_DIST=dist-seo npx vitest run scripts/tests/seo-dist.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { yapisalVeriDenetle } from "../../src/lib/yapisal-veri";

const KOK = process.env.SEO_DIST ? path.resolve(process.env.SEO_DIST) : "";
const SITE = "https://acik-ogretim.github.io";

function dosyalar(dizin: string, uzanti: string, sonuc: string[] = []): string[] {
  for (const ad of fs.readdirSync(dizin, { withFileTypes: true })) {
    const yol = path.join(dizin, ad.name);
    if (ad.isDirectory()) {
      if (ad.name !== "_astro") dosyalar(yol, uzanti, sonuc);
    } else if (ad.name.endsWith(uzanti)) sonuc.push(yol);
  }
  return sonuc;
}
const oku = (y: string) => fs.readFileSync(y, "utf-8");
const urldenDosya = (u: string) => {
  const yol = decodeURI(new URL(u).pathname);
  return path.join(KOK, yol.endsWith("/") ? `${yol}index.html` : yol);
};
const ozellik = (html: string, re: RegExp) => re.exec(html)?.[1];
const yonlendirmeMi = (html: string) => /<meta http-equiv="refresh"/i.test(html);

describe.skipIf(!KOK)("derlenmiş site: arama ve ajan meta verisi", () => {
  const htmller = KOK ? dosyalar(KOK, ".html").filter((f) => !f.endsWith("google0d22887dbe37facb.html")) : [];

  it("robots.txt site haritasını gösterir ve /veri/ dışında her yeri açar", () => {
    const r = oku(path.join(KOK, "robots.txt"));
    expect(r).toMatch(/^Sitemap: https:\/\/\S+\/sitemap-index\.xml$/m);
    expect(r).toContain("User-agent: *\nAllow: /\nDisallow: /veri/");
    expect(r).not.toMatch(/Disallow: \/\s*$/m);
  });

  it("site haritası dizinindeki her harita var; her adres 200 dönecek kanonik ve dizinlenebilir bir sayfa", () => {
    const dizin = oku(path.join(KOK, "sitemap-index.xml"));
    const haritalar = [...dizin.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(haritalar.length).toBeGreaterThan(1);
    let adres = 0;
    for (const h of haritalar) {
      const xml = oku(urldenDosya(h));
      expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset /);
      const urller = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      expect(urller.length).toBeLessThanOrEqual(50000);
      expect(new Set(urller).size).toBe(urller.length);
      for (const u of urller) {
        const dosya = urldenDosya(u);
        expect(fs.existsSync(dosya), `${u} için dosya yok`).toBe(true);
        const html = oku(dosya);
        expect(yonlendirmeMi(html), `${u} yönlendirme sayfası`).toBe(false);
        expect(ozellik(html, /<link rel="canonical" href="([^"]+)"/), u).toBe(u);
        expect(html, `${u} noindex`).not.toContain('name="robots" content="noindex');
        adres++;
      }
    }
    expect(adres).toBeGreaterThan(5);
  });

  it("her sayfada kanonik, açıklama, Open Graph ve Twitter etiketleri; JSON-LD geçerli", () => {
    let ldSayisi = 0;
    for (const f of htmller) {
      const html = oku(f);
      if (yonlendirmeMi(html)) continue;
      const ad = path.relative(KOK, f);
      const kanonik = ozellik(html, /<link rel="canonical" href="([^"]+)"/);
      expect(kanonik, ad).toMatch(/^https:\/\//);
      const aciklama = ozellik(html, /<meta name="description" content="([^"]*)"/) ?? "";
      expect(aciklama.length, `${ad} açıklama`).toBeGreaterThan(30);
      expect(aciklama.length, `${ad} açıklama`).toBeLessThanOrEqual(160);
      for (const p of ["og:title", "og:description", "og:url", "og:image"]) expect(html, `${ad} ${p}`).toContain(`property="${p}"`);
      expect(html, ad).toContain('name="twitter:card"');
      expect(html.match(/<link rel="canonical"/g), `${ad} tek kanonik`).toHaveLength(1);
      expect(html.match(/<meta name="description"/g), `${ad} tek açıklama`).toHaveLength(1);
      for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const veri = JSON.parse(m[1]);
        expect(yapisalVeriDenetle(veri), ad).toEqual([]);
        ldSayisi++;
      }
    }
    expect(ldSayisi).toBeGreaterThan(3);
  });

  it("ders sayfası: Markdown özeti bağlı, LearningResource ve dört basamaklı kırıntı var", () => {
    const dersler = htmller.filter((f) => f.includes(`${path.sep}`) && path.relative(KOK, f).split(path.sep).length === 4);
    const dolu = dersler.map((f) => ({ f, html: oku(f) })).filter(({ html }) => !yonlendirmeMi(html) && html.includes('type="text/markdown"'));
    expect(dolu.length).toBeGreaterThan(0);
    for (const { f, html } of dolu) {
      const md = ozellik(html, /<link rel="alternate" type="text\/markdown" href="([^"]+)"/)!;
      expect(fs.existsSync(path.join(KOK, md)), md).toBe(true);
      const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]);
      const turler = ld["@graph"].map((d: { "@type": string }) => d["@type"]);
      expect(turler, f).toEqual(["BreadcrumbList", "LearningResource"]);
      expect(ld["@graph"][0].itemListElement).toHaveLength(4);
    }
  });

  it("llms.txt biçimi: H1, özet, bağlantılı listeler; llms-full.txt bütün özetlere bağlanır", () => {
    const l = oku(path.join(KOK, "llms.txt"));
    expect(l).toMatch(/^# .+\n\n> .+/);
    expect(l).toContain(`(${SITE}/llms-full.txt)`);
    expect(l).toMatch(/^## Optional$/m);
    const tam = oku(path.join(KOK, "llms-full.txt"));
    const ozetler = [...tam.matchAll(/\[özet\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(ozetler.length).toBeGreaterThan(0);
    for (const u of ozetler) expect(fs.existsSync(urldenDosya(u)), u).toBe(true);
  });

  it("ders özetleri en çok üç örnek soru taşır; üretilen metinde uzun ve orta çizgi yok", () => {
    const mdler = dosyalar(KOK, ".md");
    expect(mdler.length).toBeGreaterThan(0);
    for (const f of mdler) {
      const md = oku(f);
      expect(md.startsWith("# "), f).toBe(true);
      expect((md.match(/^ {3}- Doğru cevap:/gm) ?? []).length, f).toBeLessThanOrEqual(3);
    }
    for (const f of ["robots.txt", "llms.txt", "llms-full.txt"]) expect(oku(path.join(KOK, f)), f).not.toMatch(/[\u2013\u2014]/);
  });
});
