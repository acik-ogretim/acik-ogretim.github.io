import { describe, expect, it } from "vitest";
import { dersAciklamasi, jsonLdMetni, kanonikYol, kisalt, mutlakUrl } from "./seo";
import { robotsMetni, YZ_TARAYICILARI } from "./robots";
import { sitemapDiziniXml, sitemapXml } from "./site-haritasi";

const SITE = "https://acik-ogretim.github.io/";

describe("kanonikYol", () => {
  it("dizin biçimli sayfaya eğik çizgi ekler, dosya adını korur", () => {
    expect(kanonikYol("/")).toBe("/");
    expect(kanonikYol("/auzef")).toBe("/auzef/");
    expect(kanonikYol("/auzef/cocuk-gelisimi/anatomi/")).toBe("/auzef/cocuk-gelisimi/anatomi/");
    expect(kanonikYol("/rehber/index.html")).toBe("/rehber/");
    expect(kanonikYol("/robots.txt")).toBe("/robots.txt");
  });
  it("mutlak adres site kökünü bir kez kullanır", () => {
    expect(mutlakUrl(SITE, "/llms.txt")).toBe("https://acik-ogretim.github.io/llms.txt");
    expect(mutlakUrl(new URL(SITE), "ara/")).toBe("https://acik-ogretim.github.io/ara/");
  });
});

describe("kisalt ve dersAciklamasi", () => {
  it("160 karakteri sözcük sınırında keser", () => {
    const uzun = "kelime ".repeat(60);
    const k = kisalt(uzun);
    expect(k.length).toBeLessThanOrEqual(160);
    expect(k.endsWith("…")).toBe(true);
  });
  it("ders açıklaması ders adını, üniversiteyi ve gerçek sayıları taşır", () => {
    const a = dersAciklamasi({ dersAdi: "Genel Muhasebe", kod: "İŞL101U", universite: "Anadolu AÖF", bolum: "İşletme", soru: 412, cikmis: 230, yillar: [2015, 2024] });
    expect(a).toContain("Genel Muhasebe (İŞL101U)");
    expect(a).toContain("Anadolu AÖF");
    expect(a).toContain("412 soru (230 çıkmış soru, 2015-2024 sınavları)");
    expect(a).toContain("230 çıkmış soru");
    expect(a.length).toBeLessThanOrEqual(160);
  });
  it("binlik sayıları Türkçe ayraçla yazar", () => {
    const a = dersAciklamasi({ dersAdi: "Ders", universite: "AUZEF", bolum: "Bölüm", soru: 2430, cikmis: 1240, yillar: [2016, 2024] });
    expect(a).toContain("2.430 soru (1.240 çıkmış soru");
  });
  it("çıkmış soru yoksa sınav yılı yazmaz", () => {
    const a = dersAciklamasi({ dersAdi: "Ders", universite: "AUZEF", bolum: "Bölüm", soru: 20, cikmis: 0, yillar: [] });
    expect(a).not.toContain("çıkmış");
  });
});

describe("jsonLdMetni", () => {
  it("< karakterini kaçırır, script etiketi kapanamaz", () => {
    const m = jsonLdMetni({ name: "</script><script>alert(1)</script>" });
    expect(m).not.toContain("</script>");
    expect(JSON.parse(m).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("site haritası ve robots.txt", () => {
  it("urlset ve dizin biçimi, & kaçışlı", () => {
    const x = sitemapXml(SITE, ["/", "/a&b/"]);
    expect(x).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(x).toContain("<loc>https://acik-ogretim.github.io/a&amp;b/</loc>");
    expect(sitemapDiziniXml(SITE, ["/sitemap-auzef.xml"])).toContain("<sitemap><loc>https://acik-ogretim.github.io/sitemap-auzef.xml</loc></sitemap>");
  });
  it("robots.txt bütün tarayıcılara açık, /veri/ kapalı, site haritası mutlak", () => {
    const r = robotsMetni(SITE);
    expect(r).toContain("User-agent: *\nAllow: /\nDisallow: /veri/");
    for (const t of ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot"]) expect(r).toContain(`User-agent: ${t}\n`);
    expect(YZ_TARAYICILARI.length).toBeGreaterThan(10);
    expect(r).toContain("Sitemap: https://acik-ogretim.github.io/sitemap-index.xml");
    // Every named crawler group ends with the same rules as *
    expect(r.match(/Disallow: \/veri\//g)).toHaveLength(2);
  });
});
