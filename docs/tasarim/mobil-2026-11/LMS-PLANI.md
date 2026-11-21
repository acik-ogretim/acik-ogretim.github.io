# Ders, video ve canlı ders planı: ÖYS ve LMS işlevlerinin portaldaki karşılığı (Kasım 2026)

Açık öğretim fakültelerinin ÖYS ve LMS sistemlerinde öğrencinin kullandığı işlevler, portalın kurgusuyla (statik site, hesap yok, kayıt tarayıcıda, isteğe bağlı eşitleme) karşılaştırıldı. Her işlevin yanında üç şeyden biri yazar: **hazır** (bugünkü veriyle yapılır), **küçük altyapı** (statik veriye ya da mevcut Cloudflare Worker'a bir ek ister), **büyük altyapı** (gerçek zamanlı sunucu ya da kimlik ister). Ekran maketi: `16-video-canli-ders.html`.

## 0. Hedef: eKampüs ve ÖYS'nin her işlevi, daha iyisiyle

Zeki (21 Kasım 2026): portal, açık öğretim ÖYS'lerinin, Anadolum eKampüs'ün ve çevrimiçi eğitim platformlarının öğrenciye sunduğu bütün işlevleri taşımalı; Anadolu Üniversitesindeki hocalara "sizin ÖYS'nizden daha iyisini yaptık" diye gösterilebilecek düzeyde olmalı. Aşağıdaki liste resmî kaynaklarda sayılan işlevlerden çıkarıldı; her yeni özellik bu listeye bakılarak planlanır.

**eKampüs'ün bileşenleri** (Anadolu AÖF kılavuzu): öğrenme yönetim sistemi, öğrenen analitikleri, canlı ders platformu, mobil uygulama.

**eKampüs malzemeleri** (kılavuz, 2020-2021 program kataloğu, e-bülten): ders kitabı (PDF, EPUB, HTML5, MOBI), sesli kitap (DAISY, MP3; insan sesi ve sentez), ünite özeti ve sesli özet, sorularla öğrenelim, ünite alıştırmaları, çevrimiçi deneme sınavı, çıkmış sınav soruları, konu anlatım videoları, etkileşimli video, yakın plan, kilit soru, ders tanıtımı, mikroanimasyon, infografik, canlı ders (e-Seminer) ve kayıtları, sınav öncesi soru-cevap dersi, altyazılı video, AnaBilgi kavram sözlüğü (850 kitaptan 200 bin kavram), soru küpü, dene-öğren etkinlikleri, tartışma forumu.

**ATA AÖF ÖYS uygulaması** (App Store tanıtımı): ders kitapları, deneme soruları, çıkmış sorular, ders videoları, duyurular; sınav giriş belgesi ÖBS, ÖYS ve mobil uygulamada.

**ATA AÖF ÖYS'nin yeni ünite sayfası** (Zeki'nin ekran görüntüsü ve sayfanın kendisi, 21 Kasım 2026, Hukukun Temel Kavramları 1. ünite): her ünite bir kart; ünite numarası, başlık, bölüm sayısı, "Devam ediyor" durumu, yazar, yüzde ilerleme halkası, açılır içerik ızgarası. Her etkinlik kutusunda tamamlandı işareti. Etkinlikler beş grupta:

- Genel: İçerik (metin), Özet.
- Multimedya: Özet video (yapay zekâ), Video (stüdyo), Podcast.
- Alıştırma ve uygulama: Temel noktalar, Kavram sözlüğü, Hafıza kartları (kavram ön yüz, tanım arka yüz; ünite başına 6 kart; boşluk tuşu çevirir, oklar gezdirir; tek kart ve tümü görünümü), Metaforlar, Sebep-sonuç, Günlük hayat örnekleri.
- Değerlendirme: Çöz ve öğren, Doğru/yanlış, Boşluk doldurma, Eşleştirme, Kısa cevap.
- Yansıtıcı etkinlikler: Tartışma soruları, Eleştirel düşünme, Vaka analizi, Artılar ve eksiler.

Her etkinlikte 1-5 yıldız puanlama ve içerik geri bildirimi. Ders sayfasında "Kaldığım yerden devam et" ve ders başına deneme sınavı. Menüde: Derslerim, Deneme sınavları, Geçmiş sınav soruları, Soru itirazlarım, Sonuç itirazlarım, İçerik geri bildirimi, Erişilebilirlik (UserWay), gece görünümü, bildirim ayarları (web push), duyurular. Sayfa ayrıca bir sınav arenası betiği yüklüyor (`examarena`); işlevi ayrıca incelenecek.

