# Açık Öğretim Portal: mobil öncelikli arayüz tasarımı (Kasım 2026)

Hedef: iPhone 375 ile 430 px, sonra tablet. Bu belge canlı kodu değiştirmez; uygulama için sözleşmedir. Maketler `01-…06-*.html` dosyalarındadır, belirteçler `ortak.css` içinde çalışır durumdadır.

## 1. Çözülen şikâyetler

**Alttaki oynatıcı rahat kullanılmıyor.** Dokuz düğmelik tek şerit, beş düğmelik tek satıra iner (önceki, oynat, sonraki, ara, aç). Kalan altı işlev (soruyu oku, açıklamayı oku, mikrofon, konu, durdur, hız, otomatik ilerle, ayarlar) yukarı kayan alt sayfaya (sheet) taşınır. Her düğme en az 44 px, ana düğme 52 px.

**Köşelerdeki düğmeler yuvarlak ekran köşesinde kırpılıyor.** Çubuk artık ekran kenarına yapışmaz: yüzen bir hap şeklindedir, kenarlardan `max(12px, env(safe-area-inset-left/right))` içeridedir. Hiçbir düğme köşeye konmaz; en dış düğmenin merkezi kenardan en az 30 px içeridedir. Çubuk köşe yarıçapı 30 px, iPhone ekran köşesiyle uyumlu.

**Yüzen arama düğmesi çubuğun altında kalıyordu.** Ayrı yüzen arama düğmesi kaldırılır. Arama çubuğun içinde bir simgedir; tek sabit alt öğe vardır, bu yüzden çakışma yapısal olarak olanaksızdır. Ders sayfasında oynatıcı yoksa (liste ekranları) alt eylem düğmesi aynı alt boşluk kuralını kullanır.

## 2. Güvenli alan ve alt boşluk kuralı

Tüm sabit alt öğeler aynı formülü kullanır (maket cihaz benzetimi: `--sab` 34 px, `--sat` 47 px):

```css
--sat: env(safe-area-inset-top);
--sab: env(safe-area-inset-bottom);
--sal: env(safe-area-inset-left);
--sar: env(safe-area-inset-right);
.bar        { left: max(12px, var(--sal)); right: max(12px, var(--sar));
              bottom: calc(var(--sab) + 6px); height: 60px; }
.sayfa      { padding-bottom: calc(var(--sab) + 12px); }
main.kapsam { padding-bottom: calc(var(--sab) + 6px + 60px + 20px); } /* çubuk + nefes payı */
```

Gereksinimler: `<meta name="viewport" content="..., viewport-fit=cover">`; klavye açılınca alt sayfa `visualViewport` yüksekliğine uyar ve arama alanı klavyenin hemen üstünde kalır. Mevcut `body:has(#quiz-player-bar.visible) main { padding-bottom }` kuralı bu formülle değişir.

## 3. Belirteçler

**Renk (açık tema)**

| Rol | Değer | Not |
| --- | --- | --- |
| zemin | `#F3F5F6` | soğuk kâğıt; krem/kil kalıbından kaçınmak için |
| yüzey | `#FFFFFF` | kart, sayfa, çubuk |
| yüzey-2 | `#E7ECEE` | pasif düğme, şerit boşluğu |
| çizgi | `#D3DBDF` | sınır |
| metin | `#10202A` | zeminde yaklaşık 15:1 |
| metin-2 | `#4E5F69` | meta, yaklaşık 6:1 |
| vurgu | `#0A7C76` | tek vurgu, beyaz üstünde yaklaşık 5,2:1 |
| vurgu-metin | `#06605B` | vurgu zemini üstündeki ve bağlantı metni (açık temada vurgu-zemin üstünde 4,5:1 için) |
| vurgu-zemin | `#DCF0EE` | seçili, çip |
| doğru / zemin | `#17703D` / `#E0F2E6` | yalnız doğru cevap ve başarı |
| yanlış / zemin | `#AE2F27` / `#FBE5E2` | yalnız yanlış cevap |
| uyarı / zemin | `#7F5200` / `#FAEECE` | bağlam çipi, "Hatırla" kutusu, arama vurgusu |

**Renk (koyu tema)**: zemin `#0D1418`, yüzey `#162026`, yüzey-2 `#1F2C33`, çizgi `#2C3C45`, metin `#E8EEF1`, metin-2 `#9DB1BB`, vurgu `#4CC9BE` (üstündeki metin `#05201E`), doğru `#5DD28A`, yanlış `#FF8F85`, uyarı `#F2C14E`. Koyu tema açık temanın tersi değil, ayrı bir yüzey kademesidir. Saf siyah ve saf beyaz yok.

