# Çevrimdışı kullanım

Site bir kez açıldıktan sonra internet olmadan da gezilir; indirilen dersler soruları, görselleri ve sohbet verisiyle birlikte cihazda durur. Bu belge yöntemi, önbellek adlarını, sürüm akışını ve tarayıcı sınırlarını anlatır.

## Eski düzen neden çalışmadı

**Yalnız gezilen sayfa saklanıyordu**: elle yazılmış `public/sw.js` kurulumda dört adres alıyordu (`/`, `/manifest.json`, `/favicon.svg`, `/offline`). Üniversite ve bölüm sayfaları ancak çevrimiçi açıldıysa önbelleğe giriyordu; hiç açılmamış bölüm internetsizken açılmıyordu.

**Yedek sayfası da bozuktu**: GitHub Pages `/offline` adresini `/offline/` adresine yönlendirir. Önbelleğe yönlendirilmiş yanıt girdi ve Chrome bir gezinmeye yönlendirilmiş yanıt verilmesini reddeder; çevrimdışı sayfası da açılmıyordu. Anahtarlar da normalleştirilmediği için `/auzef` ile `/auzef/` ayrı kayıtlardı.

**Zayıf bağlantıda sayfa asılı kalıyordu**: strateji "önce ağ, zaman aşımı yok" idi. Bağlantı var ama veri akmıyorsa tarayıcı önbelleğe hiç dönmüyordu.

**Betikler önceden alınmıyordu, sürüm yoktu**: karma adlı JS ve CSS dosyaları yalnız sayfa açılınca saklanıyordu. Önbellek adı sabitti (`acik-ogretim-cache-v1`), sınırsız büyüyordu, `skipWaiting` her güncellemeyi sessizce devreye alıyordu.

## Seçilen yöntem

**Kendi TypeScript service worker'ımız, derlemede üretilen listelerle**: `src/sw/sw.ts` Astro derlemesinin sonunda (`src/integrations/cevrimdisi.ts`, `astro:build:done`) esbuild ile `dist/sw.js` olarak paketlenir. Ön önbellek listesi, bölüm sayfaları listesi ve sürüm kimliği `dist/` içindeki gerçek dosyalardan, içerik karmasıyla üretilip pakete gömülür.

Workbox (`@vite-pwa/astro` ya da `workbox-build injectManifest`) da değerlendirildi. Şu nedenlerle kendi çalışanımız seçildi:

- **Derleme boyutu**: tam derleme yaklaşık 2 GB ve binlerce ders sayfası içerir. Workbox `globPatterns` ile `dist/` altını tarar; ders sayfalarını dışarıda bırakan desenler yazmak, kendi listemizi yazmaktan daha kırılgandır. Kendi listemiz sayfayı adıyla seçer.
- **Ders indirme modeli**: bir dersin sayfası, `/veri` dosyası, materyal sayfası, görselleri ve betiklerinin geçişli bağımlılıkları tek bir "paket" olarak indirilir, silinir ve sürümlenir. Workbox'ın yönlendirme stratejileri bunu taşımaz; paket mantığını yine kendimiz yazmamız gerekirdi.
- **Bağımlılık ve disk**: Workbox derleme araçları onlarca megabayt bağımlılık getirir. esbuild zaten Astro ile kurulu.
- **Tip güvenliği**: çalışan, sayfa ve derleme aynı saf modülü (`src/lib/cevrimdisi/anahtar.ts`) ve aynı Zod şemalarını (`sema.ts`) kullanır. Anahtar biçimi, önbellek adı ve manifest yapısı tek yerde tanımlıdır. Çalışan kendi `tsconfig` dosyasıyla WebWorker tipleriyle denetlenir: `npx tsc -p src/sw`.

Workbox belgelerinden alınan ders: `injectManifest` desenleri bütün varlık türlerini kapsamazsa çalışan eksik dosya hatası verir. Bizim listemiz sayfaları adıyla, `/_astro/` altını bütünüyle alır.

## Dosyalar

