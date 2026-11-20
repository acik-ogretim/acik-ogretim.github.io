# Sistem Analizi Dokümanı

Bu doküman, **Açık Öğretim Çalışma Portalı**'nın sistem gereksinimlerini, kısıtlamalarını, performans hedeflerini ve veri analizini detaylandırır.

## 1. Sistem Genel Bakışı
Sistem, sunucu tarafı işlem (Server-Side Processing) gerektirmeyen, tamamen istemci tarafında (Client-Side) çalışan ve statik olarak sunulan (Static Site Generation) bir web uygulamasıdır. Bu mimari, yüksek performans, düşük maliyet ve yüksek güvenlik sağlar.

## 2. Fonksiyonel Olmayan Gereksinimler (Non-Functional Requirements)

### 2.1 Performans
*   **İlk Yükleme Süresi (FCP):** < 1.5 saniye (3G bağlantıda).
*   **Etkileşime Hazır Olma Süresi (TTI):** < 2.0 saniye.
*   **Lighthouse Skoru:** Performans, Erişilebilirlik, SEO ve Best Practices alanlarında en az 90/100.
*   **Sayfa Boyutu:** İlk yüklemede indirilen veri boyutu (Gzip sıkıştırması ile) < 500KB olmalıdır.

### 2.2 Güvenlik
*   **Veri Gizliliği:** Kullanıcı verileri (ilerleme, ayarlar, sohbet geçmişi) sadece kullanıcının tarayıcısında (`localStorage`) saklanır. Siteye hiçbir kişisel veri gönderilmez.
*   **Yapay Zekâ Anahtarı (BYOK):** Anahtar yalnız tarayıcıda durur, yedek dosyasına girmez; sohbet istekleri tarayıcıdan doğrudan kullanıcının seçtiği sağlayıcıya gider.
*   **Ziyaret Sayacı:** Çerezsizdir; Cloudflare Web Analytics ve günlük değişen özet değerle çalışan anonim sayaç (`workers/sayac/`) yalnız toplu sayı tutar.
*   **XSS Koruması:** Astro ve React/Preact gibi modern frameworklerin sağladığı otomatik escaping mekanizmaları kullanılır.
*   **HTTPS:** Tüm bağlantılar SSL/TLS üzerinden şifrelenmelidir (GitHub Pages varsayılan olarak sağlar).

### 2.3 Uyumluluk ve Erişilebilirlik
*   **Tarayıcı Desteği:** Chrome, Firefox, Safari, Edge (son 2 sürüm).
*   **Mobil Uyumluluk:** Responsive tasarım ile tüm ekran boyutlarında (Mobil, Tablet, Masaüstü) sorunsuz çalışmalıdır.
*   **Erişilebilirlik (A11y):** WCAG 2.1 AA standartlarına uyum hedeflenir. Ekran okuyucular (Screen Readers) için semantik HTML yapısı kullanılır.

## 3. Veri Analizi ve Yönetimi

### 3.1 Veri Kaynakları
Sistem verileri statik JSON dosyalarından oluşur. Veritabanı yönetim sistemi (DBMS) kullanılmaz.
*   **Hacim:** Şu an için ~100MB altı veri öngörülmektedir.
*   **Güncelleme Sıklığı:** Dönem başlarında veya yeni sınav soruları açıklandığında manuel güncelleme yapılır.

### 3.2 Veri Bütünlüğü
*   JSON dosyaları ile TypeScript şemaları (`Zod`) arasında sıkı bir uyum vardır.
*   Build sürecinde veri doğrulama testleri çalıştırılarak hatalı verilerin canlıya çıkması engellenir.

## 4. Kısıtlamalar ve Riskler

### 4.1 Kısıtlamalar
*   **Dinamik İçerik:** Sunucu tarafı olmadığı için kullanıcılar arası etkileşim 3. parti servislerle çözülür: tartışma ve hata bildirimi GitHub Discussions (giscus) ve GitHub issue formlarıyla yapılır. Sıralama tablosu gibi özellikler hâlâ uygulanamaz. Bu tür özellikler için 3. parti servisler (Firebase, Supabase vb.) gerekebilir.
*   **Veri Senkronizasyonu:** Kullanıcı verileri tarayıcıda saklandığı için cihaz değişiminde kaybolabilir. Bunu önlemek için `/yedek` sayfası isteğe bağlı eşitleme yolları sunar: remoteStorage, Google Drive uygulama klasörü, Dropbox, cihazdan cihaza (parola ile), şifreli GitHub gist ve dosya. Hiçbirini kullanmayan kullanıcının kayıtları yalnız tek tarayıcıda kalır.

### 4.2 Riskler
*   **Telif Hakları:** Ders materyallerinin ve soruların telif hakları üniversitelere aittir. Proje "Adil Kullanım" ve eğitim amaçlı paylaşım prensiplerine dayanır, ancak yasal uyarı gelmesi durumunda içeriklerin kaldırılması gerekebilir.

## 5. Sistem Bileşenleri Analizi

### 5.1 Quiz Motoru (Quiz Engine)
*   **Girdi:** JSON formatında soru listesi.
*   **İşlem:** Karıştırma (Shuffle), Filtreleme (Yanlışlar/Boşlar), Puanlama.
*   **Çıktı:** Anlık geri bildirim, İstatistiksel veri.

### 5.2 İçerik Yönetim Sistemi (CMS - Git Based)
*   İçerik eklemek isteyen katkıcılar, GitHub üzerinden Pull Request açarak JSON dosyalarını düzenler.
*   Bu yöntem, teknik bilgisi olmayan kullanıcılar için zorluk yaratabilir. Gelecekte basit bir admin paneli düşünülebilir.