Mevcut indigo (`#4f46e5`) ve kahverengi "sepya" temaları bu önerinin dışında bırakılmıştır: indigo mor ailesine yakın, sepya üçüncü bir tema olarak kalabilir ama aynı rol adlarıyla yeniden eşlenir (aşağıdaki "Uygulama notları"). Gradyan, gölgeli kart yığını ve mor vurgu kullanılmaz; gölge yalnız yüzen öğelerde (çubuk, alt sayfa).

**Yazı**: sistem yazı tipi yığını (`system-ui`: SF Pro iPhone'da, Roboto Android'de). Ek yazı tipi indirmeye gerek yok; Türkçe glifler (ÇĞİÖŞÜ çğıöşü, I/İ/ı/i) sistem yazı tiplerinde tamdır.

| Rol | Boyut / satır | Ağırlık |
| --- | --- | --- |
| soru metni | 18 / 1,55 | 400, en çok 60ch |
| şık, açıklama, okuma gövdesi | 16 / 1,4 ve 1,6; özet ve konu okuması 18 / 1,7 | 400 |
| başlık (ekran) | 17 / 1,2; okuma başlığı 22 / 1,3 | 700 |
| meta, çip | 13 / 1 | 600 |
| sayılar (yüzde, süre, sayaç) | aynı | `font-variant-numeric: tabular-nums` |

**Boşluk (4 tabanlı)**: 4, 8, 12, 16, 20, 24. Sayfa kenar boşluğu 16, şıklar arası 10, grup içi 8, gruplar arası 16 ila 24. Köşeler: şık/kart 12, çip ve düğme hapı 999, alt sayfa üst köşe 20, çubuk 30, küçük öğe 8.

**Dokunma**: tüm etkileşimli öğeler `min-height: 44px; min-width: 44px`. Şık kartı 56 px, ana eylem 52 ila 56 px, oynat 52, genişletilmiş oynat 68.

**Hareket** (rutin 300 ms altı; `prefers-reduced-motion` ve Motion `reducedMotion="user"` ile kapanır): basma `scale(.96)` 120 ms; renk geçişi 200 ms `cubic-bezier(.2,0,0,1)`; alt sayfa 300 ms aynı eğri, aşağı çekme ile kapanır, kapanış 150 ms; ipucu çipi 150 ms girer, 1,6 sn sonra çıkar. Çubukta ve ders akışında giriş animasyonu yok.

## 4. Metin kuralı

Başlık, meta, liste satırı ve sonuç özeti en çok 2 satır, sonra üç nokta (`-webkit-line-clamp: 2`); üst çubuk başlığı ve alt sayfa başlığı 1 satır. **Tek istisna**: soru metni, şık metni, açıklama ve okuma gövdesi kesilmez, çünkü kesilmiş şıkla soru çözülemez. Bunun yerine 60ch ölçü ve serbest kaydırma kullanılır. Sürekli bilgi metni yoktur: simge düğmelerin adı `aria-label` ile verilir, ilk kullanımda ve basılı tutunca kısa ipucu çipi görünür (maket 2b).

## 5. Oynatıcı yeniden tasarım kararı

**Karar: iki katman.** Kapalı hâlde yüzen tek satırlık çubuk, açık hâlde alt sayfa. Yukarı çekme, çubuğun sağındaki "aç" düğmesi veya çubuğa dokunma sayfayı açar; aşağı çekme ya da "küçült" düğmesi kapatır.

**Kapalı çubuk (60 px)**: önceki, **seslendir/oynat** (yuvarlak, vurgu dolgu, 52 px), sonraki, ara, aç. Üst kenarda 3 px soru ilerleme çizgisi (bilgi metni yerine). Çalarken oynat simgesi duraklata döner (300 ms çapraz geçiş). Önceki/sonraki yalnız çalarken değil, her zaman soru gezintisidir.

**Alt sayfa**: tutamaç; başlık satırı (tek satır "Soru 12 okunuyor", altında konu adı, ikisi de tek satır) ve küçült düğmesi; iki parçalı ilerleme (Soru, Açıklama) ve süre; taşıma satırı (önceki, 68 px oynat/duraklat, sonraki); 4x2 simge ızgarası, her hücre 56 px yükseklik:

1. Soruyu oku (açık/kapalı)
2. Açıklamayı oku
3. Sesle cevapla (mikrofon)
4. Konuyu aç (kitap)
5. Durdur
6. Okuma hızı (`1,2×`, her dokunuşta bir sonraki hız; tek metinli hücre)
7. Otomatik ilerle (açık/kapalı)
8. Ayarlar