- `src/lib/cevrimdisi/anahtar.ts`: önbellek adları, URL normalleştirme (`/x`, `/x/`, `/x/index.html` tek anahtar), ders yolu ayrıştırma, sayfadaki varlıkları bulma. Saf, birim testli.
- `src/lib/cevrimdisi/sema.ts`: sürüm manifestleri ve ders kaydı için Zod şemaları.
- `src/lib/cevrimdisi/paket.ts`: bir dersi indirir, sürdürür, siler. Sayfada ve çalışanda (Background Fetch sonrası) aynı kod çalışır.
- `src/lib/cevrimdisi/istemci.ts`: sayfa tarafı; manifest okuma, indirme seçimi (Background Fetch ya da sayfa içi), durum, bakım, yıldızlı dersler, alan bilgisi, kalıcı depolama.
- `src/lib/cevrimdisi/kayit.ts`: her sayfada `Layout.astro` başlatır; çalışanı kaydeder, "Yeni sürüm hazır" bandını gösterir, çevrimdışı işaretini ve bağlantı soluklaştırmayı yönetir, bölüm sayfalarını arka planda ister, bakımı çalıştırır.
- `src/lib/cevrimdisi/ders-dugmesi.ts`: ders kartındaki "Çevrimdışı için indir" çipi ve ilerleme şeridi. Menüdeki `cevrimdisi` eylemi (`eylemler.ts`) aynı çipe tıklar.
- `src/lib/cevrimdisi/liste.ts`: indirilen dersler listesi (`/cevrimdisi/` ve `/offline/`).
- `src/sw/sw.ts`: service worker. `src/integrations/cevrimdisi.ts`: derleme adımı. `scripts/cevrimdisi-uret.mjs`: var olan bir `dist/` için aynı adımı yeniden çalıştırır.
- Sayfalar: `src/pages/cevrimdisi.astro` (yönetim), `src/pages/offline.astro` (kayıtlı olmayan sayfanın yerine gelen sayfa), `derslerim.astro` ("Yıldızlı dersleri çevrimdışı tut").
- Stil: `src/styles/cevrimdisi.css`.

## Önbellekler

| Ad | İçerik | Sürüm |
|---|---|---|
| `ao-kabuk-<sürüm>` | Ana sayfa, üniversite sayfaları, Derslerim, İlerleme, Ara, Ayarlar, Kayıtları taşı, rehber, gizlilik, kullanım koşulları, telif, hakkımızda, iletişim, offline, çevrimdışı; `manifest.json`, simgeler, üniversite logoları, `/veri/dersler.json` | Her çalışan sürümünde yeni ad; eskisi `activate` sırasında silinir. Revizyonu aynı olan dosya eski kabuktan kopyalanır, yeniden indirilmez. |
| `ao-varlik` | `/_astro/*` (JS, CSS) | Ad içerik karması olduğu için tek önbellek. `activate` ve her indirme sonrası budanır: yeni kabukta ya da bir indirilmiş dersin kaydında geçmeyen dosya silinir. |
| `ao-bolum-v1` | Bölüm sayfaları | Arka planda, düşük öncelikle (`priority: "low"`), öğrencinin üniversitesi önce, mesaj başına 25 sayfa. Revizyonu değişen ya da sitede kalmayan sayfa `activate` sırasında silinir. Ayarı: `cevrimdisi-bolumler` (`/cevrimdisi/`). Tasarruf modunda (`saveData`) çalışmaz. |
| `ao-ders-v1` | İndirilen dersler: sayfa, materyal sayfası, `/veri/<uni>/<ders>.json`, `/_img/*` ve ders başına bir kayıt (`/__cevrimdisi__/<uni>/<ders>.json`) | Kayıt sürümü `v: 1`. |
| `ao-sayfa-v1` | Gezilen sayfaların kopyası | Son 3 ders sayfası, diğer sayfalardan son 60. İndirilen ders buraya yazılmaz; silinen dersin ziyaret kopyası da silinir. |
| `ao-dis-v1` | Google Fonts, KaTeX, çalışma anında görülen görseller | Bayat ama hızlı (stale while revalidate); görseller 300 kayıtla sınırlı. |

Kullanıcı verisi (cevaplar, kaldığın yer, favoriler, ayarlar) `localStorage` içindedir; hiçbir önbellek işlemi ona dokunmaz.

## Yönlendirme

