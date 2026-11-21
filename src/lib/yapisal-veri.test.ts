import { describe, expect, it } from "vitest";
import { dersKaynagi, graf, kirintiListesi, organizasyon, webSitesi, yapisalVeriDenetle } from "./yapisal-veri";

const SITE = "https://acik-ogretim.github.io";

describe("JSON-LD üreticileri", () => {
  it("ana sayfa grafı geçerli; arama /ara/?q= adresine gider", () => {
    const g = graf(organizasyon(SITE), webSitesi(SITE));
    expect(yapisalVeriDenetle(g)).toEqual([]);
    const site = g["@graph"][1] as { potentialAction: { target: { urlTemplate: string } } };
    expect(site.potentialAction.target.urlTemplate).toBe(`${SITE}/ara/?q={search_term_string}`);
  });

  it("ders sayfası grafı geçerli: kırıntı ve öğrenme kaynağı", () => {
    const g = graf(
      kirintiListesi(SITE, [
        { ad: "Ana Sayfa", yol: "/" },
        { ad: "AUZEF", yol: "/auzef/" },
        { ad: "Çocuk Gelişimi", yol: "/auzef/cocuk-gelisimi/" },
        { ad: "Anatomi", yol: "/auzef/cocuk-gelisimi/anatomi/" },
      ]),
      dersKaynagi(SITE, {
        yol: "/auzef/cocuk-gelisimi/anatomi/",
        dersAdi: "Anatomi",
        kod: "CGL101",
        aciklama: "Anatomi dersi soruları",
        universite: "İstanbul Üniversitesi",
        derece: "Lisans",
        cikmis: 10,
        alistirma: 5,
        uniteler: ["Hücre", "Doku"],
      }),
    );
    expect(yapisalVeriDenetle(g)).toEqual([]);
    const kaynak = g["@graph"][1] as { learningResourceType: string[]; about: { "@type": string } };
    expect(kaynak.learningResourceType).toEqual(["Çıkmış sınav soruları", "Alıştırma soruları"]);
    expect(kaynak.about["@type"]).toBe("Course");
  });

  it("Google'ın bu site için desteklemediği türleri reddeder", () => {
    const sorunlar = yapisalVeriDenetle(graf({ "@type": "FAQPage" }, { "@type": "Quiz" }, { "@type": "Course", name: "x" }));
    expect(sorunlar).toHaveLength(3);
    expect(sorunlar[0]).toMatch(/FAQPage/);
  });

  it("bozuk kırıntıyı ve göreli adresi yakalar", () => {
    const k = kirintiListesi(SITE, [{ ad: "Ana Sayfa", yol: "/" }]);
    (k.itemListElement as { position: number; item: string }[])[0].position = 2;
    expect(yapisalVeriDenetle(graf(k)).join(" ")).toMatch(/position/);
    const g = graf({ ...organizasyon(SITE), url: "/goreli" });
    expect(yapisalVeriDenetle(g).join(" ")).toMatch(/Organization\.url/);
  });

  it("kök biçimi yanlışsa söyler", () => {
    expect(yapisalVeriDenetle({ "@type": "WebSite" })[0]).toMatch(/^kök/);
  });
});
