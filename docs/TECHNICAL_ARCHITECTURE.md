# Açık Öğretim Çalışma Portalı - Teknik Mimari Dokümanı (TAD)

## 1. Genel Bakış
Bu doküman, **Açık Öğretim Çalışma Portalı** projesinin teknik yapısını, bileşenlerini, veri akışını ve kullanılan teknolojileri detaylandırır. Proje, performans ve erişilebilirlik odaklı, statik site üretimi (SSG) mimarisine sahip modern bir web uygulamasıdır.

## 2. Teknoloji Yığını (Tech Stack)

| Kategori | Teknoloji | Açıklama |
|---|---|---|
| **Framework** | [Astro v5](https://astro.build) | Statik Site Üretimi (SSG) ve bileşen tabanlı mimari. |
| **Dil** | [TypeScript](https://www.typescriptlang.org/) | Tip güvenliği ve geliştirme kolaylığı. |
| **Stil** | [Tailwind CSS](https://tailwindcss.com) | Utility-first CSS framework. |
| **Veri Doğrulama** | [Zod](https://zod.dev) | Şema tanımlama ve veri doğrulama. |
| **İkonlar** | SVG / Google Fonts | Optimize edilmiş vektör ikonlar. |
| **Arayüz adası** | React 19, [Base UI](https://base-ui.com), Lucide | Sohbet asistanı ve ayar formu (Astro adası olarak tarayıcıda yüklenir). |
| **Yapay zekâ** | [TanStack AI](https://tanstack.com/ai) | Gemini, OpenAI, Anthropic ve OpenRouter bağdaştırıcıları; kullanıcının kendi anahtarıyla tarayıcıdan çağrılır (BYOK). |
| **Depolama** | LocalStorage | Kullanıcı tercihleri, ilerleme, yapay zekâ anahtarı ve sohbet geçmişi (Client-side). |
| **Eşitleme** | remoteStorage.js, Google Drive (`drive.appdata`), Trystero (WebRTC), GitHub gist | Kayıtların kullanıcının kendi seçtiği yolla cihazlar arası taşınması. |
| **Tartışma** | [giscus](https://giscus.app) | GitHub Discussions tabanlı soru ve ders tartışması. |
| **Ziyaret sayacı** | Cloudflare Web Analytics, Cloudflare Worker + D1 | Çerezsiz toplu sayılar ve anonim tekil ziyaretçi sayacı. |
| **TTS** | Web Speech API | Tarayıcı tabanlı metin okuma (Text-to-Speech). |
| **Dağıtım** | GitHub Pages | Statik hosting. |

## 3. Proje Yapısı

```
/
├── data/                   # Veri Katmanı (JSON dosyaları)
│   ├── courses/            # Ders listeleri
│   └── questions/          # Soru bankaları
├── public/                 # Statik dosyalar (logo.svg, favicon, manifest, service worker)
├── workers/sayac/          # Ziyaret sayacı Worker'ı (worker.js, sema.sql, kur.py)
├── src/                    # Kaynak kodlar
│   ├── components/         # Yeniden kullanılabilir UI bileşenleri
│   │   ├── sohbet/         # Sohbet asistanı (React): Sohbet, SohbetCekmece, SaglayiciAyarlari, SinavKarti, BelgeKarti
│   │   └── Tartisma.astro  # Soru ve ders tartışması, hata bildirimi
│   ├── layouts/            # Sayfa şablonları (Layout.astro)
│   ├── lib/                # Yardımcı fonksiyonlar, tipler ve şemalar
│   ├── pages/              # Sayfa rotaları (File-based routing)
│   ├── scripts/            # İstemci tarafı (Client-side) scriptler
│   └── styles/             # Global stiller
├── astro.config.mjs        # Astro konfigürasyonu
├── tailwind.config.mjs     # Tailwind konfigürasyonu
└── tsconfig.json           # TypeScript konfigürasyonu
```

## 4. Veri Mimarisi

Proje, veritabanı yerine yapılandırılmış JSON dosyaları kullanır. Bu veriler derleme (build) zamanında işlenir ve statik HTML sayfalarına dönüştürülür.

### 4.1 Veri Modelleri (Schemas)
Veri modelleri `src/lib/schemas.ts` dosyasında **Zod** kütüphanesi ile tanımlanmıştır.

*   **University (Üniversite):** Üniversite adı, logosu, fakülte bilgisi.
*   **Department (Bölüm):** Bölüm adı, kodu, eğitim düzeyi (önlisans/lisans).
*   **Course (Ders):** Ders adı, kodu, kredi bilgisi, soru sayısı.
*   **Question (Soru):** Soru metni, şıklar, doğru cevap, açıklama, zorluk seviyesi.

### 4.2 Veri Akışı
1.  **Veri Girişi:** `data/` klasörüne JSON formatında yeni ders/soru eklenir.
2.  **Derleme (Build):** Astro, `src/pages/` altındaki dinamik rotaları (`[university]/[department]/[course].astro`) oluştururken bu JSON dosyalarını okur.
3.  **Doğrulama:** Zod şemaları ile veri bütünlüğü kontrol edilir. Hatalı veri varsa derleme başarısız olur.
4.  **Render:** Sayfalar statik HTML olarak oluşturulur ve `dist/` klasörüne çıktılanır.

### 4.3 Veri İşleme ve Senkronizasyon (Data Processing & Sync)
Proje, ham verileri (raw JSON) işleyerek uygulamada kullanılabilir temiz formata dönüştüren güçlü bir veri işleme hattına (pipeline) sahiptir.

*   **HTML Temizleme:** Ham verilerdeki bozuk HTML etiketleri, gereksiz stiller ve OCR hataları temizlenir. Performans için **Cheerio** yerine **htmlparser2** tabanlı "Fast Cleaner" (`cleanHtmlFast`) kullanılır. Bu geçiş, büyük veri setlerinin işlenme hızını **10 kat** artırmıştır.
*   **Senkronizasyon Scriptleri:** `scripts/sync-anadolu.ts` ve `scripts/sync-auzef.ts`, ham verileri kaynak dizinlerden okur, temizler, şemalara uygunluğunu dener ve `data/` klasörüne yazar.

## 5. Temel Bileşenler ve Mantık

### 5.1 Quiz Player (Test Modülü)
Uygulamanın kalbi olan test çözme modülü `src/scripts/quiz-player.ts` dosyasında `QuizPlayer` sınıfı ile yönetilir.

*   **Sınıf Yapısı:**
    *   `questions`: Yüklenen soru listesi.
    *   `settings`: Kullanıcı ayarları (hız, filtreler, ses).
    *   `progress`: Soru bazlı başarı durumu (`Record<string, boolean[]>`).
    *   `synth`: Web Speech API sentezleyicisi.
*   **Temel Metotlar:**
    *   `init()`: DOM elementlerini bağlar ve olay dinleyicilerini (event listeners) kurar.
    *   `applyFilters()`: Ayarlara göre soruları filtreler ve DOM görünürlüğünü günceller.
    *   `handleOptionClick()`: Cevap kontrolü yapar, istatistikleri günceller ve TTS tetikler.
    *   `speakCurrent()`: Mevcut soruyu parçalara bölerek sesli okur.

### 5.2 Routing (Yönlendirme)
Astro'nun dosya tabanlı yönlendirme sistemi kullanılır:
*   `src/pages/index.astro`: Ana sayfa.
*   `src/pages/[university]/index.astro`: Üniversite detay sayfası.
*   `src/pages/[university]/[department]/index.astro`: Bölüm dersleri listesi.
*   `src/pages/[university]/[department]/[course].astro`: Test çözme sayfası.

## 6. Sohbet Asistanı, Eşitleme ve Topluluk Katmanı

Sitenin sunucusu yoktur; bu bölümdeki her özellik tarayıcıda çalışır ve kullanıcının kendi hesabına ya da anahtarına dayanır.

### 6.1 Sohbet asistanı (BYOK)
*   **Sayfa ve bileşenler:** `src/pages/sohbet.astro` tam sayfa sohbeti, `src/components/sohbet/SohbetCekmece.tsx` ders sayfasındaki "Derse sor" çekmecesini açar. Sohbet kodu çekmece ilk açıldığında yüklenir.
*   **Sağlayıcılar:** `src/lib/chat/providers.ts` dört sağlayıcıyı (Gemini, OpenAI, Anthropic, OpenRouter), model listesini ve anahtar denemesini yönetir. Anahtar `localStorage`'da kalır; istekler tarayıcıdan doğrudan sağlayıcıya gider.
*   **Araçlar:** `src/lib/chat/tools.ts` modelin çağırabildiği işleri tanımlar: `ders_bul`, `ders_bilgisi`, `soru_ara`, `soru_getir`, `unite_sorulari`, `unite_ozeti`, `konular`, `konu_anlat`, `ilerlemem`, `belge_olustur`, `mini_sinav`.
*   **Belge ve sınav kartları:** `BelgeKarti.tsx` belgeyi kopyalama, `.md` indirme ve yazdırma düğmeleriyle gösterir; `SinavKarti.tsx` sohbet içinde çözülen mini sınavı gösterir ve sonuçları ders kaydına işler.
*   **Sohbet geçmişi:** `src/lib/chat/gecmis.ts` ders bazlı konuşma dizinini tutar; iletiler TanStack AI'ın `localStorage` kalıcılığındadır.
*   **Ses:** Sesle yazma ve canlı konuşma tarayıcının ses tanıma özelliğini (`tr-TR`), yanıtları seslendirme `speechSynthesis` ve soru okumadaki ses/hız ayarlarını kullanır. Destek yoksa ilgili düğme görünmez.
*   **Açıklama menüsü:** `src/lib/chat/enrich.ts` aynı sağlayıcı ayarlarıyla açıklamayı kısaltır, genişletir ya da şıkları açıklar.

### 6.2 Konu eşleşmesi
*   Kitap konu ağacı `data/konular/` altındadır; her sorunun `section` alanı konu numarasına (ör. `4.2.2`) bağlanır. Ders sayfası numarayı konu başlığıyla birlikte soru kartında gösterir, sohbet araçları `konular` ve `konu_anlat` aynı ağacı kullanır.

### 6.3 Kayıtları taşıma (`/yedek`)
*   `src/lib/yedek.ts` tarayıcı kayıtlarını (çözülen sorular, yanlışlar, favoriler, ayarlar, sohbet geçmişi) tek bir JSON'a toplar ve içe aktarırken yerel kayıtla birleştirir; `-api-key` ile biten anahtarlar dışarı çıkmaz.
*   `rs-esitle.ts` remoteStorage widget'ını kurar; Google ve Dropbox anahtarları tanımlıysa bu seçenekler de görünür. `google-esitle.ts` Drive uygulama klasörüne (`drive.appdata`) eşitler. `p2p-esitle.ts` Trystero ile parolaya dayalı cihazdan cihaza (WebRTC) eşitler. `bulut-esitle.ts` kayıtları kullanıcının parolasıyla tarayıcıda şifreleyip kendi GitHub gist'ine yazar.
*   Site bu yollardan hiçbirinde veri almaz; tarayıcı doğrudan kullanıcının seçtiği hedefle konuşur. Derleme değişkenleri: `PUBLIC_GOOGLE_CLIENT_ID`, `PUBLIC_DROPBOX_APP_KEY`.

### 6.4 Tartışma ve hata bildirimi
*   `src/components/Tartisma.astro` tek bir pencere ve tek bir giscus yükleyicisi barındırır. Her soru `üniversite/ders/soru-kimliği`, her ders `üniversite/ders` terimiyle kendi GitHub Discussions başlığına eşlenir. giscus yalnız pencere açıldığında yüklenir.
*   Hata bildirimi düğmeleri ekrandaki soru ve açıklama metnini önceden doldurulmuş bir GitHub issue formuna taşır; form kullanıcı göndermeden hiçbir şey paylaşılmaz.

### 6.5 Ziyaret sayacı (`workers/sayac/`)
*   Cloudflare Web Analytics çerezsiz sayfa sayıları verir. Ayrıca `workers/sayac/worker.js` bir Cloudflare Worker ve D1 veritabanıyla tekil ziyaretçiyi sayar: ziyaretçi, IP, tarayıcı bilgisi, gün ve gizli tuzdan üretilen SHA-256 özetidir; ham IP ya da tarayıcı bilgisi saklanmaz, özet günler arasında eşleştirilemez. `/hit` kaydı alır, `/ozet` toplu sayıları verir; kurulum için `kur.py` ve `sema.sql` kullanılır.

## 7. İstemci Tarafı Özellikleri (Client-Side Features)

Uygulama statik olsa da, zengin bir kullanıcı deneyimi için istemci tarafında JavaScript kullanır:

*   **Karanlık Mod:** Kullanıcının tercihine göre tema değiştirme (Tailwind `dark` class).
*   **İlerleme Takibi:** Çözülen sorular ve başarı oranları tarayıcı hafızasında saklanır.
*   **Filtreleme:** Yanlış yapılan veya boş bırakılan soruları filtreleme mantığı istemci tarafında çalışır.

## 8. Geliştirme ve Katkı Süreci

1.  **Kurulum:** `npm install`
2.  **Geliştirme Sunucusu:** `npm run dev`
3.  **Build:** `npm run build`
4.  **Lint/Check:** Kod kalitesi için ESLint ve Prettier kullanılır.

## 9. Güvenlik ve Performans
*   **Güvenlik:** Site tarafında sunucu kodu ve kayıt veritabanı yoktur; saldırı yüzeyi minimumdur. Yapay zekâ anahtarı yalnız tarayıcıda kalır ve yedeğe girmez; şifreli gist eşitlemesi kullanıcının parolasıyla tarayıcıda şifrelenir. Sayaç Worker'ı yalnız anonim özet değer tutar.
*   **Performans:** Sayfalar önceden derlendiği (Pre-rendered) için TTFB (Time to First Byte) çok düşüktür. Görseller ve scriptler lazy-load ile yüklenir.
