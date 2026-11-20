# Açık Öğretim Çalışma Portalı

**Anadolu Üniversitesi, Atatürk Üniversitesi ve İstanbul Üniversitesi açık öğretim öğrencileri için geliştirilmiş ücretsiz, açık kaynaklı ve modern çalışma platformu.**

Bu proje, öğrencilerin ders kaynaklarına ve geçmiş yıl sorularına kolayca erişmesini sağlamak, interaktif testlerle sınavlara hazırlanmalarına yardımcı olmak amacıyla geliştirilmiştir.

**Canlı Demo:** [acik-ogretim.github.io](https://acik-ogretim.github.io)

---

## Özellikler

- **Geniş Kapsam:** 4 açık ve uzaktan öğretim fakültesinin (Anadolu AÖF, ATA-AÖF, AUZEF, ANKUZEF) derslerini kapsar.
- **Konu eşleşmesi:** Kitap konu ağacı bulunan derslerde her soru, kitaptaki ünite ve konu başlığıyla (ör. "4.2.2 ...") soru kartında gösterilir; sohbet asistanı da aynı ağaçtan konu anlatır.
- **Açıklamalar:** Atatürk AÖF sorularında resmî cevap anahtarı kullanılır; zayıf açıklamalar ders kitabındaki konuya dayanılarak yapay zekâ yardımıyla yeniden yazılmıştır.
- **İnteraktif Test Modülü:** Soruları çözerken anında geri bildirim alabileceğiniz gelişmiş test arayüzü.
  - Doğru/Yanlış analizi
  - Ders asistanı: kendi API anahtarınla (Gemini, OpenAI, Anthropic, OpenRouter) dersin soruları, açıklamaları, ünite özetleri ve ders kitabının konu ağacı üzerinden sohbet; konu anlatımı, zayıf konular, mini sınav, indirilebilir çalışma belgesi, sohbet geçmişi, sesle yazma ve canlı sesli konuşma
  - Açıklama menüsü: açıklamayı kısalt, genişlet, şıkları açıkla, hafıza ipucu
  - Sesli okuma desteği (TTS)
  - Koyu Mod / Aydınlık Mod / Sepya Modu seçenekleri
- **Kişiselleştirme:** Favori derslerinizi kaydedin ve ilerlemenizi takip edin (kayıtlar tarayıcınızda durur).
- **Kayıtları taşıma (/yedek):** Kendi kişisel deponuz (remoteStorage; anahtarlar tanımlıysa Google Drive ve Dropbox seçenekleriyle), Google Drive'ınızdaki gizli uygulama klasörü, şifreli GitHub gist'i, cihazdan cihaza bağlantı (WebRTC, parola ile), yedek dosyası (indir, yükle, "Yakındaki cihaza gönder"). Hiçbirinde kayıtlar siteye gelmez; yapay zekâ anahtarları yedeğe girmez.
- **Hata bildirme ve tartışma:** Soru kartındaki konuşma simgesi "Soru hatalı", "Açıklama hatalı" ve "Açıklamamı paylaş" seçeneklerini, ders sayfasındaki bayrak simgesi "Ders hatalı/eksik" ve "Bölüm hatalı/eksik" seçeneklerini açar. Bildirim, önceden doldurulmuş bir GitHub issue formuna; tartışma GitHub Discussions'a (giscus) gider.
- **Mobil:** Alt çubuk açıkken arama düğmesi çubuğun içindedir; iPhone güvenli alanı hesaba katılır.
- **Yeni kimlik ve sayfalar:** Yeni logo ve favicon (`public/logo.svg`), Kullanım Koşulları, Gizlilik ve Kullanım Rehberi sayfaları.
- **Hafif ve Hızlı:** [Astro](https://astro.build) ve statik site mimarisi sayesinde ultra hızlı sayfa yüklemeleri.

## Desteklenen Üniversiteler

| Üniversite | Kısaltma | Durum | Kapsam |
|---|---|---|---|
| Anadolu Üniversitesi | **Anadolu AÖF** | Aktif | Bölüm ve ders sayıları ana sayfada güncel gösterilir |
| Atatürk Üniversitesi | **ATA-AÖF** | Aktif | Bölüm ve ders sayıları ana sayfada güncel gösterilir |
| İstanbul Üniversitesi | **AUZEF** | Aktif | Bölüm ve ders sayıları ana sayfada güncel gösterilir |
| Ankara Üniversitesi | **Ankara (ANKUZEF)** | Aktif | Bölüm ve ders sayıları ana sayfada güncel gösterilir |

## Teknolojiler

Bu proje aşağıdaki modern web teknolojileri kullanılarak geliştirilmiştir:

- **Framework:** [Astro v5](https://astro.build)
- **Stil:** [Tailwind CSS](https://tailwindcss.com)
- **Dil:** TypeScript
- **İkonlar:** [Lucide](https://lucide.dev)
- **Yapay zekâ:** [TanStack AI](https://tanstack.com/ai) (tarayıcıda, kullanıcının kendi anahtarıyla), [Base UI](https://base-ui.com) çekmece ve iletişim kutuları
- **Dağıtım:** GitHub Pages
- **Tartışma:** [giscus](https://giscus.app) (GitHub Discussions)
- **Ziyaret sayacı:** Cloudflare Web Analytics ve `workers/sayac/` altındaki Cloudflare Worker (D1)

## Mimari Özeti

Site statik üretilir (Astro SSG); sunucu tarafı kod ve veritabanı yoktur. Soru ve ders verisi `data/` altındaki JSON dosyalarından derleme sırasında sayfalara dönüşür. Tarayıcıda çalışan parçalar:

- **Sohbet asistanı** (`src/pages/sohbet.astro`, `src/components/sohbet/`, `src/lib/chat/`): kullanıcının kendi anahtarıyla (BYOK) doğrudan sağlayıcıya bağlanır; araçları `src/lib/chat/tools.ts` içindedir (ders bulma, soru arama, ünite özeti, konu anlatımı, ilerleme, belge oluşturma, mini sınav). Sohbet geçmişi `localStorage`'da tutulur.
- **Kayıt eşitleme** (`src/pages/yedek.astro`, `src/lib/yedek.ts`, `rs-esitle.ts`, `google-esitle.ts`, `p2p-esitle.ts`, `bulut-esitle.ts`): tarayıcı kayıtlarını kullanıcının kendi deposuyla birleştirir.
- **Tartışma ve hata bildirimi** (`src/components/Tartisma.astro`): giscus penceresi ve önceden doldurulmuş GitHub issue formu.
- **Ziyaret sayacı** (`workers/sayac/`): çerezsiz, günlük değişen özet değerle tekil ziyaretçi sayar.

## Dokümantasyon

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

## Katkıda Bulunma

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

## Gizlilik ve Yasal

- **Gizlilik:** Bu proje kullanıcılarından **hiçbir kişisel veri** toplamaz. İlerlemeleriniz sadece kendi cihazınızda (tarayıcı) saklanır. Ziyaret sayıları çerezsizdir: Cloudflare Web Analytics ve kendi anonim tekil ziyaretçi sayacımız (günlük değişen geri çevrilemez özet değer, yalnız toplam sayılar) kullanılır.
- **Kullanım koşulları:** [Kullanım Koşulları](https://acik-ogretim.github.io/kullanim-kosullari) sayfasında.
- **Ders asistanı:** İsteğe bağlıdır ve kendi API anahtarınızla çalışır:
  - Anahtarınız yalnızca tarayıcınızda (`localStorage`) saklanır; sitenin sunucusu yoktur.
  - Mesajlarınız ve ilgili ders içeriği tarayıcınızdan doğrudan seçtiğiniz sağlayıcıya gönderilir ve o sağlayıcının gizlilik politikasına tabidir.
- **Kayıt eşitleme:** İsteğe bağlıdır; kayıtlar kullanıcının kendi deposuna, kendi Google Drive uygulama klasörüne, kendi GitHub hesabına (parolayla şifreli) ya da doğrudan öteki cihazına gider. Site bunları göremez.
- Detaylar için [Gizlilik Politikası](https://acik-ogretim.github.io/gizlilik).

### Eşitleme için isteğe bağlı ayarlar (depo değişkenleri)

- `GOOGLE_CLIENT_ID`: Google ile eşitleme ve remoteStorage kutusunda Google Drive seçeneği. Google Cloud Console'da Web uygulaması türünde OAuth istemci kimliği; kapsam `drive.appdata`, yetkili kaynak `https://acik-ogretim.github.io`. Boşsa bu seçenek gizlenir.
- `DROPBOX_APP_KEY`: remoteStorage kutusunda Dropbox seçeneği. Boşsa gizlenir.
- **Telif Hakkı:** İçerikler eğitim amaçlıdır. Telif hakkı ihlali bildirimleri (DMCA) için GitHub Issues üzerinden bizimle iletişime geçebilirsiniz. Detaylar için [Telif Hakkı Politikası](https://acik-ogretim.github.io/telif).

## Yerel Geliştirme (Local Development)

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

## Lisans

Bu proje **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** ile lisanslanmıştır.

**Ticari Kullanım Yasaktır:** Bu projeyi, kodlarını veya içeriklerini ticari bir amaçla kullanamaz, satamaz veya ticari bir hizmetin parçası yapamazsınız.

**Eğitim Amaçlı Paylaşım Serbesttir:** Kaynak göstermek ve aynı lisansla paylaşmak şartıyla projeyi geliştirebilir, değiştirebilir ve eğitim amaçlı kullanabilirsiniz.

Detaylı bilgi için [Lisans Dosyası](LICENSE) veya [Özet Metni](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.tr) inceleyebilirsiniz.

---
*Bu proje eğitim amaçlıdır ve kar amacı gütmez.*
