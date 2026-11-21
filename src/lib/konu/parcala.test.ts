import { describe, expect, it } from "vitest";
import { dersiParcala, htmlMetne, kavramAyikla, konuGovdesi, uniteOku } from "./parcala";

const MDX = `---
unite: 2
baslik: "İkinci Ünite"
---

# 2. Ünite
<Konu id="k-2.1" no="2.1" baslik={"GİRİŞ"} sayfa={5}>

## 2.1 GİRİŞ

<Gorsel sayfa={5} />

<Altyazi>Alıntı cümlesi.</Altyazi>

Birinci paragraf **Temel Kavram** içerir. Şunu da: <script>alert(1)</script>

<Gorsel sayfa={6} />

- madde bir
- madde iki

<Kutu tur="Örnek" sayfa={6}>

Kutu içi metin.

</Kutu>

</Konu>
<Konu id="k-2.2" no="2.2" baslik={"\\"TIRNAKLI\\" BAŞLIK"} sayfa={7}>

### Alt başlık

| A | B |
|---|---|
| 1 | 2 |

Temel Kavram tekrar: **Temel Kavram** ve [bağlantı](http://x.y).
`;

describe("uniteOku", () => {
  it("reads frontmatter and splits topics at <Konu> boundaries", () => {
    const u = uniteOku(MDX);
    expect(u.unite).toBe(2);
    expect(u.baslik).toBe("İkinci Ünite");
    expect(u.konular.map((k) => k.no)).toEqual(["2.1", "2.2"]);
    expect(u.konular[1].baslik).toBe('"TIRNAKLI" BAŞLIK');
    expect(u.konular[0].sayfa).toBe(5);
    expect(u.konular[0].govde).not.toContain("</Konu>");
    expect(u.konular[0].govde).not.toContain("2.2");
  });

  it("splits at the next <Konu> when a closing tag is missing", () => {
    const u = uniteOku(`---\nunite: 1\nbaslik: "X"\n---\n<Konu id="k-1.1" no="1.1" baslik={"A"} sayfa={1}>\nbir\n<Konu id="k-1.2" no="1.2" baslik={"B"} sayfa={2}>\niki\n`);
    expect(u.konular.map((k) => k.govde)).toEqual(["bir", "iki"]);
  });
});

describe("konuGovdesi", () => {
  const u = uniteOku(MDX);
  const a = konuGovdesi(u.konular[0].govde, "GİRİŞ", "2.1", 5);

  it("maps the book components to site classes and drops raw HTML", () => {
    expect(a.html).toContain('<blockquote class="konu-alinti">Alıntı cümlesi.</blockquote>');
    expect(a.html).toContain('<aside class="konu-kutu" data-tur="Örnek">');
    expect(a.html).toContain('<p class="konu-sayfa">Kitap s. 6</p>');
    expect(a.html).not.toContain("Kitap s. 5"); // same page as the topic start
    expect(a.html).not.toContain("<script");
    expect(a.html).not.toContain("<h3>GİRİŞ"); // title heading repeated in the drawer header
  });

  it("builds read-aloud text without the pull quote and keeps Turkish characters", () => {
    expect(a.metin).not.toContain("Alıntı cümlesi");
    expect(a.metin).toContain("Birinci paragraf Temel Kavram içerir.");
    expect(a.metin).toContain("Örnek.\nKutu içi metin.");
    expect(a.metin).not.toMatch(/<|>/);
  });

  it("collects bold terms and box titles as concepts", () => {
    expect(a.kavramlar).toEqual(["Temel Kavram", "Örnek"]);
  });

  it("demotes headings, wraps tables and strips links", () => {
    const b = konuGovdesi(u.konular[1].govde, "x", "2.2", 7);
    expect(b.html).toContain("<h4>Alt başlık</h4>");
    expect(b.html).toContain('<div class="konu-tablo"><table>');
    expect(b.html).not.toContain("<a ");
    expect(b.metin).toContain("bağlantı");
  });
});

describe("kavramAyikla / htmlMetne", () => {
  it("dedupes by Turkish lower case and skips short or numeric terms", () => {
    expect(kavramAyikla("**Işık** ve **ışık** ile **12** ve **ab**")).toEqual(["Işık"]);
  });
  it("decodes entities and keeps block breaks", () => {
    expect(htmlMetne("<p>a &amp; b</p><p>c&#39;d</p>")).toBe("a & b\nc'd");
  });
});

describe("dersiParcala", () => {
  const u1 = uniteOku(MDX);
  const u0 = uniteOku(`---\nunite: 1\nbaslik: "Bir"\n---\n<Konu id="k-1.1" no="1.1" baslik={"A"} sayfa={1}>\n**Temel Kavram** burada.\n</Konu>\n`);
  const s = dersiParcala([u1, u0], "uni", "ders");

  it("orders by unit, links neighbours and writes stable ids", () => {
    expect(s.konular.map((k) => k.id)).toEqual(["uni/ders/1.1", "uni/ders/2.1", "uni/ders/2.2"]);
    expect(s.konular[1].onceki).toEqual({ no: "1.1", baslik: "A" });
    expect(s.konular[1].sonraki?.no).toBe("2.2");
    expect(s.konular[0].onceki).toBeNull();
  });

  it("links topics that share a concept and lists them in the graph", () => {
    expect(s.konular[0].baglantilar).toContain("uni/ders/2.1");
    expect(s.konular[0].baglantilar).toContain("uni/ders/2.2");
    expect(s.cizge.dugumler).toHaveLength(3);
    expect(s.cizge.kenarlar.filter((k) => k.tur === "sira")).toHaveLength(2);
    expect(s.cizge.kenarlar.filter((k) => k.tur === "kavram").length).toBeGreaterThan(0);
  });

  it("builds the unit index and tolerates empty concepts", () => {
    expect(s.indeks.uniteler.map((x) => x.no)).toEqual([1, 2]);
    expect(s.indeks.uniteler[1].konular[0]).toEqual({ no: "2.1", baslik: "GİRİŞ", sayfa: 5 });
    const bos = dersiParcala([uniteOku(`---\nunite: 1\nbaslik: "x"\n---\n<Konu id="k" no="1.1" baslik={"A"} sayfa={1}>\n</Konu>`)], "u", "d");
    expect(bos.konular[0].kavramlar).toEqual([]);
  });
});
