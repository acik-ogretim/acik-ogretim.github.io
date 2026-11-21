# Ders, video ve canlı ders planı: ÖYS ve LMS işlevlerinin portaldaki karşılığı (Kasım 2026)

Açık öğretim fakültelerinin ÖYS ve LMS sistemlerinde öğrencinin kullandığı işlevler, portalın kurgusuyla (statik site, hesap yok, kayıt tarayıcıda, isteğe bağlı eşitleme) karşılaştırıldı. Her işlevin yanında üç şeyden biri yazar: **hazır** (bugünkü veriyle yapılır), **küçük altyapı** (statik veriye ya da mevcut Cloudflare Worker'a bir ek ister), **büyük altyapı** (gerçek zamanlı sunucu ya da kimlik ister). Ekran maketi: `16-video-canli-ders.html`.

## 1. Video ve eş zamanlı konu anlatımı (16a)

**Video**: ders başına YouTube kanalımızdaki ünite videoları `src/data/youtube-videolar.json` içinde duruyor ve bu dosyayı auzeff-tui hattı yazıyor. Bugün yalnız bağlantı olarak listeleniyor; sayfa içinde YouTube IFrame Player API ile oynatılırsa zaman bilgisi sayfaya akar. **Hazır.**

**Eş zamanlı metin**: konuşulan cümle metinde işaretlenir, metindeki zamana dokununca video oraya atlar. Metnin kaynağı iki yoldan biridir. Birincisi videonun kendi senaryosu: auzeff-tui podcast ve ders videolarını senaryodan seslendiriyor, seslendirme adımı cümle sınırlarını zaman damgasıyla yazarsa döküm bedavaya gelir. İkincisi `gemini-api transcribe` ile zaman damgalı döküm. Çıktı biçimi: ders ve ünite başına `[{bas, bit, metin, konu}]` JSON; `konu` alanı ders-kitaplari deposundaki konu kimliğine (`k-4.2.1`) bağlanır, böylece metinden kitap sayfasına ve o konunun sorularına geçilir. **Küçük altyapı** (hatta bir çıktı daha).

**Okuma kipleri**: aynı ekranda Anlatım (döküm), Özet (ünite özeti), Sorular (o ünitenin soruları) sekmeleri. Video kapatılınca döküm sesli okumayla sürer; oynatıcı çubuğu aynı kalır.

## 2. Kurs akışı ve haftalık modül (16c)

LMS'lerdeki "hafta" yapısı: video, kitap ünitesi, özet podcast, ünite sonu deneme, canlı ders, ödev; her öğe tamamlandı, yarıda, başlanmadı durumlarıyla. Öğeler bugünkü verilerden gelir (kitap PDF'i OYS'den, sorular, özetler, videolar). Hafta ile ünite eşlemesi için üniversitelerin akademik takviminden `takvim/<uni>.json` gerekir. Tamamlanma bilgisi tarayıcıda tutulur ve mevcut eşitleme yollarıyla taşınır. **Küçük altyapı.**

## 3. Canlı ders (16b)

**Yayın**: YouTube Live gömmesi; kayıt sonra otomatik olarak ünite videosu olur ve 1. bölümdeki döküm hattına girer. **Hazır.**

**Anlık soru (anket) ve oylanan sorular**: gerçek zamanlı sayım ister. Sitenin ziyaret sayacı zaten bir Cloudflare Worker ve D1 ile çalışıyor (`workers/sayac/`); aynı hesapta Durable Object ile oda başına anket ve soru kuyruğu kurulur, kimlik gerekmez (tarayıcıya özel rastgele kimlik). **Büyük altyapı**, ama mevcut Worker'ın yanına sığar. Daha hafif seçenek: yayın sırasında sorular giscus tartışmasına yazılır (bugün var), anket YouTube'un kendi anketiyle yapılır.

**Takvim**: canlı ders ve sınav tarihleri `.ics` dosyası olarak indirilir, "Takvime ekle" düğmesi sunucusuz çalışır. **Küçük altyapı.**

## 4. Ölçme ve değerlendirme

**Deneme sınavı ve soru bankası**: var. **Zamanlı sınav kipi** (gerçek sınavdaki süre ve soru sayısıyla, sonunda sonuç ve yanlış listesi): mevcut oynatıcıya bir kip olarak eklenir. **Hazır.**

**Aralıklı tekrar** ve "bugün tekrar et" listesi: soru sonucuyla birlikte gün damgası gerekir (DESIGN.md §11). **Küçük altyapı.**

**Ödev ve teslim**: notlandırma fakültenin işidir; portal yalnız ödev yönergesini, ölçütü ve kendi kendine kontrol listesini gösterir. **Kapsam dışı (yalnız rehber).**

## 5. İletişim ve duyuru

**Tartışma**: soru ve ders başına giscus var. **Duyurular**: fakültelerin duyuru sayfalarından derlenen `duyurular/<uni>.json`, ana sayfada tek satırlık bant. **Küçük altyapı.**

**Bildirim**: iOS ve iPadOS 16.4'ten beri ana ekrana eklenmiş web uygulamaları Web Push alabiliyor; izin isteği ancak kullanıcının bir düğmeye dokunmasıyla açılabiliyor. iOS 26'da ana ekrana eklenen her site varsayılan olarak web uygulaması gibi açılıyor. Gönderim için VAPID anahtarlı küçük bir Worker ve abonelik deposu gerekir. **Büyük altyapı.** Kullanım: canlı ders başlıyor, sınava 7 gün kaldı, tekrar listesi hazır.

## 6. Kişiselleştirme ve erişilebilirlik

Sesli okuma, hız, otomatik ilerleme, tema ve yazı boyutu var. Videoda altyazı dökümden üretilir (WebVTT), aynı dosya hem altyazı hem eş zamanlı metin olur. Sesli mod (yapay zekâ ile konuşarak çalışma) sohbet bileşeninde var; 15. sayfadaki 7 numaralı yön onu ana kapı yapmayı öneriyor.

## 7. Sıra önerisi

1. Video sayfa içinde oynatılsın ve eş zamanlı döküm gelsin (en görünür kazanım, veri hattı bizde).
2. Zamanlı sınav kipi ve sonuç ekranı.
3. Gün damgası, ardından aralıklı tekrar ve gerçek "Bugün" listesi.
4. Akademik takvim verisi: haftalık akış, sınav geri sayımı, `.ics`.
5. Canlı ders: önce YouTube Live ve giscus, talep görürse Durable Object ile anket.
6. Web Push.

## Kaynaklar

- Web Push for Web Apps on iOS and iPadOS, WebKit: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- iOS PWA Compatibility, firt.dev: https://firt.dev/notes/pwa-ios/
