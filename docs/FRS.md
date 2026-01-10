# Fonksiyonel Gereksinimler Spesifikasyonu (FRS)

## 1. Giriş
Bu doküman, sistemin her bir fonksiyonunun girdilerini, işlemlerini ve çıktılarını en ince detayına kadar tanımlar.

## 2. Fonksiyon Listesi

### F-01: Testi Başlatma ve Filtreleme
*   **Girdi:** Kullanıcı "Ders Detay" sayfasında bir üniteye veya "Tümünü Çöz" butonuna tıklar.
*   **İşlem:**
    1.  URL parametreleri veya kayıtlı ayarlar (`localStorage`) okunur.
    2.  **Ünite Filtresi:** "İlk Yarı", "İkinci Yarı" veya belirli bir ünite seçildiyse sorular buna göre elenir.
    3.  **Durum Filtresi:** "Yanlışlar" veya "Boşlar" seçildiyse, `quiz-progress-[slug]` verisine bakılarak filtreleme yapılır.
    4.  **Karıştırma:** `shuffleQuestions` aktifse Fisher-Yates algoritması uygulanır.
    5.  DOM'daki ilgili soru elementleri (`display: block/none`) güncellenir.
*   **Çıktı:** Test ekranı filtrelenmiş sorularla açılır.

### F-02: Cevap Verme (Normal Mod)
*   **Girdi:** Kullanıcı bir şıkkın üzerine tıklar.
*   **İşlem:**
    1.  Tıklanan şıkkın `data-key` değeri ile sorunun `correctAnswer` değeri karşılaştırılır.
    2.  **Doğruysa:** `corrects` sayacı artar, şık yeşil olur, "Doğru!" sesli bildirimi (TTS açıksa) verilir.
    3.  **Yanlışsa:** `wrongs` sayacı artar, şık kırmızı olur, doğru şık yeşil olur, "Yanlış! Doğru cevap..." sesli bildirimi verilir.
    4.  Sonuç `localStorage`'a kaydedilir (son 2 deneme tutulur).
    5.  Açıklama alanı (`explanation-box`) görünür hale gelir.
*   **Çıktı:** Görsel ve işitsel geri bildirim, güncellenmiş istatistikler.

### F-03: İnteraktif Mod (Interactive Mode)
*   **Girdi:** Kullanıcı "Çöz" (İnteraktif Mod) butonuna tıklar.
*   **İşlem:**
    1.  Tüm cevaplar ve açıklamalar gizlenir (`hide-answers`, `hide-explanations` sınıfları eklenir).
    2.  İstatistikler sıfırlanır.
    3.  Kullanıcı cevap verdiğinde otomatik olarak bir sonraki soruya geçiş için zamanlayıcı (Timer) başlatılır (Doğruysa 0.5sn, Yanlışsa 5sn).
*   **Çıktı:** Odaklanmış, sınav simülasyonu modu.

### F-04: Sesli Okuma (TTS) ve Kuyruk Yönetimi
*   **Girdi:** Kullanıcı "Soruyu Oku" butonuna tıklar.
*   **İşlem:**
    1.  Mevcut okuma iptal edilir.
    2.  Metin parçalara (Chunking) ayrılır:
        *   Chunk 1: "Soru X. [Soru Metni]"
        *   Chunk 2: "Seçenekler: A şıkkı [Metin]..." (Yanlış şıklar gizliyse atlanır)
        *   Chunk 3: "Doğru Cevap [Cevap]" ve "Açıklama [Metin]" (İnteraktif modda değilse)
    3.  Her parça sırayla `speechQueue` dizisine eklenir ve işlenir.
    4.  Tarayıcı hatası (`interrupted`) durumunda otomatik tekrar denenir (Retry Logic).
*   **Çıktı:** Kesintisiz ve akıcı sesli okuma.

### F-05: Ayarları Kaydetme
*   **Girdi:** Kullanıcı ayarlar menüsünden bir değişiklik yapar (örn. "Yanlış Şıkları Gizle").
*   **İşlem:**
    1.  `quiz-settings` objesi güncellenir.
    2.  `localStorage`'a yazılır.
    3.  `applyFilters()` fonksiyonu tetiklenerek arayüz anında güncellenir.
*   **Çıktı:** Arayüz değişikliği ve kalıcı ayar saklama.