**Portalda karşılığı (plan)**: aynı 18 etkinlik türü, ders kitabı MDX'inden konu konu üretilir (Gemini, kitap metnine dayalı; ÖYS içeriği kopyalanmaz, kendi içeriğimizi üretiriz). Farkımız: ünite başına 6 kart yerine her konunun kavramlarından kart ve aralıklı tekrar; her etkinlik konu sayfasına ve o konudan çıkmış sorulara bağlı; yanlış yapılan sorunun konusundan ilgili kartlar ve sebep-sonuç etkinliği önerilir; ilerleme halkası etkinlik açmakla değil gerçek sonuçla (doğru oranı, tekrar zamanı) dolar; puan ve geri bildirim tek dokunuşla hata bildirimine bağlanır. Üretim hattı: ders-kitaplari deposunda `etkinlik/unite-NN.json` (tür başına dizi), portal derlemesinde konu dosyalarına bağlanır. İlk deneme: Zeki'nin okuduğu Sosyoloji 1. dönem dersleri (Hukukun Temel Kavramları dahil).

**Portalın karşılığı ve fark yaratacağı yerler**

**Ders kitabı**: kitap MDX'i konu konu çekmecede ve kalıcı konu sayfasında açılır, sorudan tek dokunuşla konusuna gidilir ([docs/konu-anlatimi.md](../../konu-anlatimi.md)). eKampüs'te kitap ayrı bir dosyadır; bizde soru, konu, özet ve video birbirine bağlı.

**Sesli kitap ve sesli özet**: her konu ve özet cümle vurgulamalı sesli okunur, hız ayarlıdır; auzeff-tui podcast ve video hattı ünite podcast'i üretir.

**Kavram sözlüğü (AnaBilgi karşılığı)**: wiki yapısı; her kavram tıklanabilir, geçtiği konular, dersler ve sorular listelenir, kavram çizgesiyle gezilir.

**Alıştırma, deneme, çıkmış soru**: var; çıkmış sorular sorulma sıklığıyla sıralanır, yanlışlar ve işaretliler kalır, zamanlı sınav kipi ve aralıklı tekrar plandadır (aşağıda 4. bölüm). eKampüs'te çıkmış sorular derse ve döneme göre ayrık; bizde soru konuya ve kitap sayfasına bağlı.

**Video, etkileşimli video, altyazı**: 1. bölüm; videoyla eşzamanlı konu metni, metinden videoya atlama, döküm aynı zamanda altyazı.

**Canlı ders ve soru-cevap**: 3. bölüm.

**Öğrenen analitikleri**: kişinin kendi ilerlemesi, zayıf konuları, konu bazında başarı; veri cihazda kalır, isteğe bağlı eşitlenir (eKampüs'ten farklı olarak kurum veriyi görmez).

**Mobil uygulama**: kurulabilir web uygulaması, çevrimdışı ders indirme, ana ekran.

**Forum**: soru ve ders başına tartışma ve tek dokunuşla hata bildirimi.

**Duyurular ve sınav takvimi**: 5. bölüm ve `.ics`.

**Yalnız bizde**: kendi anahtarıyla yapay zekâ sohbeti (derse sor, yanlış yaptığı konuları göster, konu anlat, sesli konuşma), açıklamayı zenginleştirme menüsü, hesap gerektirmeyen kullanım, üniversiteler arası tek arayüz.

Kapsam dışı: not, ödev teslimi, sınav giriş belgesi, kayıt işlemleri (fakültenin resmî sistemleri; portal oraya bağlantı verir).

Kaynaklar: Anadolu AÖF kılavuzu https://www.anadolu.edu.tr/uploads/anadolu/files/aof_kilavuz/65a121eee17f7.pdf · Anadolu Üniversitesi 2020-2021 program kataloğu https://anadolu.edu.tr/uploads/anadolu/ckfinder/web/files/anadolu-universitesi-2020-2021-ogretim-yili-program-katalogu.pdf · Açıköğretim e-bülten 71 https://anadolu.edu.tr/uploads/anadolu/ckfinder/aof/files/AOebulten71.pdf · e-bülten 47-II https://anadolu.edu.tr/uploads/anadolu/ckfinder/aof/files/AOebulten47-II.pdf · ATA AOF OYS uygulaması https://apps.apple.com/us/app/id6472282436

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
