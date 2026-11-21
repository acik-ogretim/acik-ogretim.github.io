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
/** PNG header: width and height from the IHDR chunk. */
function pngBoyutu(yol: string) {
  const b = fs.readFileSync(yol);
  expect(b.subarray(1, 4).toString("latin1"), `${yol} PNG imzası`).toBe("PNG");
  return { genislik: b.readUInt32BE(16), yukseklik: b.readUInt32BE(20), bayt: b.length };
}
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
  it("paylaşım görseli: sayfaya özel 1200x630 PNG var, meta etiketleri boyutla uyuşur; yoksa kare logo", () => {
    let kartli = 0;
    for (const f of htmller) {
      const html = oku(f);
      if (yonlendirmeMi(html)) continue;
      const ad = path.relative(KOK, f);
      const gorsel = ozellik(html, /<meta property="og:image" content="([^"]+)"/)!;
      const g = Number(ozellik(html, /<meta property="og:image:width" content="(\d+)"/));
      const y = Number(ozellik(html, /<meta property="og:image:height" content="(\d+)"/));
      expect(ozellik(html, /<meta name="twitter:image" content="([^"]+)"/), `${ad} twitter:image`).toBe(gorsel);
      expect(ozellik(html, /<meta property="og:image:alt" content="([^"]+)"/)?.length ?? 0, `${ad} og:image:alt`).toBeGreaterThan(5);
      if (gorsel.includes("/og/")) {
        const dosya = urldenDosya(gorsel);
        expect(fs.existsSync(dosya), `${ad}: ${gorsel} dosyası yok`).toBe(true);
        const b = pngBoyutu(dosya);
        expect({ g: b.genislik, y: b.yukseklik }, `${ad} gerçek boyut`).toEqual({ g: 1200, y: 630 });
        expect({ g, y }, `${ad} meta boyutu`).toEqual({ g: 1200, y: 630 });
        expect(b.bayt, `${ad} görsel boyutu`).toBeLessThan(150 * 1024);
        expect(html, ad).toContain('property="og:image:type" content="image/png"');
        expect(html, ad).toContain('name="twitter:card" content="summary_large_image"');
        // second og:image: the native square (800x800), after the wide card; twitter keeps the wide one
        const resimler = [...html.matchAll(/<meta property="og:image" content="([^"]+)"/g)].map((m) => m[1]);
        expect(resimler, `${ad} iki og:image`).toHaveLength(2);
        expect(resimler[0], ad).toBe(gorsel);
        expect(resimler[1], `${ad} kare görsel yolu`).toContain("/og/kare/");
        const kareDosya = urldenDosya(resimler[1]);
        expect(fs.existsSync(kareDosya), `${ad}: ${resimler[1]} dosyası yok`).toBe(true);
        const kb = pngBoyutu(kareDosya);
        expect({ g: kb.genislik, y: kb.yukseklik }, `${ad} kare gerçek boyut`).toEqual({ g: 800, y: 800 });
        expect(kb.bayt, `${ad} kare boyutu`).toBeLessThan(150 * 1024);
        expect([...html.matchAll(/<meta property="og:image:width" content="(\d+)"/g)].map((m) => m[1]), ad).toEqual(["1200", "800"]);
        expect([...html.matchAll(/<meta property="og:image:height" content="(\d+)"/g)].map((m) => m[1]), ad).toEqual(["630", "800"]);
        expect([...html.matchAll(/<meta property="og:image:type" content="([^"]+)"/g)].map((m) => m[1]), ad).toEqual(["image/png", "image/png"]);
        expect(html.match(/<meta property="og:image:alt"/g), `${ad} iki alt`).toHaveLength(2);
        kartli++;
      } else {
        expect({ g, y }, `${ad} yedek logo`).toEqual({ g: 512, y: 512 });
        expect(html, ad).toContain('name="twitter:card" content="summary"');
      }
    }
    expect(kartli).toBeGreaterThan(5);
  });

  it("site haritasındaki ana sayfa, üniversite, bölüm ve ders sayfalarının hepsinin kendi paylaşım görseli var", () => {
    const dizin = oku(path.join(KOK, "sitemap-index.xml"));
    for (const h of [...dizin.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
      for (const u of [...oku(urldenDosya(h)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"))) {
        const html = oku(urldenDosya(u));
        const gorsel = ozellik(html, /<meta property="og:image" content="([^"]+)"/)!;
        expect(gorsel, `${u} sayfaya özel görsel`).toContain("/og/");
        const alt = ozellik(html, /<meta property="og:image:alt" content="([^"]*)"/)!;
        const sayfa = new URL(u).pathname.split("/").filter(Boolean);
        if (sayfa.length === 3) {
          // course page: the alt text carries the same past-exam count as the meta description
          const cikmis = /([\d.]+) çıkmış soru/.exec(ozellik(html, /<meta name="description" content="([^"]*)"/) ?? "")?.[1];
          // the description is cut at 160 characters, so a long course name may drop the count: compare only when present
          if (cikmis) expect(alt, `${u} alt ile açıklama aynı sayıyı söylemeli`).toContain(`${cikmis} çıkmış soru`);
        }
      }
    }
  });
});
