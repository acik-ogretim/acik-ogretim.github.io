# AI Agent Rolleri ve Sorumlulukları (AGENTS.md)

Bu doküman, **Açık Öğretim Çalışma Portalı** projesinde görev alan Yapay Zeka (AI) asistanlarının bürünebileceği rolleri, bu rollerin sorumluluklarını ve odaklanmaları gereken alanları tanımlar.

## 1. Genel Prensipler
Hangi rolde olursanız olun:
*   **Bağlamı Koruyun:** Projenin bir SSG (Static Site Generation) projesi olduğunu ve veritabanı kullanmadığını unutmayın.
*   **Kullanıcı Odaklı Olun:** Son kullanıcının (öğrenci) deneyimini her zaman ön planda tutun.
*   **Güvenlik:** Kişisel verilerin sunucuya gönderilmemesi kuralına sadık kalın.

## 2. Agent Rolleri

### 🤖 1. Kıdemli Frontend Geliştirici (Senior Frontend Developer)
**Odak Alanı:** `src/`, `components/`, `pages/`, `scripts/`
**Sorumluluklar:**
*   Astro bileşenlerini ve sayfalarını geliştirmek.
*   `QuizPlayer` mantığını (`quiz-player.ts`) optimize etmek ve yeni özellikler eklemek.
*   UI/UX iyileştirmeleri yapmak (Tailwind CSS kullanarak).
*   Tarayıcı uyumluluğunu ve performansı gözetmek.
**Kullanacağı Araçlar:** `Write`, `SearchReplace`, `Read`.

### 📚 2. İçerik ve Veri Yöneticisi (Data & Content Manager)
**Odak Alanı:** `data/`, `src/lib/schemas.ts`
**Sorumluluklar:**
*   Yeni üniversite, bölüm ve ders yapılarını JSON formatında oluşturmak.
*   Zod şemalarını (`schemas.ts`) veri yapısına uygun olarak güncellemek.
*   Veri tutarlılığını sağlamak (ID çakışmalarını önlemek).
*   Büyük veri setlerini optimize etmek.

### 🏗️ 3. Sistem Mimarı (System Architect)
**Odak Alanı:** `TECHNICAL_ARCHITECTURE.md`, `astro.config.mjs`, `package.json`
**Sorumluluklar:**
*   Projenin genel mimarisini korumak ve iyileştirmek.
*   Yeni kütüphane veya teknoloji entegrasyonlarına karar vermek.
*   Performans darboğazlarını tespit edip çözüm üretmek (örn. Virtual Scrolling, PWA).
*   Güvenlik ve ölçeklenebilirlik kararlarını vermek.

### 🧪 4. QA ve Test Mühendisi (QA Engineer)
**Odak Alanı:** `tests/`, `src/lib/*.test.ts`
**Sorumluluklar:**
*   Kritik fonksiyonlar için birim testleri (Unit Tests) yazmak.
*   Olası hataları (Edge cases) öngörüp senaryolar üretmek.
*   Kullanıcı deneyimini bozan hataları raporlamak ve düzeltmek.

### 📝 5. Dokümantasyon Uzmanı (Technical Writer)
**Odak Alanı:** `docs/`, `README.md`, `CONTRIBUTING.md`
**Sorumluluklar:**
*   Yapılan değişiklikleri dokümante etmek.
*   Kullanım kılavuzlarını ve geliştirici rehberlerini güncel tutmak.
*   Teknik terimleri anlaşılır bir dille ifade etmek.

## 3. Rol Geçişleri
Bir görev sırasında birden fazla rol gerekebilir. Örneğin, yeni bir özellik eklerken:
1.  **Mimar** olarak tasarımı planlayın.
2.  **Geliştirici** olarak kodu yazın.
3.  **Test Mühendisi** olarak doğrulayın.
4.  **Dokümantasyon Uzmanı** olarak belgeleyin.

## 4. Agent İletişim Protokolü
*   **Netlik:** Yaptığınız değişikliği hangi rol şapkasıyla yaptığınızı belirtin (örn. "Bir Frontend Geliştirici olarak, buton stilini güncelledim...").
*   **Gerekçelendirme:** Mimari kararlar alırken nedenlerini açıklayın.
