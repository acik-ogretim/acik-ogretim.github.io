# Yapay Zekâ Araması ve Ajan Hazırlığı

Bu belge, Açık Öğretim Portal'ın arama motorları, yapay zekâ arama hizmetleri ve tarayıcı içi yapay zekâ ajanları için neler sunduğunu, her kararın hangi kaynağa dayandığını ve hangi kısımların deneysel olduğunu anlatır. Kaynaklar 21 Kasım 2026'da okundu.

## Kısa özet

Site artık her sayfada kanonik adres, açıklama, Open Graph ve Twitter etiketleri taşır. Ana sayfa, katalog sayfaları ve ders sayfaları Google'ın bu site için hâlâ desteklediği yapılandırılmış veriyi yazar. Arama motorları üniversite başına bir site haritası okur; yapay zekâ hizmetleri için `llms.txt` ile `llms-full.txt` dosyaları ve her dersin Markdown özeti (`ozet.md`) üretilir. WebMCP destekleyen tarayıcılarda sayfa, ajanlara yedi araç sunar. Hiçbiri çerez, izleme ya da veri toplama eklemez.

## Eklenenler ve dosyaları

**Sayfa başlığı**: `src/components/SeoHead.astro` her sayfanın `<head>` bölümüne kanonik bağlantı, açıklama (en çok 160 karakter), `og:*` ve `twitter:*` etiketleri, `rel="describedby"` ile `llms.txt` bağlantısı ve varsa JSON-LD yazar. `Layout.astro` bileşeni çağırır; sayfalar `noindex`, `jsonLd` ve `markdown` özelliklerini Layout'a verir. Yardımcı işlevler `src/lib/seo.ts` içindedir.

**Kanonik adres**: GitHub Pages `/x` adresini `/x/` adresine yönlendirdiği için kanonik adres sondaki eğik çizgiyle yazılır. Birden çok bölümde okutulan ders tek sayfada durur (`src/lib/kanonik.ts`); diğer bölüm adresleri Astro'nun yönlendirme sayfasıdır ve site haritasına girmez.

**Dizinden çıkarılan sayfalar**: arama sonucu (`/ara`), kişisel sayfalar (`/derslerim`, `/ilerleme`, `/ayarlar`, `/yedek`), `/istatistik`, `/offline`, sorusu olmayan ders ve bölüm sayfaları `noindex, follow` alır. Bu sayfalar robots.txt ile kapatılmaz, çünkü Google `noindex` etiketini ancak sayfayı tarayınca görür.

**Ders sayfası açıklaması**: ders adı, kodu, üniversite, bölüm, gerçek soru sayısı, çıkmış soru sayısı ve sınav yılları birleştirilerek üretilir (`dersAciklamasi`).

**Yapılandırılmış veri**: `src/lib/yapisal-veri.ts` üreticileri ve doğrulayıcısı. Ana sayfada `Organization` ve `WebSite` (arama `/ara/?q=`), üniversite ve bölüm sayfalarında `BreadcrumbList`, ders sayfasında `BreadcrumbList` ile `LearningResource` (konusu `about` alanında `Course` olarak, sağlayıcısı üniversite). Eski ana sayfa işaretlemesindeki yanlış arama adresi (`/search?q=`) düzeltildi.

**Site haritası**: `src/lib/site-haritasi.ts` ve uç noktalar `src/pages/sitemap-index.xml.ts`, `sitemap-sayfalar.xml.ts`, `sitemap-[university].xml.ts`. Dizin `https://acik-ogretim.github.io/sitemap-index.xml` adresindedir. Her üniversitenin kendi dosyası vardır; yalnız sorusu olan kanonik ders sayfaları, soru içeren bölümler ve üniversite sayfası girer. `@astrojs/sitemap` kaldırıldı, çünkü yönlendirme sayfalarını ve sorusuz dersleri de listeliyordu. `lastmod` yazılmaz: CI kopyasında dosya tarihleri derleme anını gösterir, Google yanlış `lastmod` değerine güvenmeyi bırakır.

**robots.txt**: `src/lib/robots.ts`. Bütün tarayıcılara açık; yalnız `/veri/` kapalı. Yapay zekâ tarayıcıları adıyla ayrıca listelenir ve aynı kuralları alır (adlandırılmış bir grup `*` grubunu devre dışı bıraktığı için kural her grupta tekrarlanır).

