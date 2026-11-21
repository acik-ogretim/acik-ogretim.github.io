# Mobil öncelikli tasarım planı (Kasım 2026, ikinci plan)

Bu plan maketleri sitenin gerçek yapısına bağlar: her ekran bir rotaya ya da bileşene, her alan bir veri anahtarına karşılık gelir. Tasarım dili tema 17'dir (`TEMA-17.md`, `17-onerilen-dil.html`); 01-12 ve 16 numaralı maketler bu temayla yeniden üretildi. 13, 14, 15, 18 ve 19 karar sürecindeki denemelerdir.

Durum etiketleri: **var** (kod ve veri var, yalnız yeni dile giydirilir), **yeni** (veri var, ekran yok), **veri gerekir** (önce kayıt ya da veri dosyası eklenir).

## 1. Tasarım dili

**Belirteçler iki katman**: temel (yüzey, metin, kenar, vurgu) ve öğrenme (doğru, yanlış, uyarı, ilerleme). Vurgu değişince öğrenme renkleri değişmez; turuncu vurgunun yanlış rengiyle karışması bu yüzden bir daha olmaz (Khan Academy Wonder Blocks'un Core ve Learning ayrımı).

**Koyu ve açık eş değer**: koyu #151515 kademeleri, açık #FCFCFB; kenarlar %9 ve %10. Vurgu yumuşak mavi, ekranda yalnız birincil eylemde. Başlıklar serif, arayüz sistem yazı tipi.

**Biçim**: kart 24 px, satır 16 px, büyük kart 28 px köşe; gölge yok; cam yalnız sekme çubuğu, üst çubuk, oynatıcı ve alt sayfada. Yan şerit, gradyan, saf siyah ve keskin beyaz yok.

**Canlı koda geçiş**: `src/styles/global.css` rol adları (`--bg-color`, `--card-bg`, `--primary-color`, `--correct-*`, `--incorrect-*`) korunur, değerleri tema 17'den gelir; sepya teması aynı rollere eşlenir.

## 2. Uygulama haritası

**Kabuk**: telefonda beş sekme (Ana sayfa, Derslerim, Ara, İlerleme, Ayarlar). Ders sayfası tam ekran görev ekranıdır, sekme çubuğu gizlenir, tek sabit alt öğe oynatıcıdır. Mevcut `MobilMenu.tsx` (üst çubuk, menü, alt çubuk düzenleme) korunur; menü sekmelerden erişilemeyen işlevleri toplar.

**Ana sayfa** (`/`, `index.astro`): ilk ziyarette tanıtım ve okul seçimi (07a-d), dönen öğrenciye Bugün ekranı (08). **yeni**: kaldığın yer ve tekrar gereken sayısı `quiz-progress-*` kayıtlarından hesaplanır; seçilen okul ve dönem için `kurulum` anahtarı **veri gerekir**.

**Keşif** (`/[university]`, `/[university]/[department]`): bölüm ve ders listeleri, yıldızla favori (07b-c, 09d). **var**: `favorite-departments`, `favorite-courses`, ders verisinde dönem alanı.

**Derslerim** (09): favori dersler, sürükleyip sıralama, çıkarma. **var**: `favorite-courses`. İşaretli sorular için `isaretli-<ders>` **veri gerekir**.

**Ders** (`/[university]/[department]/[course]`):
- Soru çözme ve oynatıcı (01, 02): `QuizPlayer.astro`, `quiz-player.ts`, `eylemler.ts`, `cubuk.ts`. **var**. Oynatıcı: oynat ortada sabit, iki yanında kullanıcının seçtiği ikişer eylem (`cubuk-duzeni`), sığmayanlar alt sayfa ızgarasında.
- Arama (03): **var**, alt sayfa olarak yeniden giydirilir.
- Derse sor (04): `SohbetCekmece.tsx`, `Sohbet.tsx`. **var**.
- Ünite, konu, yanlışlarım (05): `Icindekiler.tsx`, kitap konuları. **var**.
- Özet okuma (06): `data/ozetler`. **var**.
- Video ve eş zamanlı anlatım (16a): `youtube-videolar.json` **var**; zamanlı döküm **veri gerekir** (`LMS-PLANI.md` §1).
- Materyaller (`/materyaller`): OYS ünite PDF'leri. **var**.
- Tartışma ve hata bildirimi: `Tartisma.astro` (giscus). **var**.

**Ara sekmesi**: dersler arası arama; 03'ün tam ekran hâli. **yeni** (bugünkü arama ders içi).

**İlerleme** (10): çözülen, son denemede doğru, üst üste iki kez doğru, tekrar gereken; ders ve ünite kırılımı. **yeni** (`quiz-progress-*`). Seri, günlük grafik ve süre **veri gerekir** (sonuçla birlikte gün damgası).

**Sohbet** (`/sohbet`): 04'ün tam ekran hâli. **var**.

**Ayarlar** (11): görünüm (`theme`, `yazi-boyutu`), sesli okuma ve soru çözme (`quiz-settings`), eşitleme ve yedek (`/yedek`, `google-esitle`, `rs-esitle`, `bulut-esitle`, `p2p-esitle`), yapay zekâ (`SaglayiciAyarlari.tsx`), yardım (rehber, gizlilik, kullanım koşulları, telif, hakkımızda, iletişim, turu yeniden göster). **var**; bugün Layout çekmecesinde ve ayrı sayfalarda, sekmede toplanır. `/istatistik` site ziyaret sayıları olduğu için kişisel İlerleme ile karıştırılmaz, Ayarlar > Hakkında altına gider.

**Giriş** (07e): sitede hesap yok; giriş ekranı kayıt getirme ekranıdır (beş eşitleme yolu). e-Devlet ve şifreli giriş plana alınmadı.

**PWA durumları** (12): ana ekrana ekleme rehberi (iOS üç adım, Android `beforeinstallprompt`), çevrimdışı bandı (`offline.astro`, `sw.js`), 404. Güncelleme bandı **veri gerekir**: `sw.js` önbellek adı her yayında sürümlenir ve `updatefound` dinlenir.

**Canlı ders ve kurs akışı** (16b, 16c): `LMS-PLANI.md` §2-3. Haftalık akış için akademik takvim **veri gerekir**; anlık anket Worker ve Durable Object ister.

## 3. Uygulama sırası

1. **Belirteçler ve kabuk**: `global.css` değerleri, sekme çubuğu, güvenli alan kuralı, cam alt öğeler. Bütün sayfalar yeni dile birden geçer.
2. **Ders sayfası**: oynatıcı (iki katman, `cubuk-duzeni` ile), şık ve açıklama kartları, arama ve sohbet alt sayfaları.
3. **Keşif ve Derslerim**: liste sayfaları, favori ve sıralama.
4. **İlerleme, Ayarlar, PWA**: kayıtlardan hesaplanan ölçüler, ayar sekmesi, kurulum rehberi, çevrimdışı bandı.
5. **Veri ekleri**: `kurulum`, `isaretli-<ders>`, gün damgası (ve `yedek.ts` birleştirme kuralları), `sw.js` sürümleme.
6. **Video ve döküm**: sayfa içi oynatıcı, zamanlı döküm, dökümden not, kısa parça sonrası 2-3 soru.

Her adım sonunda 375, 390, 430 ve 768 px'te Playwright ekran görüntüsü alınır, açık ve koyu temada bakılır.

## 4. Kaynak belgeler

`DESIGN.md` (ilk sözleşme, §10-11 sistem uyumu), `TEMA-17.md`, `LMS-PLANI.md`, `KARSILASTIRMA.md`.