Açık/kapalı durumlar `aria-pressed` ve vurgu çerçevesiyle gösterilir. Ayarlar mevcut genel ayar çekmecesini açar.

**Eski kontrol eşlemesi**: seslendir → çubuk oynat; oynat → çubuk oynat; önceki/sonraki → çubuk; mikrofon, kitap/konu, durdur, ayarlar → sayfa ızgarası; arama → çubuk simgesi; ayarlar → sayfa.

**Gerekçe**: dokuz düğmenin tek satıra sığması için hepsi 32 px altına inmek zorundaydı; bu hem dokunma hedefini hem köşe kırpılmasını bozuyordu. Sık kullanılanlar (gezinme, oynat, ara) baş parmak bölgesinde ve tek satırda kalır; seyrek kullanılanlar bir dokunuş uzaklıkta, daha büyük hedeflerle.

## 6. Bileşen sözleşmeleri

**Üst çubuk**: 56 px, sol geri, orta iki satır (ders adı 17/700, alt satır ünite ve sayaç 13), sağ "Derse sor" simgesi. Altında 3 px ilerleme çizgisi.

**Meta**: yıl/sınav çipi; altında konu bağlantısı (numara + başlık, en çok 2 satır, vurgu rengi, sağda ok). Bağlantı konu anlatımını açar.

**Şık kartı**: harf rozeti (32 px daire), metin, sağda durum simgesi. Durumlar: varsayılan, seçili, doğru (yeşil çerçeve + onay), yanlış (kırmızı çerçeve + çarpı), soluk (diğerleri cevaptan sonra %70). Renk tek başına anlam taşımaz, simge de vardır.

**Açıklama kutusu**: başlıkta simge, "Açıklama" etiketi, sağda iki simge düğmesi (seslendir, derse sor); sol kenarda 4 px vurgu şeridi; gövde 16/1,6; kaynak satırı (ünite ve sayfa); en altta tam genişlik "Sonraki soru" (cevaplandıktan sonra tek birincil eylem).

**Alt sayfa (sheet)**: yüzey rengi, üstte 20 px köşe, tutamaç, perde `rgba(5,12,16,.5)`; `role="dialog"`, odak sayfaya girer, kapanınca çağıran düğmeye döner. Yükseklik: oynatıcı içeriğe göre, arama ve sohbet %88 ila %90.

**Arama paneli**: alt sayfa. Üstte başlık ve kapat; süzgeç çipleri (Sorular, Konular, Ünite özetleri, Yanlışlarım); sonuç sayısı ve ünite çipleri; sonuç listesi; **arama alanı en altta** (baş parmak bölgesi, klavyenin hemen üstü). Sonuç satırı: sınav ve konu çipi, en çok 2 satır özet, eşleşme `mark` ile. Boşken son aramalar.

**Sohbet çekmecesi**: alt sayfa. Başlıkta geçmiş, yeni sohbet, kapat. Mesajlar altta toplanır; bağlam çipi ("Soru 12 bağlamı", kaldırılabilir), hızlı öneri çipleri tek satır yatay; yazı alanı hapı (içinde sesli yazma) ve yanında canlı mod düğmesi; gönder düğmesi yazı varken canlı mod düğmesinin yerine geçer. Geçmiş ikinci katmandır: satır başlığı 2 satır, tarih ve ders; geçmişte arama altta. Canlı mod: tek odak daire, altyazı en çok 2 satır, mikrofon sessiz, bitir (kırmızı, büyük), ses ayarı.

**Liste satırı**: min 60 px, başlık en çok 2 satır, altında 6 px ilerleme şeridi, sağda tabular yüzde. Ünite satırı açılır liste (ok yönü durumu söyler). Segment: Konular | Yanlışlarım (sayı).

**Yanlışlarım**: yanlış sayısına göre sıralı konu satırı (kırmızı şerit, "5 yanlış"); süzgeç çipleri; altta tek birincil düğme "19 yanlışı çöz".

**Konu anlatımı**: okuma ölçüsü 60ch, 18/1,7; "Hatırla" kutusu uyarı rengi; aynı çubuk konuyu seslendirir.

**Özet adım adım**: üstte bölüm segmentleri (8 parça, geçilenler dolu), kapat ve bölüm listesi; bir bölüm bir ekran. Altta baş parmak bölgesinde: önceki (yuvarlak), **Sonraki bölüm** (geniş, birincil), seslendir (yuvarlak). Son bölümden sonra tamamlama ekranı: tek birincil eylem (üniteyi çöz) ve ikincil çerçeveli düğme.