**llms.txt ve llms-full.txt**: `src/lib/llms.ts`. `llms.txt` site amacını, üniversiteleri, sayfa türlerini, atıf biçimini ve ajan araçlarını anlatır. `llms-full.txt` her üniversite ve bölüm altında bütün dersleri, sayfa ve özet bağlantılarıyla listeler.

**Ders özeti**: `src/lib/ders-ozeti.ts` ve `src/pages/[university]/[department]/[course]/ozet.md.ts`. Künye, dersin amacı, ünite başlıkları, kitap konuları, ünite başına soru sayısı, en sık sorulan üç örnek soru ve atıf satırı. Ders sayfası özeti `<link rel="alternate" type="text/markdown">` ile gösterir.

**Ajan araçları**: `src/lib/ajan-araclari.ts` (tanımlar, Zod şemaları) ve `src/lib/webmcp.ts` (kayıt). Ayrıntı aşağıda.

## Kaynaklar ve verilen kararlar

**Yapay zekâ özetleri için ek dosya gerekmez.** Google, AI Overviews ve AI Mode için ek gereksinim olmadığını, sayfanın dizinde olması ve snippet ile gösterilebilmesinin yettiğini söyler; yeni makine okunur dosya ya da işaretleme istemez, yapılandırılmış verinin görünür metinle uyuşmasını ister. Bu yüzden asıl iş kanonik, açıklama, iç bağlantı ve doğru yapılandırılmış veridir. `llms.txt` Google için değil, onu okuyan diğer hizmetler ve ajanlar için eklendi. Kaynak: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