- **Gezinme**: önce ağ, 3 saniye beklenir. Ağ cevap vermezse sırasıyla kabuk, indirilmiş ders (`/uni/<herhangi bölüm>/ders/` aynı indirmeyi açar, çünkü ortak ders tek kanonik sayfadadır), bölüm sayfası ve gezilen sayfa denenir. Hiçbiri yoksa ağ 15 saniyeye kadar beklenir, sonra `/offline/` aynı adreste gösterilir.
- **`/_astro/*`**: önce önbellek.
- **Diğer aynı kaynaklı dosyalar**: kabuk, indirilen ders, sonra ağ, en son çalışma anı kopyası.
- **Sürüm dosyaları ve `sw.js`**: her zaman ağdan, önbelleğe girmez.

## Ders indirme

1. Sayfa `/cevrimdisi-surum.json` (kabuk sürümü, üniversite başına karma) ve `/cevrimdisi-surum/<uni>.json` (ders başına `[kanonik yol, içerik karması, bayt]`) dosyalarını okur. Her üniversitenin manifesti ayrıdır; öğrenci yalnız indirdiği derslerin üniversitesini indirir.
2. Background Fetch varsa (Chromium) sayfa, materyal ve veri dosyası tarayıcının arka plan indirmesine verilir; sayfa kapansa da sürer, bitince çalışan görselleri ve betikleri tamamlar. Yoksa ya da başarısız olursa indirme sayfada yürür. `cevrimdisi-on-plan=1` sayfa içi indirmeyi zorlar (testler bunu kullanır).
3. Kayıt önce "yarım" olarak yazılır ve her dosyadan sonra güncellenir. Kesilen indirme bir sonraki dokunuşta ya da bakımda kaldığı yerden sürer: aynı karmada saklı dosyalar yeniden indirilmez.
4. İlerleme, çözülmüş gövde baytının manifestteki toplam boyuta oranıdır. Background Fetch yalnız sıkıştırılmış baytı bildirdiği için o yolda yüzde yerine inen miktar yazılır.
5. Görseller içerik karmasıyla adlandırıldığı için dersler arasında paylaşılır; bir ders silinince başka dersin kullandığı görsel kalır.

## Sürüm ve güncelleme

**Ders içeriği**: karma, ders sayfasının `/_astro/` adları ve Astro'nun `data-astro-cid` öznitelikleri çıkarılmış hâlinden, veri ve materyal dosyasından ve görsel adlarından hesaplanır. Yalnız betik değişen bir derleme dersleri "güncel değil" göstermez. Karma farklıysa ders kartında ve `/cevrimdisi/` satırında "Güncelleme var" yazar; "Güncelle" dersi yeniden indirir. Karma aynı ama kabuk sürümü farklıysa (betik adları değişti) bakım dersi sessizce yeniler.

**Uygulama**: çalışan `updateViaCache: "none"` ile kaydedilir, uzun açık sekmeler 20 dakikadan sonra öne gelince güncelleme arar. Yeni çalışan kurulup bekleyince üstte "Yeni sürüm hazır" bandı çıkar. `skipWaiting` yalnız "Yenile" dokunuşuyla gelen `atla` mesajıyla çalışır; sayfa ancak o zaman yenilenir. İlk kurulum sayfayı sessizce denetimine alır (`clients.claim`).

**Bakım** (`istemci.ts` `bakim`): çevrimiçiyken en çok yarım saatte bir yarım indirmeleri sürdürür, betikleri eskiyen dersleri yeniler, "Yıldızlı dersleri çevrimdışı tut" açıksa eksik ya da değişen yıldızlı dersleri indirir.

## Ölçüm (21 Kasım 2026, AUZEF Çocuk Gelişimi önizlemesi)

- Kabuk: 184 dosya, 4,5 MB (çözülmüş). Bunun 3,3 MB'ı `/_astro/` (gzip ile yaklaşık 0,9 MB aktarım). Tam sitede `/veri/dersler.json` yaklaşık 11.000 satırla 3 MB civarına çıkar; kabuk böylece 8 MB dolayına varır.
- Bölüm sayfası ortalama 167 KB (gzip 21 KB). Tam sitedeki 223 bölüm sayfası çözülmüş hâliyle yaklaşık 37 MB, aktarımda 4,7 MB tutar; bu yüzden kabuğa girmez, arka planda kademeli iner.
- Ders başına indirme (sayfa, veri, materyal): en küçük 0,9 MB (Yabancı Dil II), ortanca 1,75 MB, en büyük 4,2 MB (Bilimsel Araştırma Teknikleri).

