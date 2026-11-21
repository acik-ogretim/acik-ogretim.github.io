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

## Çalışma odası (21 Kasım 2026)

`/calisma/` dizini ve `/calisma/<ders>/` sayfaları: Atatürk AÖF derslerinden konu anlatımı (kitap MDX) olanların hepsi için üretilir (24 ders; `src/data/youtube-videolar.json` içindeki dersler taranır, MDX'i olmayan ders paket almaz). Sayfa noindex; ders sayfasında "Ders anlatımı" düğmesi ve "Konular" ağacındaki "Videoda izle" bağlantısı çalışma odasına götürür (`?konu=<no>` konuyu seçer, `?sekme=<ad>` sekmeyi açar, `?video=<kod>` videoyu seçer).

**Ne yapar**: video (varsa) üstte yapışık durur; birden çok video varsa üstünde seçici çıkar (seçim `?video=` ve localStorage `calisma-video-<ders>`). Altında zaman kodlu döküm akar, satıra dokununca video o saniyeye gider. "Şu an" paneli çalan satırın konusunu, elle seçilmiş konuyu ("Seçtiğin konu", "Videoya dön" düğmesiyle) ya da hiçbiri yoksa kaldığın ya da ilk konuyu gösterir: özet, temel noktalar, kavramlar, sebep ve sonuç, örnekler, benzetmeler, "Üzerine düşün" (boş liste görünmez), çalışma malzemesi yoksa kitap metni. Videosuz ya da dökümsüz derste panel açık başlar. Kavramlar altı çizili bağlantıdır (tam sözcük ya da kök eşleşmesi; "hukuk" terimi "Hukukun" sözcüğünü çizmez), dokununca tanım balonu, yıldız ve "Konuya git" çıkar. Metin seçilince araç çubuğu çıkar: Vurgula, Not ekle, Kopyala (masaüstünde seçimin üstünde, dokunmatik ekranda alt kenarda; Alt+V, Alt+N, Alt+K). Konular sekmesi ünite > konu ağacıdır (üst çubukta da "Konular" düğmesi var).

**Sınav sekmesi**: konunun (soru `section` alanı eşleşir, alt bölümler dahil) ya da ünitenin (`unitNumber`) çıkmış soruları sırayla çözülür; doğru ya da yanlış hemen görünür, açıklama ve kitaptaki konu bağlantısı çıkar. Cevaplar ders sayfasıyla aynı kayda yazılır (`cevaplar-<uni>-<ders>`, soru veri kimliğiyle; `src/lib/calisma-durumu.ts`). Sorular pakete gömülmez: `/calisma/<ders>/sorular-<unite>.json` ünite başına tembel yüklenir, boşta iken tüm üniteler önden alınır ve `calisma-sorular` Cache API önbelleğine konur (çevrimdışı açılır; service worker bu adı silmez). Soru çözüm videosunda satırdaki "Soruya git" düğmesi ilgili karta götürür. Ünite sonunda "Canlı quiz olarak aç" bağlantısı vardır.

**Canlı quiz bağlantı biçimi** (Quiz Time tarafı henüz okumuyor): `https://quiz.zeki.website/duzenle?kaynak=acik-ogretim&ders=<uni>%2F<ders>&unite=<n>&sorular=<id1,id2,...>`; kimlikler ders sayfasındaki soru veri kimlikleridir (`/calisma/<ders>/sorular-<n>.json` içindeki `id`).

**Yıldızlı kavramlar**: tanım balonundaki yıldız kavramı `yildizli-kavramlar-<uni>-<ders>` anahtarına yazar (`[{terim, konu, zaman}]`, Zod: `src/lib/calisma-odasi/yildiz.ts`, `yedek.ts` birleştirmesine katılır). Vurgular sekmesinde "Yıldızlı kavramlar" bölümü, ders sayfasında "Yıldızlı kavramlar, n" düğmesi ve İlerleme sayfasında bölüm olarak görünür. Vurgular `vurgular-ataturk-aof-<ders>` anahtarındadır; isteğe bağlı `not` alanı Not ekle ile yazılır; hedef biçimleri: `s<i>` (ilk videonun satırı), `s<kod>:<i>` (diğer videolar), `k<no>` (konu anlatımı metni), `o<no>` (Şu an paneli).

**Veri paketi** (`src/data/calisma-odasi/<ders>.json`, `node scripts/calisma-odasi-paketle.mjs [ders ...]`): `ders, uni, uretim, videolar[{kod, tur: kisa-ozet|uzun-ozet|soru-cozum|diger, baslik, yt, url, sure, satirlar}], uniteler, konular[{no, baslik, unite, sayfa, html, metin, calisma?, video:{<kod>:{ilk, say}}}], kavramlar, sorular{<unite>:[id]}`. Satır alanları: `i, bas, bit, k (konuşmacı), m (metin), konu, g (benzerlik), y:1 (eşik altında en yakın konuya atandı), q (soru kimliği), u (soru ünitesi)`. Yeni video eklemek `src/data/youtube-videolar.json` ve döküm dosyası eklemektir; yeni `tur` değerleri `sema.ts` içindeki `VideoTurleri` listesinde durur. `calisma` alanı `src/lib/konu/calisma.ts` şemasıdır (listeler 0..n; eski tekil alanlar tek elemanlı listeye çevrilir). Dosyalar commit'lenir, CI bu betiğe bağlı değildir; `KITAP_DIZINI` ve `DOKUM_DIZINI` ortam değişkenleri klasör yollarını değiştirir.

**Döküm ve konu eşlemesi**: her satır, konuların başlık, kavram, temel nokta, özet ve kitap metninden kurulan TF-IDF vektörüne (Türkçe küçük harf, ilk beş harf gövdeleme, komşu satırlarla pencere) benzerlikle puanlanır; geçiş bedelli dinamik programlama konu titremesini önler; eşiğin (`CALISMA_ESIK`, varsayılan 0,17) altındaki satır en yakın konuya atanır (`y:1`). Zaman kodları bölüm başlarında gerçektir, bölüm içi orantılıdır (birkaç saniye sapabilir).

**Kod**: `src/pages/calisma/index.astro` (dizin), `src/pages/calisma/[ders].astro` (sayfa ve gömülü paket), `src/pages/calisma/[ders]/sorular-[unite].json.ts` (soru uç noktası), `src/scripts/calisma-odasi.ts` (davranış), `src/lib/calisma-odasi/` (`sema.ts`, `kavram.ts`, `vurgu.ts`, `yildiz.ts`), `src/styles/calisma-odasi.css`, konu ağacı için `src/components/Icindekiler.tsx` (olay `icindekiler:ac`, `detail.mod = "anlatim"`).

**Çevrimdışı**: paket sayfaya gömülüdür; sayfa bir kez açıldıktan sonra service worker'ın gezilen sayfa önbelleğinden açılır. Video internet ister; çevrimdışıyken tek satırlık uyarı çıkar, döküm, konular, testler, sınav (önbelleğe alınmış üniteler) ve vurgular çalışır.

**Sınama**: Playwright ile 390x844 ve 1280x800 (ya da 1440x900); YouTube API'si sahte oynatıcıyla değiştirilebilir, zaman `window.coZaman(sn)` ya da sahte oynatıcının `getCurrentTime` değeriyle sürülür.

