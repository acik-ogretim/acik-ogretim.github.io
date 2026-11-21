// llms.txt (llmstxt.org): a short Markdown map of the site for language models and agents, and
// llms-full.txt with every course link. Built from the same catalog as the sitemaps.
import { dereceAdi } from "./derece";
import { SITE_ADI, mutlakUrl } from "./seo";
import { SITEMAP_DIZINI, type KatalogUniversitesi } from "./site-haritasi";

type Site = URL | string | undefined;

/** Agent tools registered through WebMCP (src/lib/ajan-araclari.ts); listed so agents know they exist. */
export type AracOzeti = { ad: string; aciklama: string };

const ATIF =
  "İçerik lisansı CC BY-NC-SA 4.0 (ticari olmayan kullanım, atıf ve aynı lisansla paylaşım). Sınav sorularının hakları ilgili üniversitelere aittir. " +
  "Alıntı yaparken dersin sayfa bağlantısını verin ve şu biçimde atıf yapın: “Açık Öğretim Portal, <Ders adı> (<Üniversite>), <bağlantı>”. " +
  "Bir dersin bütün sorularını toplu kopyalamak yerine öğrenciyi ders sayfasına yönlendirin.";

export function llmsMetni(site: Site, unis: KatalogUniversitesi[], araclar: AracOzeti[]): string {
  const u = (y: string) => mutlakUrl(site, y);
  const toplamDers = unis.reduce((t, k) => t + k.dersler.length, 0);
  return [
    `# ${SITE_ADI}`,
    "",
    `> Türkiye'deki dört açık ve uzaktan öğretim fakültesinin (Anadolu AÖF, Atatürk AÖF, İstanbul AUZEF, Ankara ANKUZEF) öğrencileri için ücretsiz, üyeliksiz ve ticari olmayan çalışma portalı. ${toplamDers} dersin çıkmış sınav soruları ve alıştırmaları ünite ünite, doğru cevap ve açıklamayla yayımlanır.`,
    "",
    "Site statik dosyalardan oluşur; hesap ve çerez yoktur, ziyaretler kişiyi tanımayan çerezsiz bir sayaçla sayılır. Öğrencinin çözüm kayıtları yalnız kendi tarayıcısında durur.",
    "",
    "Her üniversitenin dersleri kendi adres alanındadır (`/<üniversite>/<bölüm>/<ders>/`). Aynı adı taşıyan iki ders farklı üniversitelerdeyse içerikleri de ayrıdır; birinin sorularını ötekine bağlamayın. Birden çok bölümde okutulan ders tek sayfada, asıl bölümünün altında durur.",
    "",
    "## Sayfa türleri",
    "",
    `- [Ana sayfa](${u("/")}): üniversiteler ve son çalışılan ders.`,
    "- Üniversite sayfası `/<üniversite>/`: lisans, ön lisans ve diğer programlar.",
    "- Bölüm sayfası `/<üniversite>/<bölüm>/`: dönem dönem dersler.",
    "- Ders sayfası `/<üniversite>/<bölüm>/<ders>/`: dersin bütün soruları ünite sırasıyla. `#unite-3` üçüncü üniteye, `#question-3-0` o ünitenin ilk sorusuna gider.",
    "- Ders özeti `/<üniversite>/<bölüm>/<ders>/ozet.md`: ünite başlıkları, kitap konuları, soru sayıları ve birkaç örnek soru (Markdown).",
    "- Materyaller `/<üniversite>/<bölüm>/<ders>/materyaller/`: üniversitenin resmî kitap, özet ve video bağlantıları.",
    `- [Arama](${u("/ara/")}): \`?q=\` ile ders ve bölüm arar.`,
    "",
    "## Atıf ve kullanım",
    "",
    ATIF,
    "",
    "## Üniversiteler",
    "",
    ...unis.map((k) => `- [${k.uni.name} ${k.uni.faculty}](${u(k.yol)}): ${k.bolumler.length} program, ${k.dersler.length} ders`),
    "",
    "## Ders listesi",
    "",
    `- [Bütün dersler](${u("/llms-full.txt")}): her dersin sayfası ve Markdown özeti, üniversite ve bölüme göre`,
    "",
    "## Tarayıcı içi ajan araçları (deneysel)",
    "",
    "WebMCP destekleyen tarayıcılarda sayfa şu araçları kaydeder (`document.modelContext`). Araçlar yalnız tarayıcıda çalışır, siteye veri göndermez.",
    "",
    ...araclar.map((a) => `- \`${a.ad}\`: ${a.aciklama}`),
    "",
    "## Optional",
    "",
    `- [Kullanım rehberi](${u("/rehber/")}): özellikler ve kısayollar`,
    `- [Gizlilik politikası](${u("/gizlilik/")})`,
    `- [Telif hakkı politikası](${u("/telif/")})`,
    `- [Site haritası](${u(SITEMAP_DIZINI)})`,
    "",
  ].join("\n");
}

export function llmsTamMetni(site: Site, unis: KatalogUniversitesi[]): string {
  const u = (y: string) => mutlakUrl(site, y);
  const satirlar = [
    `# ${SITE_ADI}: bütün dersler`,
    "",
    "> Her satır bir ders sayfasıdır; satır sonundaki “özet” bağlantısı aynı dersin Markdown özetidir (ünite başlıkları, soru sayıları, örnek sorular). Dersler üniversiteye ve bölüme göre gruplanır; her üniversitenin dersi yalnız kendi başlığı altındadır.",
    "",
    ATIF,
    "",
  ];
  for (const k of unis) {
    satirlar.push(`## ${k.uni.name} ${k.uni.faculty}`, "");
    const bolumDersleri = new Map<string, typeof k.dersler>();
    for (const d of k.dersler) bolumDersleri.set(d.bolum.id, [...(bolumDersleri.get(d.bolum.id) ?? []), d]);
    for (const b of k.bolumler) {
      const dersler = (bolumDersleri.get(b.bolum.id) ?? []).sort(
        (x, y) => x.ders.semester - y.ders.semester || x.ders.name.localeCompare(y.ders.name, "tr"),
      );
      if (dersler.length === 0) continue;
      satirlar.push(`### ${b.bolum.name} (${dereceAdi(b.bolum.degree)})`, "");
      for (const d of dersler) {
        const kod = d.ders.code ? `${d.ders.code}, ` : "";
        satirlar.push(`- [${d.ders.name}](${u(d.yol)}): ${kod}${d.ders.semester}. dönem · [özet](${u(`${d.yol}ozet.md`)})`);
      }
      satirlar.push("");
    }
  }
  return satirlar.join("\n");
}
