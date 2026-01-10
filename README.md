# 🎓 Açık Öğretim Çalışma Portalı

**Anadolu Üniversitesi, Atatürk Üniversitesi ve İstanbul Üniversitesi açık öğretim öğrencileri için geliştirilmiş ücretsiz, açık kaynaklı ve modern çalışma platformu.**

Bu proje, öğrencilerin ders kaynaklarına ve geçmiş yıl sorularına kolayca erişmesini sağlamak, interaktif testlerle sınavlara hazırlanmalarına yardımcı olmak amacıyla geliştirilmiştir.

🔗 **Canlı Demo:** [acik-ogretim.github.io](https://acik-ogretim.github.io)

---

## 🚀 Özellikler

- **Geniş Kapsam:** 3 büyük açık öğretim fakültesinin (Anadolu AÖF, ATA-AÖF, AUZEF) derslerini kapsar.
- **İnteraktif Test Modülü:** Soruları çözerken anında geri bildirim alabileceğiniz gelişmiş test arayüzü.
  - ✅ Doğru/Yanlış analizi
  - 🤖 **Gemini AI** destekli soru açıklamaları
  - 🗣️ Sesli okuma desteği (TTS)
  - 🌙 Koyu Mod / Aydınlık Mod / Sepya Modu seçenekleri
- **Kişiselleştirme:** Favori derslerinizi kaydedin ve ilerlemenizi takip edin (Local Storage ile %100 gizlilik).
- **Hafif ve Hızlı:** [Astro](https://astro.build) ve statik site mimarisi sayesinde ultra hızlı sayfa yüklemeleri.

## 🏫 Desteklenen Üniversiteler

| Üniversite | Kısaltma | Durum | Kapsam |
|---|---|---|---|
| Anadolu Üniversitesi | **Anadolu AÖF** | ✅ Aktif | ⚠️ Tek Bölüm (Görsel İletişim) |
| Atatürk Üniversitesi | **ATA-AÖF** | ✅ Aktif | 🌍 **Tüm Bölümler** |
| İstanbul Üniversitesi | **AUZEF** | ✅ Aktif | ⚠️ Tek Bölüm (Çocuk Gelişimi) |

## 🛠️ Teknolojiler

Bu proje aşağıdaki modern web teknolojileri kullanılarak geliştirilmiştir:

- **Framework:** [Astro v5](https://astro.build)
- **Stil:** [Tailwind CSS](https://tailwindcss.com)
- **Dil:** TypeScript
- **İkonlar:** Google Fonts, Custom SVGs
- **Dağıtım:** GitHub Pages

## 📚 Dokümantasyon

Proje hakkında daha detaylı bilgi için `docs/` klasöründeki dokümanları inceleyebilirsiniz:

- **[Ürün Gereksinim Dokümanı (PRD)](docs/PRD.md):** Ürün vizyonu, gereksinimler ve başarı kriterleri.
- **[Ürün Vizyon Dokümanı (PVD)](docs/PVD.md):** Projenin uzun vadeli vizyonu ve temel değerleri.
- **[İş Gereksinimleri Dokümanı (BRD)](docs/BRD.md):** İş hedefleri, paydaşlar ve kısıtlamalar.
- **[Pazar Gereksinimleri Dokümanı (MRD)](docs/MRD.md):** Hedef pazar, rakipler ve fırsatlar.
- **[Yazılım Gereksinimleri Spesifikasyonu (SRS)](docs/SRS.md):** Sistem arayüzleri ve detaylı teknik gereksinimler.
- **[Fonksiyonel Gereksinimler Spesifikasyonu (FRS)](docs/FRS.md):** Fonksiyon bazlı girdi/işlem/çıktı tanımları.
- **[Ürün Spesifikasyon Dokümanı (PSD)](docs/PRODUCT_SPEC.md):** Projenin amacı, özellikleri ve yol haritası.
- **[Teknik Mimari Dokümanı (TAD)](docs/TECHNICAL_ARCHITECTURE.md):** Projenin teknik yapısı, veri modelleri ve bileşenleri.
- **[Proje Standartları](docs/PROJECT_STANDARDS.md):** Kodlama standartları, git akışı ve proje yapısı.
- **[Kullanım Senaryoları (Use Cases)](docs/USE_CASES.md):** Kullanıcı hikayeleri ve senaryolar.
- **[Sistem Analizi](docs/SYSTEM_ANALYSIS.md):** Sistem gereksinimleri, performans ve kısıtlamalar.
- **[Agent Rehberi](docs/AGENT_GUIDELINES.md):** AI asistanları ve geliştiriciler için kurallar.
- **[Agent Rolleri](docs/AGENT_ROLES.md):** Projede görev alan AI asistanlarının rolleri ve sorumlulukları.
- **[Katkıda Bulunma Rehberi](CONTRIBUTING.md):** Projeye nasıl katkı sağlayabileceğiniz hakkında detaylı bilgi.

## 🤝 Katkıda Bulunma

Bu portal tamamen açık kaynaklıdır ve topluluk katkılarıyla büyümektedir. Katkıda bulunmak için:

1. **Hata Bildirimi & İstek:**
    - Hatalı soru bildirmek, yeni bir ders/bölüm talep etmek veya teknik bir sorun için [Issues](https://github.com/acik-ogretim/acik-ogretim.github.io/issues) sayfasını kullanın.
    - Sizin için hazırladığımız hazır şablonları (Bölüm İsteği, Hata Bildirimi, vb.) kullanarak süreci hızlandırabilirsiniz.

2. **Geliştirme:**
    - Projeyi fork'layın.
    - Kendi branch'inizi oluşturun (`git checkout -b ozellik/yeni-ozellik`).
    - Değişikliklerinizi yapın ve commit'leyin.
    - Bir **Pull Request (PR)** açın.

### Veri Yapısı

Site içeriği (`data/` klasörü) JSON dosyalarından oluşur. İstatistikler ve ders içerikleri build aşamasında bu dosyalardan otomatik olarak oluşturulur.

## 🛡️ Gizlilik ve Yasal

- **Gizlilik:** Bu proje kullanıcılarından **hiçbir kişisel veri** toplamaz. İlerlemeleriniz sadece kendi cihazınızda (tarayıcı) saklanır. Detaylar için [Gizlilik Politikası](https://acik-ogretim.github.io/gizlilik).
- **Telif Hakkı:** İçerikler eğitim amaçlıdır. Telif hakkı ihlali bildirimleri (DMCA) için GitHub Issues üzerinden bizimle iletişime geçebilirsiniz. Detaylar için [Telif Hakkı Politikası](https://acik-ogretim.github.io/telif).

## 💻 Yerel Geliştirme (Local Development)

Projeyi kendi bilgisayarınızda çalıştırmak için:

```bash
# Projeyi klonlayın
git clone https://github.com/acik-ogretim/acik-ogretim.github.io.git

# Klasöre girin
cd acik-ogretim.github.io

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:4321` adresine giderek önizleme yapabilirsiniz.

## 📄 Lisans

Bu proje **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** ile lisanslanmıştır.

❌ **Ticari Kullanım Yasaktır:** Bu projeyi, kodlarını veya içeriklerini ticari bir amaçla kullanamaz, satamaz veya ticari bir hizmetin parçası yapamazsınız.

✅ **Eğitim Amaçlı Paylaşım Serbesttir:** Kaynak göstermek ve aynı lisansla paylaşmak şartıyla projeyi geliştirebilir, değiştirebilir ve eğitim amaçlı kullanabilirsiniz.

Detaylı bilgi için [Lisans Dosyası](LICENSE) veya [Özet Metni](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.tr) inceleyebilirsiniz.

---
*Bu proje eğitim amaçlıdır ve kar amacı gütmez.*
