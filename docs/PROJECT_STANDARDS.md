# Proje Standartları ve Geliştirme Kılavuzu

Bu doküman, **Açık Öğretim Çalışma Portalı** projesinde kod kalitesini, tutarlılığı, performansı ve sürdürülebilirliği sağlamak amacıyla belirlenen detaylı standartları içerir. Tüm geliştiricilerin ve AI asistanlarının bu kurallara uyması zorunludur.

## 1. Genel Prensipler
*   **KISS (Keep It Simple, Stupid):** Çözümleri mümkün olduğunca basit tutun. Karmaşıklıktan kaçının.
*   **DRY (Don't Repeat Yourself):** Tekrarlanan kodları fonksiyonlara veya bileşenlere ayırın.
*   **SSOT (Single Source of Truth):** Veri ve durum yönetimi tek bir kaynaktan beslenmelidir (örn. Zod şemaları).
*   **Boy Scout Rule:** Kodu bulduğunuzdan daha temiz bırakın.

## 2. Kodlama Standartları

### 2.1 Dil ve İsimlendirme
*   **Dil:** Kod tabanındaki tüm isimlendirmeler (değişkenler, fonksiyonlar, sınıflar) ve yorum satırları **İngilizce** olmalıdır. Sadece kullanıcı arayüzünde görünen metinler Türkçe olabilir.
*   **İsimlendirme Kuralları:**
    *   **Dosyalar:**
        *   Bileşenler: `PascalCase` (örn: `QuizPlayer.astro`, `Button.tsx`)
        *   Yardımcılar/Hook'lar: `camelCase` (örn: `useLocalStorage.ts`, `formatDate.ts`)
        *   Sayfalar: `kebab-case` (Astro routing standardı) (örn: `ders-detay.astro`, `[course-id].astro`)
    *   **Değişkenler:** `camelCase`. Anlamlı ve açıklayıcı olmalı (örn: `isModalOpen` yerine `open` değil). Boolean değerler `is`, `has`, `should` ile başlamalıdır.
    *   **Fonksiyonlar:** `camelCase`. Eylem belirten fiillerle başlamalıdır (örn: `fetchQuestions`, `handleClick`).
    *   **Sınıflar ve Tipler:** `PascalCase` (örn: `QuizEngine`, `UserResponse`).
    *   **Sabitler:** `UPPER_SNAKE_CASE` (örn: `MAX_RETRY_COUNT`, `API_BASE_URL`).

### 2.2 TypeScript Standartları
*   **Strict Mode:** `tsconfig.json` dosyasında `strict: true` her zaman aktif olmalıdır.
*   **Tip Tanımları:**
    *   `any` kullanımı **kesinlikle yasaktır**. Eğer tip bilinmiyorsa `unknown` kullanılmalı ve type narrowing yapılmalıdır.
    *   `interface` yerine `type` kullanımı tercih edilmelidir (tutarlılık için).
    *   Fonksiyon parametreleri ve dönüş değerleri açıkça tiplendirilmelidir.
*   **Import:**
    *   Sadece tip import ediliyorsa `import type { ... }` sözdizimi kullanılmalıdır.
    *   Absolute path (alias) kullanımı tercih edilmelidir (örn: `../../components/Button` yerine `@/components/Button`).

### 2.3 Astro ve React Bileşenleri
*   **Fonksiyonel Bileşenler:** React bileşenleri her zaman fonksiyonel (Functional Components) olarak yazılmalıdır.
*   **Props:** Props tanımları için TypeScript arayüzleri veya tipleri kullanılmalıdır. Props destructuring tercih edilmelidir.
*   **Hooks:** Özel hook'lar (Custom Hooks) `src/hooks` veya `src/lib` altında toplanmalı ve `use` öneki ile başlamalıdır.
*   **Astro Scriptleri:** İstemci tarafı JavaScript, Astro bileşenlerinde `<script>` etiketi içinde yazılırken modüler olmalı ve global scope kirletilmemelidir.

### 2.4 CSS ve Tailwind Standartları
*   **Utility-First:** Mümkün olduğunca Tailwind utility sınıfları kullanılmalıdır.
*   **@apply Kullanımı:** Sadece çok tekrar eden ve karmaşık bileşen stilleri için `@apply` kullanılabilir, ancak aşırıya kaçılmamalıdır.
*   **Sıralama:** Tailwind sınıfları mantıksal bir sırada olmalıdır (örn: Layout -> Box Model -> Typography -> Visuals -> Misc). Prettier eklentisi varsa otomatik sıralama kullanılır.
*   **Responsive:** Mobil öncelikli (Mobile-First) yaklaşım uygulanmalıdır. Önce varsayılan (mobil) stil, sonra `sm:`, `md:`, `lg:` gibi breakpoint'ler eklenmelidir.

## 3. Proje Yapısı

```
/
├── data/                   # Statik JSON verileri (Veritabanı yerine)
├── public/                 # Statik varlıklar (Resimler, fontlar, favicon)
├── src/
│   ├── components/         # UI bileşenleri (.astro, .tsx)
│   │   ├── ui/             # Temel UI elemanları (Button, Card, Input)
│   │   └── features/       # Özellik bazlı bileşenler (Quiz, CourseList)
│   ├── layouts/            # Sayfa şablonları
│   ├── lib/                # Yardımcı kütüphaneler, şemalar, tipler
│   │   ├── schemas.ts      # Zod şemaları (SSOT)
│   │   └── api.ts          # Veri erişim katmanı
│   ├── pages/              # Sayfa rotaları (File-based routing)
│   ├── scripts/            # İstemci tarafı karmaşık mantıklar (Vanilla JS/TS)
│   └── styles/             # Global stiller
└── docs/                   # Proje dokümantasyonu
```

## 4. Veri Yönetimi ve Durum (State)
*   **Sunucu Durumu (Server State):** Astro SSG olduğu için build zamanında oluşturulur. Çalışma zamanında veri çekme işlemi (fetching) yoktur.
*   **İstemci Durumu (Client State):**
    *   Basit durumlar için `useState` (React) veya Vanilla JS değişkenleri.
    *   Global durumlar için `nanostores` (Astro ile uyumlu).
    *   Kalıcı veriler için `localStorage` (Wrapper fonksiyonlar aracılığıyla).
*   **Veri Doğrulama:** Tüm dış veriler (JSON dosyaları) `Zod` şemaları ile doğrulanmalıdır.

## 5. Hata Yönetimi (Error Handling)
*   **Try-Catch:** Asenkron işlemler ve riskli bloklar `try-catch` içine alınmalıdır.
*   **Kullanıcı Bildirimi:** Hatalar kullanıcıya nazik bir dille gösterilmeli, teknik detaylar konsola veya loglama servisine yazılmalıdır.
*   **Fail Gracefully:** Bir bileşen hata verdiğinde tüm sayfanın çökmesi engellenmeli, yedek içerik (fallback) gösterilmelidir.

## 6. Performans Optimizasyonu
*   **Lazy Loading:** Görseller ve ekran dışı bileşenler tembel yüklenmelidir (`loading="lazy"`).
*   **Bundle Size:** İstemciye gönderilen JavaScript boyutu minimumda tutulmalıdır. Astro'nun `client:*` direktifleri bilinçli kullanılmalıdır (örn: `client:load` yerine `client:visible` veya `client:idle`).
*   **Görseller:** WebP veya AVIF formatları tercih edilmeli, uygun boyutlarda sunulmalıdır.

## 7. Git Akışı ve Versiyonlama
*   **Branch İsimlendirme:**
    *   Özellik: `feat/kisa-aciklama`
    *   Hata Düzeltme: `fix/kisa-aciklama`
    *   Dokümantasyon: `docs/kisa-aciklama`
    *   Refactor: `refactor/kisa-aciklama`
*   **Commit Mesajları:** Conventional Commits standardına uygun olmalıdır.
    *   `feat: add dark mode support`
    *   `fix: resolve quiz score calculation bug`
    *   `docs: update installation guide`

## 8. Test Stratejisi
*   **Birim Testleri (Unit Tests):** `src/lib` altındaki yardımcı fonksiyonlar ve mantıksal işlemler (örn: puan hesaplama) için `vitest` ile test yazılmalıdır.
*   **Bileşen Testleri:** Karmaşık UI bileşenleri için render testleri yapılmalıdır.
*   **Manuel Test:** Her PR öncesi geliştirici kendi kodunu farklı tarayıcılarda ve mobil görünümde test etmelidir.

## 9. Güvenlik
*   **XSS:** Kullanıcı girdileri doğrudan DOM'a basılmamalı, framework'lerin escaping mekanizmaları kullanılmalıdır.
*   **Veri Gizliliği:** Kullanıcıya ait hiçbir veri (isim, ilerleme vb.) sunucuya gönderilmemeli, sadece tarayıcıda saklanmalıdır.
