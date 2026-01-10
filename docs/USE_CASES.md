# Kullanım Senaryoları (Use Cases)

Bu doküman, **Açık Öğretim Çalışma Portalı**'nın kullanıcı etkileşimlerini, aktörleri ve temel senaryoları tanımlar.

## 1. Aktörler (Actors)

### 1.1 Öğrenci (Student)
*   **Tanım:** Açık öğretim fakültesinde okuyan veya sınavlara hazırlanan son kullanıcı.
*   **Amaç:** Ders materyallerine erişmek, soru çözmek, sınavlara hazırlanmak.

### 1.2 Ziyaretçi (Visitor)
*   **Tanım:** Siteye üye olmayan veya sadece içerikleri inceleyen kullanıcı.
*   **Amaç:** Platform hakkında bilgi almak, örnek dersleri incelemek.

### 1.3 Sistem (System)
*   **Tanım:** Açık Öğretim Çalışma Portalı uygulaması.
*   **Sorumluluk:** İçerikleri sunmak, testleri yönetmek, ilerlemeyi kaydetmek.

## 2. Kullanım Senaryoları (Use Cases)

### UC-01: Ders Seçimi ve Listeleme
*   **Aktör:** Öğrenci
*   **Ön Koşul:** Kullanıcı ana sayfadadır.
*   **Akış:**
    1.  Öğrenci, ana sayfadan üniversitesini seçer (Anadolu AÖF, ATA-AÖF, AUZEF).
    2.  Sistem, seçilen üniversitenin bölümlerini listeler.
    3.  Öğrenci, bölümünü seçer.
    4.  Sistem, o bölüme ait dersleri dönemlerine göre gruplayarak listeler.
    5.  Öğrenci, çalışmak istediği derse tıklar.
*   **Sonuç:** Kullanıcı ders detay sayfasına yönlendirilir.

### UC-02: Test Çözme (Quiz)
*   **Aktör:** Öğrenci
*   **Ön Koşul:** Kullanıcı bir dersin detay sayfasındadır.
*   **Akış:**
    1.  Öğrenci, "Testi Başlat" veya belirli bir üniteyi seçer.
    2.  Sistem, test arayüzünü (Quiz Player) yükler.
    3.  Öğrenci, ekrandaki soruyu okur ve bir şıkkı işaretler.
    4.  Sistem, cevabın doğruluğunu anında kontrol eder:
        *   **Doğruysa:** Yeşil renk ile onaylar, başarı sayacını artırır.
        *   **Yanlışsa:** Kırmızı renk ile uyarır, doğru cevabı gösterir.
    5.  Sistem, varsa soruyla ilgili açıklamayı veya kitap notunu gösterir.
    6.  Öğrenci "Sonraki Soru" butonuna tıklar.
*   **Alternatif Akış (Sesli Okuma):**
    *   3. adımda öğrenci "Sesli Oku" butonuna basar. Sistem soruyu ve şıkkı sesli okur.

### UC-03: İlerleme Takibi ve İstatistikler
*   **Aktör:** Öğrenci
*   **Ön Koşul:** Kullanıcı en az bir test çözmüştür.
*   **Akış:**
    1.  Sistem, çözülen her soruyu ve sonucunu tarayıcı hafızasına (LocalStorage) kaydeder.
    2.  Öğrenci ders sayfasına girdiğinde, sistem o ders için tamamlanma oranını (%) gösterir.
    3.  Test ekranında, toplam doğru/yanlış sayısı ve başarı yüzdesi anlık olarak güncellenir.

### UC-04: Ayarları Kişiselleştirme
*   **Aktör:** Öğrenci
*   **Akış:**
    1.  Öğrenci, ayarlar menüsünü açar.
    2.  Tercihine göre aşağıdaki ayarları değiştirir:
        *   Karanlık Mod / Aydınlık Mod
        *   Cevapları Gizle / Göster
        *   Sesli Okuma Hızı
    3.  Sistem, tercihleri kaydeder ve arayüzü anında günceller.

### UC-05: Hata Bildirimi
*   **Aktör:** Öğrenci
*   **Akış:**
    1.  Öğrenci, hatalı olduğunu düşündüğü bir soruyla karşılaşır.
    2.  "Hata Bildir" butonuna (veya GitHub linkine) tıklar.
    3.  Sistem, kullanıcıyı GitHub Issues sayfasına yönlendirir (ilgili şablon ile).
    4.  Öğrenci hatayı tanımlar ve gönderir.

## 3. Kullanıcı Hikayeleri (User Stories)

*   **US-1:** Bir öğrenci olarak, sınav öncesi hızlı tekrar yapabilmek için sadece yanlış yaptığım soruları tekrar çözmek istiyorum.
*   **US-2:** Görme problemi yaşayan bir kullanıcı olarak, soruları okumakta zorlandığım için sistemin bana soruları sesli okumasını istiyorum.
*   **US-3:** Bir öğrenci olarak, internet bağlantım kopsa bile daha önce yüklediğim sayfalarda test çözmeye devam edebilmek istiyorum (PWA/Offline desteği - *Gelecek Özellik*).
*   **US-4:** Bir öğrenci olarak, hangi derslerde ne kadar ilerlediğimi görerek çalışma planımı ona göre yapmak istiyorum.
