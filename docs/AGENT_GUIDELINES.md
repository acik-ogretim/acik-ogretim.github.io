# Agent ve Geliştirici Kılavuzu (Agent Guidelines)

Bu doküman, projede çalışan **Yapay Zeka Asistanları (AI Agents)** ve geliştiriciler için özel talimatlar, bağlam bilgileri ve çalışma kurallarını içerir.

## 1. Proje Bağlamı ve Kimlik
*   **Proje Adı:** Açık Öğretim Çalışma Portalı
*   **Amaç:** Açık öğretim öğrencileri için ücretsiz, erişilebilir ve modern bir çalışma platformu sağlamak.
*   **Teknoloji:** Astro v5, TypeScript, Tailwind CSS, LocalStorage.
*   **Veri Kaynağı:** JSON dosyaları (Veritabanı yok).

## 2. Agent Davranış Kuralları

### 2.1 Kod Üretimi
*   **Mevcut Yapıyı Koru:** Yeni bir dosya oluşturmadan önce, benzer işlevi gören mevcut dosyaları incele ve aynı yapıyı kullan.
*   **Tip Güvenliği:** Her zaman TypeScript kullan. `any` tipinden kaçın. Zod şemalarına (`src/lib/schemas.ts`) sadık kal.
*   **Bileşenler:** Astro bileşenleri (`.astro`) önceliklidir. Etkileşim gerektiren yerlerde `.tsx` (React/Preact) veya Vanilla JS (`<script>` tag içinde) kullan.
*   **Stil:** Sadece Tailwind CSS sınıfları kullan. `style` etiketi içinde CSS yazmaktan kaçın.

### 2.2 Dosya İşlemleri
*   **Okuma:** Bir dosyayı değiştirmeden önce mutlaka içeriğini oku (`Read` tool).
*   **Yazma:** Dosya değişikliklerini yaparken, dosyanın tamamını yeniden yazmak yerine sadece gerekli kısımları değiştirmeye çalış (mümkünse).
*   **Konum:** Yeni dosyaları doğru klasörlere yerleştir:
    *   Sayfalar -> `src/pages/`
    *   Bileşenler -> `src/components/`
    *   Veri -> `data/`

### 2.3 Hata Yönetimi ve Debugging
*   Bir hata ile karşılaştığında, önce hatanın kaynağını anlamak için logları incele veya `console.log` ekle.
*   Körü körüne kod değişikliği yapma. Önce analiz et, sonra planla, en son uygula.

## 3. Kritik Dosyalar ve Görevleri

| Dosya Yolu | Açıklama |
|---|---|
| `src/lib/schemas.ts` | Veri modellerinin (Ders, Soru, Bölüm) tanımlandığı yer. |
| `src/scripts/quiz-player.ts` | Test çözme motorunun ana mantığı. |
| `src/pages/[university]/...` | Dinamik sayfa rotaları. |
| `data/` | Tüm ders ve soru içerikleri. |

## 4. Sık Karşılaşılan Senaryolar

### Senaryo: Yeni Bir Üniversite Ekleme
1.  `data/courses/` altında yeni üniversite klasörü oluştur.
2.  `src/lib/schemas.ts` içindeki `UniversityEnum` veya ilgili tipleri güncelle (gerekirse).
3.  `data/courses/[yeni-uni]/` altına bölüm JSON dosyalarını ekle.

### Senaryo: Test Motoruna Özellik Ekleme
1.  `src/scripts/quiz-player.ts` dosyasını incele.
2.  `QuizPlayer` sınıfına yeni metodu ekle.
3.  `src/components/QuizPlayer.astro` içindeki HTML yapısını güncelle.
4.  `src/lib/types.ts` içindeki arayüzleri güncelle.

## 5. İletişim Dili
*   Kullanıcı ile Türkçe iletişim kur.
*   Teknik terimleri (Commit, Push, Branch, Request) olduğu gibi veya yaygın Türkçe karşılıklarıyla kullan.
*   Nazik, yardımsever ve çözüm odaklı ol.
