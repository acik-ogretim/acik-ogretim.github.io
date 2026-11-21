# Sorudan konu anlatımına geçiş

Zeki'nin isteği (21 Kasım 2026): soru ekranından konu anlatımına geçiş; konu metni çekmecede açılsın, hızlı sesli okuma olsun, ileride videoyla eşzamanlı ve ayrıntılı anlatımlar gelsin.

## Kaynak veri

Ders kitapları `WildGenie/ders-kitaplari` deposunda: `ataturk-aof/<ders>/kitap/` altında her ünite için üç dosya var.

- `unite-NN.mdx`: okunabilir metin. Her konu `<Konu id="k-1.1" no="1.1" baslik=... sayfa=...>` ile sarılı; içinde `<Gorsel sayfa>`, `<Altyazi>`, `<Kutu tur>` bileşenleri. Örnek: Çocukla İletişim 1. ünite 56 KB, 14 konu, konu başına 0,1 ile 9,6 KB.
- `unite-NN.json`: PDF ayrıştırma çıktısı (blok türü, sayfa, kutu koordinatı). Okuma için ağır (aynı ünite 99 KB) ve koordinat yükü taşıyor; yalnız sayfa ve görsel konumu için kullanılır.
- `icindekiler.json`: ünite, bölüm ve başlık ağacı.

Görseller henüz depoda yok: `<Gorsel>` yalnız sayfa numarası taşıyor.

## Karar: derleme anında konu parçası

Tarayıcı MDX ya da ham JSON okumaz. Derleme sırasında her MDX ünitesi `<Konu>` sınırlarından bölünür ve konu başına küçük bir dosya üretilir:

`public/konu/<uni>/<ders>/<no>.json` → `{ no, baslik, unite, sayfa, html, metin, onceki, sonraki }`

- `html`: Kutu, Altyazi ve Gorsel bileşenleri sitenin kendi sınıflarına çevrilmiş, temizlenmiş HTML. Çekmece bunu doğrudan basar.
- `metin`: sesli okuma için düz metin (TTS bunu cümle cümle okur, okunan cümle vurgulanır).
- Gerekçe: site Astro ile durağan üretiliyor, MDX'i çalışma anında derlemek gereksiz yük; konu dosyası dokunulduğunda indirilir, çevrimdışı önbelleğe tek tek ya da ders indirmeyle toplu girer; sesli okuma ve yapay zekâ menüsü aynı düz metni kullanır.
- Ayrıca her ders için `/<uni>/<bolum>/<ders>/konu/<no>/` durağan sayfası üretilir (arama motoru ve paylaşım bağlantısı için); çekmece ile aynı veriyi kullanır.

## Soru ile konu eşleşmesi

Sorudaki `section` alanı (`1.1`) var olan `.q-konu` düğmesine bağlı ve bugün içindekiler çekmecesini açıyor. Yeni davranış: düğme konu çekmecesini açar, içindekiler oradan erişilir.

Eksik: Atatürk AÖF'te 163.652 sorunun yalnız 2.550'sinde `section` var; geri kalanında yalnız `unitNumber` bulunuyor. Bu sorular için çekmece üniteyi açar, ardından bir eşleme işi her soruyu kitap metnine göre en yakın konuya yerleştirir (Gemini sınıflandırma ya da gömme benzerliği; auzeff-tui `classifier.py` yöntemi örnek). Sonuç soru dosyalarındaki `section` alanına yazılır.

## Aşamalar

1. Derleme betiği: ders-kitaplari klonundan konu parçalarını üretir; depo yoksa adım atlanır, site yine derlenir.
2. Konu çekmecesi: katman sözleşmesine (`src/styles/katman.css`) uyan yerleşik `<dialog>`; telefonda alttan sayfa, masaüstünde sağ panel; önceki ve sonraki konu, kitap sayfası numarası, "Bu konudan sorular" bağlantısı.
3. Hızlı sesli okuma: var olan oynatıcı (`.oynatici-sayac`) ve hız ayarı konu metnini okur; okunan cümle vurgulanır ve görünür alana kaydırılır.
4. Çevrimdışı: ders indirildiğinde konu parçaları da önbelleğe girer.
5. Eşleme işi: `section` alanı boş soruları konuya yerleştirir.
6. Ayrıntılı anlatım: yapay zekâ menüsündeki "Daha ayrıntılı anlat" konu metnini bağlam olarak alır.
7. Video eşzamanı: `youtube-videolar.json` ve AUZEF ders videoları için zaman kodlu konu eşlemesi; video oynarken ilgili konu çekmecede ilerler. Zaman kodu verisi gelmeden başlanmaz.

