# Detaylı Sistem Analiz Raporu

## 1. Yönetici Özeti
Açık Öğretim Çalışma Portalı, performans ve erişilebilirlik öncelikli, sunucu maliyeti olmayan (Serverless/Static) modern bir web uygulamasıdır. **Astro v5** framework'ü üzerine inşa edilmiş olup, veri kaynağı olarak statik JSON dosyalarını kullanır. Uygulama, özellikle mobil cihazlarda ve düşük internet hızlarında yüksek performans gösterecek şekilde optimize edilmiştir.

## 2. Mimari Analiz

### 2.1 Temel Yapı (SSG - Static Site Generation)
*   **Framework:** Astro v5.16.6
*   **Derleme Süreci:** Uygulama, build aşamasında `data/` klasöründeki tüm JSON dosyalarını okur ve her ders için ayrı bir HTML sayfası oluşturur (`[university]/[department]/[course].astro`).
*   **Avantajı:** Çalışma zamanında (Runtime) veritabanı sorgusu veya API isteği olmadığı için sayfa geçişleri ve yüklemeler anlıktır (TTFB ~0ms).

### 2.2 Veri Katmanı
*   **Kaynak:** `data/` klasörü altında hiyerarşik JSON yapısı.
*   **Doğrulama:** `src/lib/schemas.ts` dosyasında **Zod** kütüphanesi ile tanımlanmış katı şemalar kullanılır.
    *   *Örnek:* `questionSchema` hem dizi hem de obje formatındaki şıkları kabul edip standart bir yapıya dönüştürür. Bu, veri girişindeki esnekliği artırır.
*   **Yükleme:** `src/lib/api.ts` üzerinden `fs/promises` kullanılarak sadece derleme zamanında okunur.

### 2.3 İstemci Tarafı Mantığı (Client-Side Logic)
Uygulamanın "beyni" `src/scripts/quiz-player.ts` dosyasındaki `QuizPlayer` sınıfıdır.
*   **DOM Manipülasyonu:** React veya Vue gibi bir framework'ün state yönetimi yerine, doğrudan DOM manipülasyonu (Vanilla JS) tercih edilmiştir. Bu, Astro'nun "Island Architecture" felsefesine uygundur ve JS boyutunu minimumda tutar.
*   **State Yönetimi:**
    *   **Kalıcılık:** `localStorage` kullanılarak kullanıcının ayarları (`quiz-settings`) ve çözdüğü soruların durumu (`quiz-progress-[slug]`) tarayıcıda saklanır.
    *   **Senkronizasyon:** `IntersectionObserver` API kullanılarak, kullanıcı sayfayı kaydırdıkça aktif soru indeksi güncellenir.

### 2.4 Erişilebilirlik (Accessibility & TTS)
*   **Web Speech API:** Tarayıcının yerel `speechSynthesis` motorunu kullanır.
*   **Özellikler:**
    *   Türkçe sesleri otomatik algılama ve filtreleme.
    *   Uzun metinleri (Soru, Şıklar, Cevap) parçalara bölerek okuma (Chunking).
    *   Kesinti durumunda (örn. sayfa değişimi) okumayı durdurma ve hata toleransı (Retry logic).

## 3. Kod Kalitesi ve Standartlar

### 3.1 Güçlü Yönler
*   **Tip Güvenliği:** TypeScript kullanımı proje genelinde yaygın ve tutarlı. `any` kullanımı minimize edilmiş.
*   **Modülerlik:** UI bileşenleri (`QuizPlayer.astro`) ve mantık (`quiz-player.ts`) birbirinden ayrılmış.
*   **Konfigürasyon:** Tailwind CSS ve Astro ayarları modern standartlara uygun.

### 3.2 Geliştirme Alanları
*   **DOM Bağımlılığı:** `QuizPlayer` sınıfı DOM elementlerine (`getElementById`) sıkı sıkıya bağlı. Bu, test edilebilirliği (Unit Testing) zorlaştırıyor.
*   **Veri Büyüklüğü:** Soru sayısı arttıkça JSON dosyalarının boyutu ve dolayısıyla build süresi uzayabilir. Çok büyük derslerde sayfa boyutu artabilir (Pagination yok, tüm sorular tek sayfada).

## 4. UI/UX Analizi
*   **Tasarım:** Tailwind CSS ile "Mobile-First" yaklaşımı benimsenmiş.
*   **Etkileşim:** Kullanıcıya anlık geri bildirim (Doğru/Yanlış renkleri, sesli uyarılar) veriliyor.
*   **Kişiselleştirme:** Karanlık mod, font boyutu (dolaylı), ses hızı gibi ayarlar kullanıcıya sunulmuş.

## 5. Öneriler

1.  **Test Kapsamı:** `QuizPlayer` sınıfı için JSDOM kullanılarak birim testleri yazılmalı. Şu an mantık testi manuel yapılıyor gibi görünüyor.
2.  **Sanal Kaydırma (Virtual Scrolling):** Eğer bir derste 500+ soru olursa, DOM boyutu performansı etkileyebilir. Sadece ekranda görünen soruların render edilmesi (Virtualization) düşünülebilir.
3.  **PWA Desteği:** `vite-plugin-pwa` eklenerek uygulamanın tamamen offline çalışması ve ana ekrana eklenebilmesi sağlanabilir (Mevcut durumda offline sayfa var ama tam PWA değil).

## 6. Sonuç
Sistem, amacına uygun, hafif, hızlı ve sürdürülebilir bir mimariye sahiptir. Karmaşık frameworkler yerine web standartlarına (DOM API, Web Speech API) dayanması, projenin uzun ömürlü olmasını sağlar.
