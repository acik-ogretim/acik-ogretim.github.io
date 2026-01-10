# Yazılım Gereksinimleri Spesifikasyonu (SRS)

## 1. Giriş
Bu doküman, Açık Öğretim Çalışma Portalı'nın yazılım gereksinimlerini teknik detaylarıyla tanımlar. Geliştiriciler için bir rehber niteliğindedir.

## 2. Sistem Arayüzleri

### 2.1 Kullanıcı Arayüzleri (UI)
*   **Ana Sayfa:** Üniversite ve bölüm seçim kartları.
*   **Ders Listesi:** Dönemlere ayrılmış akordeon yapı.
*   **Quiz Player:** Soru metni, şıklar, kontrol butonları, ilerleme çubuğu.
*   **Ayarlar Çekmecesi (Drawer):** Tema, ses, filtre ayarları.

### 2.2 Donanım Arayüzleri
*   Sistem, modern web tarayıcısı çalıştıran tüm cihazlarda (Akıllı telefon, Tablet, Laptop) çalışmalıdır.
*   Sesli okuma için cihazın ses kartı ve hoparlörüne erişim gereklidir.

### 2.3 Yazılım Arayüzleri
*   **Web Speech API:** TTS özelliği için tarayıcı API'si.
*   **LocalStorage API:** Veri saklama için.
*   **Intersection Observer API:** Scroll takibi için.

## 3. Fonksiyonel Gereksinimler (Detaylı)

### 3.1 Veri İşleme ve Doğrulama
*   **REQ-01:** Sistem, `data/` klasöründeki JSON dosyalarını build zamanında parse etmelidir.
*   **REQ-02:** **Zod Şema Doğrulaması:**
    *   `questionSchema`: Her soru tam olarak 5 şıkka sahip olmalıdır. Şıklar dizi veya obje formatında olabilir, ancak çıktı her zaman `{key: string, text: string}[]` formatına dönüştürülmelidir.
    *   `courseSchema`: `unitCount` varsayılan olarak 14 olmalıdır.
*   **REQ-03:** Hatalı JSON formatı veya eksik alan (örn. `correctAnswer`) tespit edilirse build işlemi hata vererek durdurulmalıdır (Fail Fast).

### 3.2 Quiz Mantığı
*   **REQ-04:** "Karıştır" seçeneği aktifse, sorular Fisher-Yates algoritması ile rastgele sıralanmalıdır.
*   **REQ-05:** "Yanlışları Filtrele" seçeneği aktifse, `localStorage`'dan geçmiş veriler okunmalı ve sadece `false` olarak işaretlenmiş sorular listelenmelidir.
*   **REQ-06:** **İnteraktif Mod:** Bu modda cevaplar gizlenmeli, doğru/yanlış geri bildiriminden sonra otomatik geçiş (Timer) devreye girmelidir.

### 3.3 Sesli Okuma (TTS)
*   **REQ-07:** Okuma işlemi sırasında metin parçalara (chunk) bölünmelidir.
*   **REQ-08:** Kullanıcı sayfadan ayrıldığında (`beforeunload`) okuma derhal durdurulmalıdır.
*   **REQ-09:** Tarayıcıda Türkçe ses (`tr-TR`) mevcutsa öncelikli olarak kullanılmalı, yoksa varsayılan ses kullanılmalıdır.
*   **REQ-10:** Tarayıcı kaynaklı kesintilerde (`interrupted` hatası) sistem otomatik olarak yeniden denemelidir (Retry Logic).

## 4. Performans Gereksinimleri
*   **REQ-11:** `QuizPlayer` bileşeni, 1000 soruluk bir testte bile takılmadan (60fps) çalışmalıdır.
*   **REQ-12:** Sayfa geçişlerinde CLS (Cumulative Layout Shift) 0.1'in altında olmalıdır.
*   **REQ-13:** Görseller ve ikonlar lazy-load ile yüklenmelidir.

## 5. Tasarım Kısıtlamaları
*   **Standartlar:** HTML5, CSS3, ES6+.
*   **Framework:** Astro v5.
*   **Stil:** Tailwind CSS v4.
*   **Veri Kaynağı:** Sadece statik JSON dosyaları (Veritabanı yok).
