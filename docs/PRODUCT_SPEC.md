# Açık Öğretim Çalışma Portalı - Ürün Spesifikasyon Dokümanı (PSD)

## 1. Giriş
**Açık Öğretim Çalışma Portalı**, açık öğretim fakültesi öğrencileri için geliştirilmiş, ücretsiz, açık kaynaklı ve modern bir ders çalışma platformudur. Bu proje, öğrencilerin sınavlara hazırlanırken kaynaklara kolayca erişmesini, interaktif testler çözmesini ve ilerlemelerini takip etmesini sağlamayı amaçlar.

### 1.1 Amaç
Projenin temel amacı, farklı üniversitelerin (Anadolu AÖF, ATA-AÖF, AUZEF) açık öğretim programlarındaki ders materyallerini ve çıkmış soruları tek bir çatı altında toplayarak, öğrencilere kullanıcı dostu, hızlı ve erişilebilir bir çalışma ortamı sunmaktır.

### 1.2 Kapsam
Bu doküman, Açık Öğretim Çalışma Portalı'nın mevcut özelliklerini, teknik mimarisini, kullanıcı gereksinimlerini ve gelecekteki geliştirme planlarını kapsar.

## 2. Hedef Kitle
*   **Birincil Kullanıcılar:** Anadolu Üniversitesi (Anadolu AÖF), Atatürk Üniversitesi (ATA-AÖF) ve İstanbul Üniversitesi (AUZEF) açık öğretim fakültelerinde okuyan öğrenciler.
*   **İkincil Kullanıcılar:** Açık öğretim sistemine ilgi duyan, kendi kendine öğrenmek isteyen bireyler.
*   **Geliştiriciler:** Açık kaynak projelere katkıda bulunmak isteyen yazılımcılar.

## 3. Özellikler ve Fonksiyonel Gereksinimler

### 3.1 Ders ve Soru Yönetimi
*   **Geniş Kapsam:** 3 büyük üniversitenin ders içeriklerini destekler.
    *   ATA-AÖF: Tüm bölümler aktif.
    *   Anadolu AÖF: Görsel İletişim Tasarımı (diğer bölümler eklenebilir).
    *   AUZEF: Çocuk Gelişimi (diğer bölümler eklenebilir).
*   **Veri Yapısı:** Dersler ve sorular JSON formatında saklanır (`data/` klasörü).

### 3.2 İnteraktif Test Modülü
*   **Test Arayüzü:** Kullanıcı dostu, dikkat dağıtmayan test çözme ekranı.
*   **Anlık Geri Bildirim:** Cevap seçildiğinde doğru/yanlış durumunun anında gösterilmesi.
*   **Açıklamalı Çözümler:**
    *   Soruların altında kitap notları ve açıklamalar.
    *   **Gemini AI Entegrasyonu:** Yapay zeka destekli soru açıklamaları.
*   **Filtreleme:** Sadece yanlış yapılan soruları tekrar çözme imkanı.
*   **Yazdırma Desteği:** Testlerin kağıt ortamında çözülmesi için temiz çıktı alma özelliği.

### 3.3 Erişilebilirlik ve Kullanıcı Deneyimi
*   **Sesli Okuma (TTS):** Soruların ve şıkların sesli olarak okunması (görme engelli veya dinleyerek çalışanlar için).
*   **Tema Desteği:**
    *   Aydınlık Mod (Light Mode)
    *   Karanlık Mod (Dark Mode)
    *   Sepya Modu (Göz yormayan okuma modu)
*   **Mobil Uyumluluk:** Responsive tasarım sayesinde mobil cihazlarda uygulama deneyimi (PWA özellikleri).

### 3.4 Kişiselleştirme ve Gizlilik
*   **Favori Dersler:** Kullanıcıların sık çalıştığı dersleri favorilere ekleyebilmesi.
*   **İlerleme Takibi:** Çözülen testlerin ve başarı oranlarının takibi.
*   **Gizlilik Odaklı:** Tüm veriler (favoriler, ilerleme durumu) kullanıcının tarayıcısında (Local Storage) saklanır. Sunucu tarafında kişisel veri tutulmaz.

## 4. Teknik Mimari

### 4.1 Teknoloji Yığını (Tech Stack)
*   **Frontend Framework:** Astro v5 (Statik Site Üretimi - SSG)
*   **Stil (Styling):** Tailwind CSS
*   **Programlama Dili:** TypeScript
*   **Veri Kaynağı:** JSON dosyaları
*   **Dağıtım (Deployment):** GitHub Pages

### 4.2 Veri Modeli
Proje verileri `data/` klasörü altında hiyerarşik bir yapıda tutulur:
*   `data/courses/[universite]/[bolum].json`: Ders listeleri ve bölüm bilgileri.
*   `data/questions/[universite]/[ders-adi].json`: İlgili dersin soruları ve cevap anahtarları.

### 4.3 Performans
*   Statik site mimarisi sayesinde ultra hızlı sayfa yüklemeleri.
*   Gereksiz JavaScript kullanımından kaçınılarak optimize edilmiş kod yapısı.

## 5. Yol Haritası (Roadmap) ve Gelecek Planları

### 5.1 Kısa Vadeli Hedefler
*   [ ] Eksik bölümlerin (Anadolu AÖF ve AUZEF) ders içeriklerinin tamamlanması.
*   [ ] Kullanıcı arayüzünde iyileştirmeler ve hata düzeltmeleri.

### 5.2 Orta ve Uzun Vadeli Hedefler
*   [ ] **AI Asistanı:** Öğrencilerin sorularını yanıtlayan, kişiselleştirilmiş çalışma planı sunan gelişmiş yapay zeka asistanı.
*   [ ] **Topluluk Özellikleri:** Öğrencilerin soru tartışabileceği (GitHub Discussions veya harici bir platform entegrasyonu) alanlar.
*   [ ] **Daha Fazla Erişilebilirlik:** Klavye navigasyonu ve ekran okuyucu uyumluluğunun artırılması.

## 6. Başarı Kriterleri
*   Kullanıcı sayısında ve site trafiğinde artış.
*   GitHub üzerindeki katkı (PR, Issue) sayısının artması.
*   Kullanıcı geri bildirimlerinin olumlu yönde olması.
*   Sayfa yükleme sürelerinin ve performans metriklerinin (Lighthouse skorları) yüksek kalması.

## 7. Yasal ve Lisans
*   **Lisans:** Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0).
*   **Ticari Kullanım:** Yasaktır.
*   **Eğitim Amaçlı Kullanım:** Kaynak gösterilerek serbesttir.
