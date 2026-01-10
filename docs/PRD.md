# Ürün Gereksinim Dokümanı (PRD)

## 1. Giriş
**Açık Öğretim Çalışma Portalı**, açık öğretim fakültesi öğrencileri için geliştirilmiş, ücretsiz, açık kaynaklı ve modern bir ders çalışma platformudur. Bu doküman, ürünün vizyonunu, hedeflerini, kullanıcı gereksinimlerini ve başarı kriterlerini detaylandırır.

### 1.1 Problem Tanımı
Açık öğretim öğrencileri, ders materyallerine ve çıkmış sorulara erişimde dağınık kaynaklar, eski arayüzler ve ücretli platformlarla karşılaşmaktadır. Ayrıca, görme engelli veya dinleyerek çalışan öğrenciler için erişilebilir (TTS destekli) kaynaklar sınırlıdır.

### 1.2 Çözüm
Tüm açık öğretim kaynaklarını (Anadolu AÖF, ATA-AÖF, AUZEF) tek bir çatı altında toplayan, modern, hızlı, mobil uyumlu ve erişilebilir bir web uygulaması.

## 2. Hedef Kitle ve Personalar
*   **Öğrenci (Birincil):** Sınavlara hazırlanan, pratik yapmak isteyen, mobil cihaz kullanan açık öğretim öğrencisi.
*   **Katkıcı (İkincil):** Projeye soru eklemek veya kod geliştirmek isteyen gönüllü yazılımcı/öğrenci.

## 3. Kullanıcı Hikayeleri (User Stories)
| ID | Rol | İstek | Amaç |
|---|---|---|---|
| US-1 | Öğrenci | Yanlış yaptığım soruları filtrelemek istiyorum. | Eksiklerimi görüp hızlı tekrar yapabilmek için. |
| US-2 | Öğrenci | Soruların sesli okunmasını istiyorum. | Yolda veya gözlerim yorulduğunda dinleyerek çalışabilmek için. |
| US-3 | Öğrenci | Kaldığım yeri kaydetmesini istiyorum. | Çalışmaya ara verdiğimde sonra devam edebilmek için. |
| US-4 | Öğrenci | Karanlık modu kullanmak istiyorum. | Gece çalışırken gözlerimin yorulmaması için. |
| US-5 | Öğrenci | İnternetim olmasa da çalışabilmek istiyorum. | Metroda veya internetsiz ortamlarda test çözebilmek için. |

## 4. Fonksiyonel Gereksinimler

### 4.1 Ders ve İçerik Yönetimi
*   **FR-1:** Sistem, Anadolu AÖF, ATA-AÖF ve AUZEF üniversitelerini desteklemelidir.
*   **FR-2:** Dersler, bölümlere ve dönemlere göre kategorize edilmelidir.
*   **FR-3:** Her dersin ünite bazlı veya genel deneme sınavları olmalıdır.

### 4.2 Test Modülü (Quiz Player)
*   **FR-4:** Kullanıcı testi başlattığında sorular tek tek ekrana gelmelidir.
*   **FR-5:** Kullanıcı şıkkı seçtiğinde anında doğru/yanlış geri bildirimi verilmelidir.
*   **FR-6:** Varsa soru açıklaması veya kitap notu, cevaplandıktan sonra gösterilmelidir.
*   **FR-7:** Kullanıcı testi bitirmeden çıkarsa ilerlemesi kaydedilmelidir.

### 4.3 Erişilebilirlik
*   **FR-8:** Sistem, Web Speech API kullanarak soruları Türkçe seslendirebilmelidir.
*   **FR-9:** Okuma hızı kullanıcı tarafından ayarlanabilmelidir.

### 4.4 Kişiselleştirme
*   **FR-10:** Kullanıcı temayı (Açık/Koyu/Sepya) değiştirebilmelidir.
*   **FR-11:** Kullanıcı cevap anahtarını gizleyip/gösterebilmelidir.

## 5. Fonksiyonel Olmayan Gereksinimler (NFR)

### 5.1 Performans
*   **NFR-1:** İlk boyama süresi (FCP) 3G ağlarında 1.5 saniyenin altında olmalıdır.
*   **NFR-2:** Lighthouse performans skoru 90+ olmalıdır.

### 5.2 Güvenlik ve Gizlilik
*   **NFR-3:** Kullanıcı verileri (ilerleme, ayarlar) sadece `localStorage` üzerinde tutulmalı, sunucuya gönderilmemelidir.
*   **NFR-4:** Uygulama HTTPS üzerinden sunulmalıdır.

### 5.3 Uyumluluk
*   **NFR-5:** Uygulama PWA (Progressive Web App) standartlarına uygun olmalı ve mobil cihazlara kurulabilmelidir.
*   **NFR-6:** Modern tarayıcıların (Chrome, Safari, Firefox, Edge) son 2 sürümünü desteklemelidir.

## 6. Analitik ve Başarı Metrikleri (KPI)
*   **Kullanıcı Edinimi:** Aylık aktif kullanıcı (MAU) sayısı.
*   **Etkileşim:** Kullanıcı başına çözülen ortalama soru sayısı.
*   **Erişilebilirlik:** Sesli okuma özelliğini kullanan kullanıcı oranı.
*   **Performans:** Ortalama sayfa yükleme süresi.

## 7. Yol Haritası ve Fazlar

### Faz 1: MVP (Tamamlandı)
*   Temel ders ve soru yapısı.
*   Basit test çözme arayüzü.
*   LocalStorage ile ilerleme kaydı.

### Faz 2: Gelişmiş Özellikler (Mevcut)
*   Sesli okuma (TTS).
*   Gelişmiş filtreleme (Yanlışlar, Boşlar).
*   Tema seçenekleri.

### Faz 3: Gelecek Planları
*   **AI Asistanı:** Sorularla ilgili sohbet edebilen bot.
*   **Topluluk:** Soru tartışma alanı (GitHub Discussions entegrasyonu).
*   **Offline Mod:** Tam PWA desteği ile internetsiz kullanım.