**Course yalnız konu olarak.** Google'ın Course list zengin sonucu yalnız İngilizce sonuçlarda çıkar, en az üç ders ve geçerli `provider` ister ve eğitmenli, kayıtlı öğrencili ders için kullanılır ([Course list](https://developers.google.com/search/docs/appearance/structured-data/course)). Course Info ve Learning Video zengin sonuçları Haziran 2025'te kaldırıldı ([Simplifying the search results page](https://developers.google.com/search/blog/2025/06/simplifying-search-results), [Search Engine Land özeti](https://searchengineland.com/google-to-drop-support-for-several-rich-result-types-to-simplify-the-search-results-page-456969)). Bu site dersi vermez, dersin çalışma sayfasını sunar. Bu yüzden sayfanın kendisi `LearningResource` olarak, ders ise `about` alanında `Course` olarak tarif edilir.

**Quiz ve soru işaretlemesi eklenmedi.** Education Q&A (Quiz) yalnız İngilizce, Portekizce, Vietnamca ve Meksika İspanyolcasında çalışır ve `eduQuestionType: Flashcard` ister; sitedeki sorular çoktan seçmelidir ([Education Q&A](https://developers.google.com/search/docs/appearance/structured-data/education-qa?hl=tr)). Practice problem işaretlemesi Ocak 2026'da Search Console'dan kaldırıldı ([PPC Land](https://ppc.land/google-phases-out-practice-problem-and-dataset-structured-data/)). FAQPage ve HowTo da eklenmedi. Doğrulayıcı bu türleri hata sayar, böylece biri yanlışlıkla eklerse test kırılır.

**SearchAction duruyor.** Google site bağlantısı arama kutusunu 2024'te kaldırdı ([Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box?hl=tr)); `WebSite` işaretlemesi site adı için kullanılmaya devam eder. SearchAction ajanlara arama adresini gösterdiği için bırakıldı.

**llms.txt biçimi.** Öneriye göre dosya bir H1 başlık, bir alıntı özeti, isteğe bağlı açıklama paragrafları ve `[ad](adres): not` satırlarından oluşan H2 listeleriyle yazılır; `## Optional` bölümü kısa bağlamda atlanabilir. Sayfaların Markdown sürümü `rel="alternate" type="text/markdown"`, kapsayan `llms.txt` ise `rel="describedby"` ile gösterilebilir. Kaynak: [llmstxt.org](https://llmstxt.org/index.md).

**Yapay zekâ tarayıcılarına izin.** Site ücretsiz bir eğitim sitesi olduğu için öğrencinin bir yapay zekâ hizmetinde siteyi bulması istenir. Listelenen adlar OpenAI (GPTBot, OAI-SearchBot, ChatGPT-User), Anthropic (ClaudeBot, Claude-SearchBot, Claude-User), Google (Google-Extended, Gemini-Deep-Research), Perplexity, Apple, Microsoft, DuckDuckGo, Mistral, Meta, Amazon ve Common Crawl tarayıcılarıdır. Kaynak: [Search Engine Journal AI crawler listesi](https://www.searchenginejournal.com/ai-crawler-user-agents-list/558130/). Google-Extended ayrı bir tarayıcı değil, Googlebot verisinin model eğitimi ve bazı ürünlerde kullanılmasına verilen izindir.

**Soruların tamamı tek dosyada yayımlanmaz.** Sınav sorularının hakları üniversitelere aittir (`/telif`). Bir dersin bütün sorularını tek makine okunur dosyada vermek toplu kopyalamayı kolaylaştırır ve derleme çıktısını büyütür; site daha önce 2 GB sınırına dayandı (`src/lib/kanonik.ts`). Bu yüzden `ozet.md` yalnız üç örnek soru ve bağlantı verir, `llms-full.txt` yalnız ders listesi taşır. Tarayıcı içi sohbetin okuduğu `/veri/<uni>/<ders>.json` dosyaları sitede kalır ama robots.txt ile taramaya kapatılmıştır.

**Soru metinleri ders sayfasının HTML'inde değildir (21 Kasım 2026).** Ders sayfası yalnız iskeleti (başlık, ünite başlıkları, künye, sayaçlar) taşır; kartlar tarayıcıda `/ders/<uni>/<ders>/unite/<n>.json` ünite dosyalarından çizilir. Karar: arama motoru önceliği yok (Zeki, 21 Kasım 2026); sayfa HTML'i 2,7 MB'tan 192 KB'a indi. Etkisi: arama motorları ve JavaScript çalıştırmayan ajanlar kart metnini sayfadan görmez; `ozet.md` (üç örnek soru), `llms.txt`, `llms-full.txt`, başlık, açıklama ve JSON-LD değişmeden kalır. Ünite dosyaları robots.txt ile kapatılmamıştır (sayfayı çizen tarayıcının okuması gerekir).

**Üniversite verisi ayrı.** Site haritası üniversite başına ayrı dosyadır; `llms-full.txt` ve `ders_ara` aracı her dersi kendi üniversitesinin kimliğiyle verir. Aynı adlı dersler farklı üniversitelerde ayrı kayıttır.

## Ajan araçları (WebMCP, deneysel)

WebMCP, sayfanın tarayıcıdaki ajana araç tanıtmasını sağlayan bir öneridir. Durumu 21 Kasım 2026 itibarıyla:

**Tarayıcı ve bayrak**: Chrome'da geliştirici denemesi 146 ile başladı, origin trial 149 ile 156 arasında sürer, gönderim hedefi 157'dir ([blink-dev Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8/m/OJxuQRP3AAAJ)). Yerelde denemek için `chrome://flags/#enable-webmcp-testing` açılıp Chrome yeniden başlatılır ([Chrome WebMCP belgesi](https://developer.chrome.com/docs/ai/webmcp), [origin trial duyurusu](https://developer.chrome.com/blog/ai-webmcp-origin-trial)). Diğer tarayıcılarda destek yoktur. Origin trial jetonu eklenmedi; yayındaki sitede araçlar yalnız bayrağı açık tarayıcıda görünür.

**API biçimi**: güncel taslakta `document.modelContext.registerTool(arac, { signal })` kullanılır; araç `name`, `title`, `description`, `inputSchema` (JSON Schema), `execute(girdi, { signal })` ve `annotations` (`readOnlyHint`, `consequentialHint` ve diğerleri) taşır, kayıt `AbortSignal` ile geri alınır ([taslak](https://webmachinelearning.github.io/webmcp), [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)). İlk Chrome sürümleri aynı nesneyi `navigator.modelContext` altında veriyordu; kod ikisine de bakar. Chrome 155 öncesinde girdinin JSON metni olarak gelebildiği için araçlar metni de çözümler.

**Yükleme maliyeti**: `SeoHead.astro` içindeki 451 baytlık betik yalnız `modelContext` varsa araç modülünü dinamik olarak yükler (yaklaşık 68 KB, içinde Zod 4). Destek olmayan tarayıcı hiçbir şey indirmez.

**Araçlar**: hepsi mevcut sayfa kodunu çağırır.

- `ders_ara`: `/veri/dersler.json` kataloğunda ad, kod ya da bölümle arar; Türkçe harfleri katlar, üniversiteyle süzer.
- `dersi_ac`: katalogdaki ders adresine gider.
- `uniteye_git`, `soruya_git`: menüdeki gibi `#unite-N` ve `#question-N-i` kartına kaydırır.
- `sorulari_filtrele`: `src/lib/suzgec.ts` ile `quiz-settings` kaydını değiştirir ve `quizPlayer.syncSettings()` çağırır (Süzgeç penceresinin "Uygula" düğmesiyle aynı yol).
- `kaldigim_yere_don`: `src/lib/calisma-durumu.ts` kaydını okur ve `#kaldigin-yer` devam bağlantısını açar.
- `eylem_calistir`: `src/lib/eylemler.ts` kayıt defterindeki eylemi çalıştırır. Cevap ve kaldığın yer silen üç eylem (`uniteyi-temizle`, `dersi-temizle`, `yeri-sifirla`) ajana kapalıdır.

**Gizlilik**: araçlar yalnız tarayıcıda çalışır; sayfayı kaydırır, `localStorage` içindeki süzgeç ayarını yazar ve kaldığın yeri okur. Siteye ya da üçüncü tarafa istek göndermez (katalog sitenin kendi statik dosyasıdır). Ajanın gördüğü bilgiyi ajanın kendi hizmeti işler; bu, `gizlilik.astro` ve `rehber.astro` içinde yazılıdır.

## Doğrulama

**Birim testleri**: `src/lib/seo.test.ts`, `yapisal-veri.test.ts`, `ders-ozeti.test.ts`, `ajan-araclari.test.ts`. WebMCP kaydı sahte bir `modelContext` ile sınanır (kayıt sayısı, `AbortSignal`, ikinci kaydın öncekini iptal etmesi, girdi doğrulaması).

**Derleme çıktısı denetimi**: tam derleme 2 GB'a yaklaştığı için birkaç bölümlük önizleme derlenir, sonra çıktı denetlenir:

```bash
ONIZLEME_BOLUMLERI="auzef/hemsirelik-lisans-tamamlama,ataturk-aof/sosyal-hizmet-lisans-tamamlama-programi" \
  NODE_OPTIONS=--max-old-space-size=1800 npx astro build --outDir dist-seo
SEO_DIST=dist-seo npx vitest run scripts/tests/seo-dist.test.ts
rm -rf dist-seo
```

`ONIZLEME_BOLUMLERI` yalnız yerel önizleme içindir (`src/lib/api.ts`); CI'da tanımsızdır. Denetim şunlara bakar: robots.txt kuralları ve site haritası satırı; site haritasındaki her adresin var olan, yönlendirme olmayan, kanonik adresi kendisi olan ve `noindex` taşımayan bir sayfa olması; her sayfada tek kanonik, tek açıklama, Open Graph ve Twitter etiketleri; her JSON-LD bloğunun Zod doğrulamasından geçmesi; `llms.txt` biçimi ve `llms-full.txt` içindeki her özet bağlantısının dosyası; özetlerde en çok üç örnek soru.

**Ölçüm (21 Kasım 2026, iki bölümlük önizleme)**: 40 ders özeti toplam 176 KB (ders başına ortalama 4,4 KB), sayfa başına başlık eki yaklaşık 2,5 KB, ders özeti başına derleme süresi ortalama 22 ms. Soru içeren yaklaşık 2.700 ders için tam derlemede tahmini ek: özetler 12 MB, sayfa başlıkları 25 MB, süre 1 dakika civarı. 2 GB sınırının yüzde ikisinin altında kalır.

**Elle denetim**: yayından sonra [Zengin Sonuçlar Testi](https://search.google.com/test/rich-results) ve [Schema.org doğrulayıcısı](https://validator.schema.org/) ile ana sayfa ve bir ders sayfası denetlenir.

## Search Console'da site haritası

Site haritası dizini: `https://acik-ogretim.github.io/sitemap-index.xml`. Search Console'da mülk seçilir, **Dizin oluşturma > Site haritaları** açılır, "Yeni site haritası ekle" alanına `sitemap-index.xml` yazılıp **Gönder** düğmesine basılır. Dizin içindeki üniversite haritalarını Google kendisi okur. Doğrulama dosyası `public/google0d22887dbe37facb.html` yerinde kalmalıdır.

## Paylaşım görselleri

Ana sayfa, üniversite, bölüm, her kanonik ders ve statik sayfalar (ara, rehber, sohbet, derslerim, hakkımızda vb.) derleme sırasında iki görsel üretir: geniş kart `/og/<sayfa>.png` (1200x630) ve kare kart `/og/kare/<sayfa>.png` (800x800). Görseli olmayan sayfa (ör. sorusu olmayan bölüm) 512 piksellik kare logoya ve `summary` kartına döner.

**Meta etiketleri**: `og:image` iki kez yazılır, önce geniş kart sonra kare kart; her biri kendi `og:image:width/height/type/alt` etiketlerini taşır. `twitter:image` geniş karttır, `twitter:card` `summary_large_image`. Platformların çoklu `og:image` içinden hangisini seçtiği değişir: WhatsApp'ın hangisini gösterdiği gerçek bir telefonda denenmelidir (teyit bekliyor). Önbellekteki eski önizleme için bağlantıya `?v=2` eklenerek denenir.

**Yerleşim (geniş kart)**: üç bölge. Orta sütun (ortadaki 630 piksel, WhatsApp'ın kare kırpmasında kalan kısım) site imzasını, ders adını (en çok üç satır, sonra üç nokta), büyük olguyu ve sınav yıllarını taşır; kırpıldığında tam bir kart olarak okunur. Soldaki 285 piksellik panel üniversite etiketini, bölümü ve dereceyi; sağdaki panel olgu kutularını (sınav türleri, toplam soru, ünite, açıklamalı) ve logoyu taşır. Paneller hafif yüzey rengi ve ince ayırıcı çizgiyle ayrılır. Üniversite, bölüm, ana sayfa ve statik sayfa kartları aynı bölge mantığını kullanır. Kare kart kırpma değil, kareye göre ayrıca tasarlanmıştır: bağlam satırı, ders adı, büyük olgu, yıl satırları, site adı ve logo.

**Yapı**: `src/pages/og/[...yol].png.ts` ve `src/pages/og/kare/[...yol].png.ts` (statik uç noktalar), `src/lib/og/veri.ts` (hangi sayfada ne yazar, alt metin), `src/lib/og/cizim.ts` (satori ile iki yerleşim, resvg ile PNG, sharp ile palet PNG), `src/lib/og/uret.ts` (önbellekli üretim), `src/lib/ders-sayilari.ts` (saf sayım yardımcıları, testli). `SeoHead.astro` görsel yolunu `Astro.url.pathname` üzerinden bulur.

**Kartın içeriği**: büyük olgu çıkmış soru sayısıdır ("1.240 çıkmış soru"; hiç yoksa "439 alıştırma sorusu"), altında sınav yılı aralığı ("2016-2017 ile 2024-2025 arası sınavlar · 9 yıl", tek yıl varsa "2024-2025 sınavı"). Yan kutular: sınav türleri (en çok dört), toplam soru, ünite, soruların en az yüzde 80'i açıklamalıysa "Açıklamalı". Bölüm, üniversite ve ana sayfa kartları aynı olguları ders toplamlarından alır. Değeri sıfır ya da bilinmeyen blok yazılmaz. Sayılar `tr-TR` biçimindedir. Ders sayfasının meta açıklaması da aynı biçimi kullanır (`dersAciklamasi`).

**Yazı tipi**: Inter (SIL OFL 1.1), Latin ve Latin Genişletilmiş-A kümesine indirgenmiş dört dosya `scripts/og/fonts/` altında, lisansı `OFL.txt`.

**Biçim seçimi**: palet PNG seçildi. İlk tasarımda 142 kart için ortalama: palet PNG 12,8 KB, WebP q80 22,5 KB, JPEG q82 44,7 KB. LinkedIn'in resmî listesi JPG, PNG ve GIF olduğu için WebP seçilmedi.

**Önbellek**: kart içeriğinin özeti (`OG_SURUM` ve yerleşim adıyla birlikte) `.cache/og/` altında dosya adı olur (git dışı). CI `actions/cache` ile bu klasörü saklar (`deploy.yml`).

**Yeniden üretme**: tasarım `src/lib/og/cizim.ts` içindedir; değiştirince `OG_SURUM` değerini artırın. `node --experimental-strip-types scripts/og/olc.mts /tmp/og-olc` örnek kartları iki yerleşimle yazar. Gerçek veriyle bakmak için önizleme derlemesi (yukarıdaki komut) sonrasında `dist-seo/og/` açılır; `seo-dist.test.ts` her iki görselin varlığını, boyutunu ve meta etiketlerini denetler.

## Kalanlar

**Origin trial jetonu**: araçların bayraksız Chrome'da da görünmesi istenirse origin trial'a kayıt olunup jeton `<meta http-equiv="origin-trial">` olarak eklenir; deneme Chrome 156'da biter.

**Ünite adı kuralı**: ders sayfası ve `ozet.md` ünite başlığını aynı önceliklerle seçer, ama kod iki yerdedir. Ders sayfası sadeleştirilirken bu seçim tek bir yardımcıya taşınabilir.