8. Wiki gibi çalışma (Zeki, 21 Kasım 2026): konular birbirine bağlı bir bilgi ağı olur.
   - Her konunun kalıcı adresi var (`/<uni>/<bolum>/<ders>/konu/<no>/`); kavram ve kişi adları başka konulara bağlantı olur.
   - Her konu sayfasında "Bu konuya bağlananlar" (geri bağlantılar), aynı kavramın geçtiği diğer dersler ve bu konudan çıkmış sorular listelenir.
   - Kavram çizgesi: bir dersin konuları ve kavramları düğüm, bağlantılar kenar; ders sayfasında ve konu çekmecesinde yerel çizge (seçili konu ve komşuları), ayrı bir sayfada dersin tamamı. Çizim istemci tarafında, yalnız açılınca yüklenen bir kütüphaneyle (Cytoscape.js ya da benzeri; seçimden önce paket boyutu ölçülür).
   - Veri: derleme betiği her konu dosyasına `kavramlar` ve `baglantilar` alanlarını yazar, ders başına `cizge.json` üretir. Kavram çıkarma ilk turda kitaptaki koyu terimler, başlıklar ve sözlük bölümlerinden; ikinci turda Gemini ile kavram ve ilişki çıkarma (sonuç depoya yazılır, her derlemede yeniden üretilmez).
   - Paylaşımlı dersler (birden çok bölümde okutulan) aynı konu düğümünü paylaşır.

9. Konu çıkarılırken çalışma malzemesi üretimi (Zeki, 21 Kasım 2026): ATA ÖYS'nin 18 kutucuklu etkinlik ızgarası işlevsel ama görünüşü kötü; biz aynı malzemeyi konu çıkarma adımında üretip konunun içine yerleştiririz, ayrı kutucuk sayfası açmayız.
   - Üretim yeri: ders-kitaplari hattı, konu başına bir kez (Gemini, yalnız o konunun metnine dayanır, kitapta olmayan bilgi eklemez). Çıktı `kitap/etkinlik/unite-NN.json`, konu kimliğiyle anahtarlı; portal derlemesi konu dosyasına `calisma` alanı olarak ekler. Her derlemede yeniden üretilmez, depoda durur ve elle düzeltilebilir.
   - Konu başına alanlar: `ozet` (3-4 cümle), `temelNoktalar` (3-6 madde), `kavramlar` (terim + kitaptaki tanım; kavram sözlüğü, hafıza kartı ve wiki bağlantısı aynı veriden), `sebepSonuc` (varsa), `ornek` (günlük hayattan bir örnek, varsa), `benzetme` (varsa), `miniTest` (2-4 soru: çoktan seçmeli, doğru/yanlış, boşluk doldurma; cevabı ve kitaptaki dayanak cümlesiyle), `tartisma` (1 açık uçlu soru). Konunun malzemesi yetmiyorsa alan boş kalır, doldurmak için uydurma yapılmaz.
   - Gösterim: konu çekmecesinde ve konu sayfasında metnin üstünde ince bir "Özet · Temel noktalar · Kavramlar" şeridi; metin içinde kavramlar altı çizili bağlantı, dokununca tanım baloncuğu; metnin sonunda "Kendini dene" mini testi ve sebep-sonuç ile örnek kartları. Ders sayfasında ızgara yerine çalışma kipleri: Kartlar (bütün kavramlar, aralıklı tekrar), Hızlı test (mini testler karışık), Sesli tur (özet + temel noktalar sesli okunur).
   - Bağlantılar: yanlış yapılan sorunun konusundan o konunun kartları ve mini testi önerilir; ilerleme konu başına mini test sonucu ve kart tekrarıyla hesaplanır.
   - İlk deneme: Atatürk AÖF Sosyoloji 1. dönem dersleri, önce Hukukun Temel Kavramları 1. ünite; çıktı elle okunup kalite ölçütü yazıldıktan sonra bütün derslere yayılır.

