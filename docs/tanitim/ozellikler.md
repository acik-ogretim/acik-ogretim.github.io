# Açık Öğretim Portalı: özellik envanteri

Canlı adres: https://acik-ogretim.github.io/ · Bu liste depodaki sayfa, bileşen, betik ve belgelerden çıkarıldı; her maddede özelliğin işlevi, sayfası, kod yolu ve (varsa) ekran görüntüsü yer alır. Görüntüler `docs/tanitim/ekranlar/` altındadır (`<ad>-mobil.jpg`, `<ad>-masaustu.jpg`) ve `docs/tanitim/ekran-al.mjs` ile yeniden alınır.

## Gezinme ve keşif

**1. Üniversite, bölüm ve ders gezgini**: Dört fakültenin (Anadolu AÖF, ATA-AÖF, AUZEF, Ankara AÖF) bölümlerini ve dönem dönem ders listelerini gösterir; bölüm ve ders araması, yıldızla favori ekleme vardır. Sayfalar: `/`, `/<üniversite>/`, `/<üniversite>/<bölüm>/`. Kod: `src/pages/index.astro`, `src/pages/[university].astro`, `src/pages/[university]/[department].astro`, veri `data/universities.json`, `data/courses/`, sayılar `src/lib/ders-sayilari.ts`. Görüntü: `anasayfa`, `universite-bolumler`, `bolum-dersler`.

**2. Site geneli arama**: Ders ve bölüm adlarında arar, sonuçları "Dersler" ve "Bölümler" sekmelerinde listeler; Ctrl K ile açılır. Soru metni araması ders sayfasının içindedir. Sayfa: `/ara/`. Kod: `src/pages/ara.astro`, `src/lib/search.ts`. Görüntü: `arama`.

**3. Derslerim**: Yıldızlanan ders ve bölümler, ders başına çözülen soru sayısı, doğru oranı çubuğu ve "kaldığın yer". Kayıtlar tarayıcıda durur. Sayfa: `/derslerim/`. Kod: `src/pages/derslerim.astro`, `src/lib/calisma-durumu.ts`.

## Soru bankası ve çözme

**4. Soru bankası ve ders sayfası**: Dersin bütün soruları ünite sırasıyla tek akışta; her soruda sınav künyesi (yıl, tür), kitaptaki konu başlığı, şıklar, doğru cevap ve açıklama. Ders başlığında soru sayısı, yıl aralığı ve Materyaller, Konular, Ders anlatımı, Video özeti, Çevrimdışı için indir, Derse sor, Tartış, Yazdır kısayolları. Kod: `src/pages/[university]/[department]/[course].astro`, `src/scripts/soru-yukleyici.ts`, `src/lib/soru-karti.ts`, veri `data/questions/`. Görüntü: `ders-sayfasi`, `soru-bankasi`.

**5. Okuma ve Çözme kipi**: Okuma kipinde cevap ve açıklama açık görünür; Çözme kipinde şık seçilince anında doğru ya da yanlış geri bildirimi, açıklama ve canlı doğru-yanlış sayacı gelir. Kod: `src/components/QuizPlayer.astro`, `src/scripts/quiz-player.ts`. Görüntü: `cozme-kipi`.

**6. Süzgeç ve sıralama**: Kitap sırası, en çok sorulan, en yeni ya da en eski sınav, yanlışlarım ve çözmediklerim önce gibi sıralamalar; yanlışlarım ya da cevaplanmamış soru türü ve sınav dönemine göre süzme; seçime uyan soru sayısı canlı önizlenir. Kod: `src/components/Suzgec.tsx`, `src/lib/suzgec.ts`, `src/lib/soru-siralama.ts`. Görüntü: `suzgec`.

**7. Sesli okuma**: Soruyu ve açıklamayı sesli okur, okuma hızı ve ses seçilebilir, otomatik ilerleme vardır; alt oynatıcı çubuğundan yönetilir. Kod: `src/components/QuizPlayer.astro`, `src/scripts/quiz-player.ts`, `src/scripts/konu-okuma.ts`. Görüntü: `soru-bankasi` ve `ayarlar-penceresi` (ses bölümü).

**8. Açıklama menüsü (yapay zekâ)**: Açıklamayı tekrar oluşturma, daha ayrıntılı anlatma, özetleme, hafıza ipucu, şıkları açıklama, örnekle anlatma ve "Sohbette sor" işlemleri; kullanıcının kendi anahtarıyla çalışır. Kod: `src/components/AIMenu.astro`, `src/lib/chat/enrich.ts`, `src/components/AISettings.astro`.

**9. Tam menü ve alt çubuk**: Tüm ders işlevlerinin tek menüde toplandığı, "Düzenle" ile alt çubuğu kullanıcının kendi sıralamasına göre kurduğu menü; klavye kısayolları gösterilir. Kod: `src/components/MobilMenu.tsx`. Görüntü: `tam-menu`.