## Tarayıcı sınırları

**Kota (Safari 17 ve sonrası)**: tarayıcı uygulamalarında ve bağımsız açılan ana ekran uygulamalarında köken başına diskin yüzde 60'ı, toplamda yüzde 80'i. Silme köken bütünüyle ve son kullanıma göre yapılır; kalıcı moddaki kökenler dışarıda kalabilir. `persist()` sezgisel olarak verilir; ana ekrana eklenmiş olmak bunlardan biridir. `estimate()` desteklenir. Kaynak: [WebKit, Updates to Storage Policy (10 Ağustos 2023)](https://webkit.org/blog/14403/updates-to-storage-policy/).

**Yedi gün kuralı (Safari 13.1, iOS 13.4 ve sonrası)**: Safari, yedi gün boyunca kullanıcı etkileşimi olmayan sitenin betikle yazılabilen bütün depolamasını siler; service worker kayıtları ve önbellekleri de buna dahildir. Ana ekrana eklenen web uygulamaları Safari'nin parçası sayılmaz, kendi gün sayacını tutar; WebKit bunların birinci taraf verisinin silinmesini beklemediğini yazar. Kaynak: [WebKit, Full Third-Party Cookie Blocking and More (24 Mart 2020)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). Bu yüzden `/cevrimdisi/` iPhone ve iPad'de, site ana ekrandan açılmıyorsa "Ana ekrana ekle" adımlarını gösterir.

**Kalıcı depolama**: `navigator.storage.persist()` sonucu tarayıcıya göre değişir; `/cevrimdisi/` isteğin sonucunu ve `persisted()` durumunu gösterir, izin gelmezse siteyi sık açmayı ya da ana ekrana eklemeyi önerir.

**Background Fetch**: yalnız Chromium tabanlı tarayıcılarda (Chrome 74, Edge 79, Samsung Internet 11.1 ve sonrası); Safari ve Firefox desteklemez. Kaynak: [caniuse, Background fetch](https://caniuse.com/wf-background-fetch). Desteklemeyen tarayıcıda indirme sayfa açıkken sürer, kesilirse kaldığı yerden devam eder.

**`setOffline` ve testler**: Playwright'ın `context.setOffline(true)` ayarı çalışanın isteklerini de keser; senaryolar gerçekten önbellekten açılmayı sınar.

## Sınama

```bash
npx vitest run src/lib/cevrimdisi          # anahtar, paket (bellek içi Cache Storage ile)
npx tsc -p src/sw                          # çalışan tipleri
ONIZLEME_BOLUMLERI="auzef/cocuk-gelisimi" NODE_OPTIONS=--max-old-space-size=1800 npx astro build --outDir /tmp/dist-cd
CEVRIMDISI_DIST=/tmp/dist-cd PW_CHROMIUM_PATH=/opt/pw-browsers/chromium_headless_shell npm run test:e2e:cevrimdisi
rm -rf /tmp/dist-cd                        # önizleme yaklaşık 100 MB
```

E2E senaryoları (`tests/e2e/cevrimdisi.spec.ts`, 390x844 telefon ve 1280x800 masaüstü) derlenmiş siteyi GitHub Pages gibi sunan `tests/e2e/cevrimdisi-sunucu.mjs` üzerinde çalışır. Sunucunun `/__test/` kancaları yavaş ağ, ders içeriği değişikliği ve yeni çalışan sürümü benzetir. Senaryolar: kabukla gezinme, indir, çevrimdışı çöz ve yenile, indirilmemiş ders ve çevrimdışı sayfası, silme, "Güncelleme var", "Yeni sürüm hazır" ve yavaş ağda 3 saniyelik geçiş. Ekran görüntüleri `E2E_EKRAN` klasörüne yazılır; açıp bakılır.