## 7. Erişilebilirlik

Tüm simge düğmelerde `aria-label`; çubuk `nav` + `aria-label="Oynatıcı"`; ilerleme `role="progressbar"`; açık/kapalı düğmeler `aria-pressed`; "aç" düğmesi `aria-expanded`. Odak halkası 3 px vurgu, 2 px boşlukla. Kontrast (WCAG formülüyle hesaplandı): açık temada metin/zemin 15,2, metin-2/zemin 6,1, vurgu/yüzey 5,1, doğru/zemin 5,3, yanlış/zemin 5,4, uyarı/zemin 5,9; koyu temada en düşük çift 6,4 (metin-2/yüzey-2). vurgu/vurgu-zemin çifti 4,3 çıktığı için o zeminde `vurgu-metin` kullanılır. Kaydırılabilir alt sayfa içeriği klavye ve ekran okuyucuyla ulaşılabilir kalır; alt sayfa açıkken arka sayfa `inert`.

## 8. Tablet (600 px ve üstü)

Maketlerde yalnız telefon çözülmüştür; tablet kuralları: tek sütun okuma alanı en çok 680 px ortalı; oynatıcı çubuğu 420 px genişliğe sınırlanır ve ortalanır; alt sayfalar (oynatıcı, arama, sohbet) alttan değil sağ kenardan 420 px genişliğinde çekmece olur (mevcut `SohbetCekmece` zaten `swipeDirection` ile 768 px üstünde sağdan açılır); ünite listesi ve konu anlatımı yan yana iki bölme (320 px liste + okuma) olur. Bu davranışlar maketle sınanmadı.

## 9. Uygulama notları

- `QuizPlayer.astro` içindeki `.player-bar` yeniden yazılır: tek satır beş düğme, ikinci katman `Drawer` (Base UI, sohbet çekmecesinde olduğu gibi). Mevcut `btn-*` kimlikleri korunursa betik bağlantıları bozulmaz.
- `#toggleSearch` yüzen düğmesi ve `body:has(#quiz-player-bar.visible) #toggleSearch { display:none }` kuralı kaldırılır; arama çubuktaki simgeden açılır.
- `global.css` rol adları (`--bg-color`, `--card-bg`, `--primary-color`, `--correct-*`, `--incorrect-*`) korunur; yalnız değerler bu belgedeki tablolarla değişir. Sepya teması aynı rol adlarına eşlenir.
- Doğrulama: Playwright ile 375x812, 390x844, 430x932 ve 768x1024; `env(safe-area-inset-*)` Chrome'da DevTools cihaz benzetimiyle sınanır (maketlerdeki 47/34 px değerleri iPhone 14/15 yaklaşığıdır, gerçek cihazda sınanmadı).

## 10. Uygulama kabuğu (PWA, maket 07-12)

Ders sayfası dışındaki her ekran bir uygulama kabuğunun içindedir. Kabuk, telefonda alt sekme çubuğu ve büyük başlıklı üst alandan oluşur; ders sayfası (01-06) tam ekran görev ekranıdır, orada sekme çubuğu gizlenir ve tek sabit alt öğe oynatıcı çubuğudur (§1 kuralı korunur).

**Sekme çubuğu**: beş sekme, her biri en az 52 px yüksek: Ana sayfa, Derslerim, Ara, İlerleme, Ayarlar. Yükseklik `58px + env(safe-area-inset-bottom)`; içerik alt boşluğu `.kabuk` sınıfıyla aynı formülden gelir. Seçili sekme vurgu-metin rengi ve kalın çizgiyle, `aria-current="page"` ile belirtilir. Ara sekmesi 03 maketindeki arama alt sayfasını tam ekran açar. Tablette (600 px ve üstü) sekme çubuğu sol kenarda 80 px dikey raya dönüşür.

**Ekranlar**