**10. İçindekiler**: Ünite ve konu ağacı, ünite başına soru sayısı; üniteye geçiş. Kod: `src/components/Icindekiler.tsx`, `src/lib/unite-basligi.ts`. Görüntü: `icindekiler`.

**11. Konu anlatımı çekmecesi**: Soruya bağlı kitap konusu metninin çekmecede açılması, önceki ve sonraki konu, kitap sayfası numarası, konuyu sesli okuma. Konu metni derleme sırasında parçalanır. Kod: `src/components/KonuCekmece.astro`, `src/scripts/konu-cekmece.ts`, `scripts/konu-parcala.mjs`, tasarım notu `docs/konu-anlatimi.md`. Not: ders sayfasındaki "Konular" düğmesi canlı sitede çekmeceyi açmadı (aşağıdaki "Gözlemler" bölümüne bak); bu nedenle konu anlatımı çalışma odası görüntüleriyle gösterilir.

## Ders anlatımı (çalışma odası)

**12. Ders anlatımı dizini**: Çalışma odası olan derslerin üniversiteye göre gruplanmış kartları; kartta video ve konu sayısı. Sayfa: `/calisma/`. Kod: `src/pages/calisma/index.astro`. Görüntü: `calisma-dizini`.

**13. Çalışma odası**: Bir dersin özet videosu, zaman kodlu dökümü ve konu anlatımı yan yana. Sekmeler: Konu konu, Döküm, Konular, Sınav, Vurgular. "Şu an" bölümü ve "Şu anki konuyu izle" düğmesi videodaki konuyu metne bağlar; video ve ses kapatılıp yalnız metin okunabilir. Sayfa: `/<üniversite>/<bölüm>/<ders>/calisma/`. Kod: `src/pages/[university]/[department]/[course]/calisma.astro`, `src/scripts/calisma-odasi.ts`, `src/lib/calisma-odasi/`, veri `src/data/calisma-odasi/` (32 ders paketi). Görüntü: `calisma-odasi`, `calisma-dokum`, `calisma-konular`.

**14. Kavram balonları**: Konu metninde altı çizili kavrama basınca tanım, yıldızlama ve "Konuya git" bağlantısı. Kod: `src/lib/calisma-odasi/kavram.ts`, `src/scripts/calisma-odasi.ts`. Görüntü: `calisma-kavram`.

**15. Çıkmış sorularla sınav sekmesi**: Çalışma odasında üniteye göre çıkmış sorular, şık seçince doğru-yanlış, açıklama ve "Kitapta bu paragraf"; konu başına "Kendini dene" mini testi. Kod: `src/scripts/calisma-odasi.ts`, `src/scripts/konu-calisma.ts`. Görüntü: `calisma-sinav`.

**16. Vurgu ve not**: Seçili metni vurgulama, not ekleme ve kopyalama araç çubuğu; Vurgular sekmesinde toplanır; yıldızlı kavramlar. Kod: `src/lib/calisma-odasi/vurgu.ts`, `yildiz.ts`, `src/scripts/calisma-odasi.ts` (`co-arac`).

## Yapay zekâ

**17. Ders asistanı (sohbet)**: Kullanıcının kendi anahtarıyla (Gemini, OpenAI, Anthropic, OpenRouter) dersin soruları, açıklamaları, ünite özetleri ve kitap konu ağacı üzerinden sohbet; konu anlatımı, zayıf konular, mini sınav kartı, indirilebilir çalışma belgesi, sohbet geçmişi, sesle yazma ve canlı sesli konuşma. Anahtar tarayıcıda kalır, siteye gelmez. Sayfa: `/sohbet/`. Kod: `src/pages/sohbet.astro`, `src/components/sohbet/`, `src/lib/chat/`, `src/lib/ajan-araclari.ts`. Görüntü: `sohbet-asistani` (anahtar girilmeden önceki karşılama).

**18. Ajanlar için okunabilirlik**: `llms.txt`, ders başına Markdown özeti (`ozet.md`) ve tarayıcı yapay zekâ araçlarına açılan WebMCP kaydı. Kod: `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/pages/[university]/[department]/[course]/ozet.md.ts`, `src/lib/webmcp.ts`.

## Kişiselleştirme ve kayıt

**19. Ayarlar ve temalar**: Açık, Koyu, Sepya tema; dört vurgu rengi; yazı boyutu; ses ve hız; cevap ve açıklama gizleme, otomatik ilerleme. Sayfa: `/ayarlar/` ve ders içi pencere. Kod: `src/pages/ayarlar.astro`, `src/components/AyarlarIcerik.astro`, `src/layouts/Layout.astro`. Görüntü: `ayarlar-penceresi`, `ayarlar-sayfasi`, `tema-aydinlik`, `tema-sepya`.