10. Video ile metin bir arada (Zeki, 21 Kasım 2026): kendi videolarımız kendi zamanlamamızla oynar; video izlerken o an anlatılan konunun özeti, tam konu anlatımı, geçen kavramların wiki açıklaması açılır; sorudan konuya ve videonun o konuyu anlattığı ana gidilir. Videoların dökümü, özel bağlantı noktaları (konu başlangıçları, kavramın ilk geçtiği an), terimler ve öncüller (bir konuyu anlamak için önce bilinmesi gereken konular ve kavramlar, çizgede `onkosul` kenarı) veri olarak tutulur. Döküm kaynağı: auzeff-tui seslendirme parçalarının gerçek süreleri (`scripts/video_dokum.py`, çıktı `data/ata-aof/yayin/dokum/`).
11. Kullanıcı vurgusu: metinde (konu, döküm) seçip vurgulama; tarayıcıda saklanır, yedek ve eşitlemeye girer, "Vurgularım" listesinden konuya dönülür.
12. Çevrimdışı: konu dosyaları, döküm ve çalışma malzemesi ders indirmesine girer; video bağlantı ister, onun dışında her şey çevrimdışı çalışır.
13. İlk gösterim (21 Kasım 2026, Zeki'nin 22 Kasım vize sınavları için): `/calisma/<ders>/` çalışma odası, Atatürk AÖF Sosyoloji 1. dönem altı ders, 1-7. üniteler.

Diğer üniversiteler (AUZEF, Anadolu, Ankara) MDX'leri üretildikçe aynı hatta girer.

## Çalışma odası prototipi (21 Kasım 2026)

Atatürk AÖF vize haftası için altı ders ve 1 ile 7. üniteler: `/calisma/<ders>/` (hukukun-temel-kavramlari, sosyolojiye-giris, psikoloji, istatistige-giris, turk-kulturu-ve-medeniyeti-tarihi, temel-bilgi-teknolojileri-i). Sayfa noindex; ders sayfalarından henüz bağlantı yok, adres elle açılır.

**Ne yapar**: kendi vize özet videomuz (YouTube IFrame API) üstte yapışık durur; altında zaman kodlu döküm akar, çalan satır vurgulanır ve görünür alanda tutulur, satıra dokununca video o saniyeye gider. "Şu an" paneli çalan satırın konusunu (özet, temel noktalar, kavramlar) gösterir; oradan konu anlatımı (yerleşik `<dialog>`, önceki ve sonraki konu), "Kendini dene" (mini test, cevaptan sonra kitaptaki dayanak) ve çıkmış soru sayısı açılır. Kavram sözlüğündeki terimler dökümde ve konu metninde altı noktalı çizili bağlantıdır; dokununca tanım baloncuğu ve "Konuya git" çıkar. İçindekiler her konunun videoda kaç saniyede geçtiğini gösterir. Metin seçip "Vurgula" ile vurgu kaydedilir; "Vurgularım" listesinden gidilir ya da silinir.

**Veri paketi**: `node scripts/calisma-odasi-paketle.mjs [ders ...]` kitap MDX'lerini (ders-kitaplari), döküm dosyalarını (`auzeff-tui/data/ata-aof/yayin/dokum/<ders>-kisa-vize.json`), `kitap/etkinlik/unite-NN.json` çalışma malzemesini ve çıkmış soru kimliklerini `src/data/calisma-odasi/<ders>.json` içinde toplar; dosyalar commit'lenir, CI bu betiğe bağlı değildir. Etkinlik üretimi ilerledikçe betiği yeniden çalıştırıp dosyaları commit'le. `KITAP_DIZINI` ve `DOKUM_DIZINI` ortam değişkenleri klasör yollarını değiştirir.

**Döküm ve konu eşlemesi**: her satır, konuların başlık, kavram, temel nokta, özet ve kitap metninden kurulan TF-IDF vektörüne (Türkçe küçük harf, ilk beş harf gövdeleme, komşu satırlarla pencere) benzerlikle puanlanır; geçiş bedelli dinamik programlama konu titremesini önler ve eşiğin (`CALISMA_ESIK`, varsayılan 0,17) altındaki satır konusuz kalır. Konusuz satırlar arayüzde önceki konuyu sürdürür. Zaman kodları bölüm başlarında gerçektir, bölüm içi orantılıdır (birkaç saniye sapabilir).

**Kod**: `src/pages/calisma/[ders].astro` (sayfa ve gömülü paket), `src/scripts/calisma-odasi.ts` (davranış), `src/lib/calisma-odasi/` (`sema.ts` Zod, `kavram.ts` kavram eşleme, `vurgu.ts` vurgu saklama ve metin alıntısı çapası), `src/styles/calisma-odasi.css`. Vurgular `vurgular-ataturk-aof-<ders>` anahtarıyla localStorage'da durur ve `yedek.ts` birleştirmesine katılır.

**Çevrimdışı**: paket sayfaya gömülüdür; sayfa bir kez açıldıktan sonra service worker'ın gezilen sayfa önbelleğinden açılır (indirilen ders paketine ayrı bir adres kancası yoktur). Video internet ister; çevrimdışıyken tek satırlık uyarı çıkar, döküm, konular, testler ve vurgular çalışır.

**Sınama**: Playwright ile 390x844 ve 1280x800, açık, koyu ve sepya; YouTube API'si sahte oynatıcıyla değiştirilir, zaman `window.coZaman(sn)` ya da sahte oynatıcının `getCurrentTime` değeriyle sürülür.