- **07 Karşılama ve kurulum**: tek vaat cümlesi, "Okulunu seç" birincil, "Kayıtlarım başka cihazda" ikincil. Kurulum üç adımdır (üniversite, bölüm, dönem dersleri) ve atlanabilir; sonuç `favorite-courses` kaydına yazılır. Sitede hesap olmadığı için "giriş" ekranı kayıt getirme ekranıdır (7e): Google Drive, remoteStorage, GitHub (şifreli gist), yakındaki cihaz (parola) ve yedek dosyası, yani `google-esitle`, `rs-esitle`, `bulut-esitle`, `p2p-esitle` ve `yedek` modüllerinin birebir karşılığı.
- **08 Ana sayfa (Bugün)**: kaldığın yer kartı tek birincil eylemdir; altında "tekrar gereken" satırı ve Derslerim ilerlemesi. İlk günde boş istatistik yerine ilk soruya götüren kart (8b).
- **09 Derslerim ve Favoriler**: tek sekmede iki bölüm. Derslerim listesi sürükle-bırak ile sıralanır (`@dnd-kit`, alt çubuk düzenleyicisiyle aynı paket); dersi çıkarmak çözümleri silmez. Favoriler: bölümler ve işaretli sorular. Ders ekleme ekranı dönem çiplerini ve satır başına tek eylemi kullanır.
- **10 İlerleme**: dört ölçü kutusu (çözülen, son denemede doğru, üst üste iki kez doğru, tekrar gereken), ders ve ünite kırılımı, en çok yanlış yapılan konudan çözmeye geçiş. Boş durum ilk eyleme yönlendirir.
- **11 Ayarlar**: gruplar mevcut ayarlarla aynıdır (tema ve yazı boyutu, ses ve hız, `quiz-settings` anahtarları, eşitleme, yapay zekâ anahtarı); görünüm alt sayfasında seçim örnek metinde anında görünür; eşitleme ekranı `/yedek` sayfasının uygulama içi hâlidir; yapay zekâ anahtarının cihazdan çıkmadığı ekranda yazar.
- **12 PWA durumları**: iOS için üç adımlı "Ana ekrana ekle" alt sayfası (iOS kurulum istemi sunmaz; Android'de mevcut `beforeinstallprompt` akışı kullanılır), "Yeni sürüm hazır" bandı, çevrimdışı bandı ve satır bazında "bu cihazda hazır" bilgisi, suçlamayan 404 ekranı ve aynı ekranda arama.

## 11. Mevcut sistemle uyum ve eksikler (21 Kasım 2026 denetimi)

**Doğrudan karşılığı olanlar**: eşitleme yolları, favori bölüm ve ders kayıtları (`favorite-departments`, `favorite-courses`), çözüm kaydı (`quiz-progress-<ders>`: soru başına son iki sonuç), `quiz-settings` alanları (hız, otomatik ilerle, cevap ve açıklama gösterimi, yanlış şıkları gizle, süzgeçler), tema ve yazı boyutu, yapay zekâ sağlayıcı formu, ilk ziyaret turu, ders verisindeki dönem alanı (`semester`).

**Maket 02 ile canlı çubuk arasındaki fark**: canlı sitede alt çubuk kullanıcının seçtiği eylemlerden çizilir (`cubuk-duzeni`, `cubuk.ts`) ve menüden düzenlenir. 02'deki sabit beş düğme bunu korumak için şöyle uygulanır: oynat ortada sabit, iki yanında kullanıcının seçtiği ikişer eylem, sığmayanlar alt sayfa ızgarasına düşer; düzenleme modu menüde kalır.

**Yeni kayıt isteyenler** (uygulamadan önce `yedek.ts` birleştirme kuralına da eklenir):

- İşaretli sorular (9c): `isaretli-<ders>` anahtarı, soru kimliği listesi; `favorite-` gibi birleşim kümesiyle birleştirilir.
- Tarihli ilerleme: bugünkü kayıt yalnız son iki sonucu tutar, zaman bilgisi yoktur. Bu yüzden 10 numaralı maketlerde seri, günlük grafik ve çalışma süresi yoktur. Eklenmesi istenirse sonuçların yanına gün damgası yazılır (`[sonuç, gün]`), eski kayıtlar damgasız okunur.
- Kurulum seçimi (07): seçilen üniversite, bölüm ve dönem için `kurulum` anahtarı; ana sayfanın alt satırı buradan gelir.
- Güncelleme bandı (12b): `sw.js` önbellek adı sabit (`acik-ogretim-cache-v1`); her yayında sürümlenmeli ve `updatefound` dinlenmelidir, yoksa bant hiç görünmez.
- "Bu cihazda hazır" bilgisi (12b): servis çalışanı açılan sayfaları önbelleğe alır; satırdaki bilgi önbellekte ders sayfasının bulunup bulunmadığına bakarak yazılır. Dersi önceden indirme düğmesi istenirse servis çalışanına mesajla önbelleğe alma eklenir.

**Bulunan hata ve düzeltme**: ana sayfa test üniversitesini ("Test AÖF") canlıda listeliyordu, çünkü `index.astro` veriyi `getUniversities` süzgecinden geçirmeden okuyordu; süzgeç aynı kuralla ana sayfaya eklendi.
