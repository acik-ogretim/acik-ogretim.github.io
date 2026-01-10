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
| **Depolama** | LocalStorage | Kullanıcı tercihleri ve ilerleme durumu (Client-side). |
| **TTS** | Web Speech API | Tarayıcı tabanlı metin okuma (Text-to-Speech). |
| **Dağıtım** | GitHub Pages | Statik hosting. |

## 3. Proje Yapısı

```
/
├── data/                   # Veri Katmanı (JSON dosyaları)
│   ├── courses/            # Ders listeleri
│   └── questions/          # Soru bankaları
├── public/                 # Statik dosyalar (favicon, images)
├── src/                    # Kaynak kodlar
│   ├── components/         # Yeniden kullanılabilir UI bileşenleri
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

## 6. İstemci Tarafı Özellikleri (Client-Side Features)

Uygulama statik olsa da, zengin bir kullanıcı deneyimi için istemci tarafında JavaScript kullanır:

*   **Karanlık Mod:** Kullanıcının tercihine göre tema değiştirme (Tailwind `dark` class).
*   **İlerleme Takibi:** Çözülen sorular ve başarı oranları tarayıcı hafızasında saklanır.
*   **Filtreleme:** Yanlış yapılan veya boş bırakılan soruları filtreleme mantığı istemci tarafında çalışır.

## 7. Geliştirme ve Katkı Süreci

1.  **Kurulum:** `npm install`
2.  **Geliştirme Sunucusu:** `npm run dev`
3.  **Build:** `npm run build`
4.  **Lint/Check:** Kod kalitesi için ESLint ve Prettier kullanılır.

## 8. Güvenlik ve Performans
*   **Güvenlik:** Sunucu tarafı kod çalışmadığı ve veritabanı bağlantısı olmadığı için saldırı yüzeyi minimumdur.
*   **Performans:** Sayfalar önceden derlendiği (Pre-rendered) için TTFB (Time to First Byte) çok düşüktür. Görseller ve scriptler lazy-load ile yüklenir.