**20. İlerleme**: Çözülen soru, son denemede doğru oranı, üst üste iki kez doğru ve tekrar gereken sayıları; ders başına çubuk; yıldızlı kavramlar. Kayıtlar yalnız bu cihazdan hesaplanır. Sayfa: `/ilerleme/`. Kod: `src/pages/ilerleme.astro`, `src/lib/ilerleme.ts`.

**21. Kayıtları taşıma ve eşitleme**: Kendi remoteStorage deposu, Google Drive'daki gizli uygulama klasörü, şifreli GitHub gist'i, cihazdan cihaza bağlantı (parola ile), yedek dosyası indirme ve yükleme. Kayıtlar siteye gelmez; yapay zekâ anahtarları yedeğe girmez. Sayfa: `/yedek/`. Kod: `src/pages/yedek.astro`, `src/lib/yedek.ts`, `google-esitle.ts`, `rs-esitle.ts`, `p2p-esitle.ts`, `bulut-esitle.ts`. Görüntü: `kayit-tasima`.

**22. Çevrimdışı çalışma**: Dersi bir kez indirip internetsiz çözme, depolama alanı göstergesi, bölüm sayfalarını cihazda tutma, yıldızlı dersleri çevrimdışı tutma; uygulama gibi ana ekrana eklenebilir. Sayfa: `/cevrimdisi/`. Kod: `src/pages/cevrimdisi.astro`, `src/lib/cevrimdisi/`, `src/sw/sw.ts`, `docs/cevrimdisi.md`. Görüntü: `cevrimdisi`.

**23. Yazdırma**: Temiz test kâğıdı biçiminde yazdırma ve PDF; yazdırma ayarları penceresi, ünite bazlı yazdırma. Kod: `src/components/YazdirmaAyarlari.astro`, `src/lib/yazdirma.ts`.

## Topluluk, rehber ve altyapı

**24. Hata bildirme ve tartışma**: Soru kartındaki konuşma simgesi "Soru hatalı", "Açıklama hatalı" ve "Açıklamamı paylaş" seçeneklerini, ders başlığındaki bayrak "Ders hatalı ya da eksik" seçeneklerini açar; bildirim hazır doldurulmuş GitHub issue formuna, tartışma GitHub Discussions'a (giscus) gider. Kod: `src/components/Tartisma.astro`.

**25. Kullanım rehberi ve ilk ziyaret turu**: Özelliklerin ekran görüntülü anlatımı ve ders sayfasında dört adımlık ilk ziyaret turu. Sayfa: `/rehber/`. Kod: `src/pages/rehber.astro`, `src/components/Tur.tsx`. Görüntü: `rehber`.

**26. Materyaller**: Dersin kaynak ve materyal bağlantıları; Anadolu AÖF derslerinde canlı ders kayıtları dahil. Sayfa: `/<üniversite>/<bölüm>/<ders>/materyaller`. Kod: `src/pages/[university]/[department]/[course]/materyaller.astro`, `src/data/anadolu-materials.json`.

**27. Ziyaret sayıları**: Çerezsiz, günlük tekil ziyaretçi ve sayfa gösterimi, 1/7/30 gün aralığı. Sayfa: `/istatistik/`. Kod: `src/pages/istatistik.astro`, `workers/sayac/`.

**28. Paylaşım görselleri ve arama motoru uyumu**: Sayfa başına 1200x630 paylaşım görseli, site haritaları, yapısal veri. Kod: `src/pages/og/`, `src/lib/og/`, `src/pages/sitemap-index.xml.ts`, `src/lib/yapisal-veri.ts`.

**29. Hukuki ve kurumsal sayfalar**: Hakkımızda, İletişim, Gizlilik, Kullanım Koşulları, Telif. Kod: `src/pages/hakkimizda.astro`, `iletisim.astro`, `gizlilik.astro`, `kullanim-kosullari.astro`, `telif.astro`.

## Gözlemler (ekran görüntüsü alırken)

**Konular düğmesi**: Ders sayfasındaki "Konular" düğmesi 22 Kasım 2026'da canlı sitede çekmeceyi açmadı (mobil ve masaüstü); aynı içerik "Tam menü > İçindekiler" yolundan açılıyor. Düğme `[course].astro` içinde `icindekiler:ac` olayını gönderiyor.

**Çalışma odası üst başlığı**: 390 piksel genişlikte ders başlığı ve üniversite satırı üst kenarda kesik görünüyor; masaüstünde de başlık üst kenara çok yakın.

**Ana sayfa sayacı**: Ana sayfadaki canlı sayaç 10.991 ders ve 920.685 soru gösteriyor; depodan sayımda 10.983 ders kaydı ve 921.022 soru çıkıyor (derleme anı farkı olabilir). Sayım: `node docs/tanitim/sayim.mjs`.
