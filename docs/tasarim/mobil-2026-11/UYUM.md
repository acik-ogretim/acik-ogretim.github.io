# Tasarımın mevcut koda uyumu: açıklar ve kararlar (21 Kasım 2026)

Tasarım uygulanmadan önce kod ve veri tek tek okundu. Amaç uygulama sırasında yama yapmamak: her açık ya tasarımı koda uydurarak ya da koda tek seferlik bir altyapı adımı ekleyerek kapatılır. Bu belge `PLAN.md`'nin önündedir; çelişkide bu geçerlidir.

## 1. Renk ve tema altyapısı

**Bulgu**: tema `data-theme` ile üç değerdir (light, dark, sepia) ve 14 rol değişkeni taşır (`--bg-color`, `--card-bg`, `--text-color`, `--text-color-muted`, `--border-color`, `--button-bg`, `--primary-color`, `--correct-*`, `--incorrect-*` ve hover hâlleri). Tasarımın istediği dört rol kodda yok: vurgu metni (zemin üstünde bağlantı rengi), vurgu zemini (seçili çip), uyarı ve uyarı zemini. `--color-primary-dark` ve `-light` her temada elle yazılmış.

**Bulgu**: rol değişkenlerini atlayan sabit renkler çok. Kaynakta 76 `text-white`, 68 `text-slate-400`, 44 `text-teal-400`, 40 `bg-slate-800` var; en çok `rehber.astro` (263), `Layout.astro` (127), `AIMenu.astro` (59), `index.astro` (48) ve ders sayfası (37). `global.css` içinde 93 ham onaltılık renk var. Site başlığı, ayar penceresi (`.yz-ayar-koyu`, "temadan bağımsız hep koyu") ve rehber bu yüzden temayla değişmez.

**Karar**: önce altyapı adımı. (1) Dört eksik rol eklenir: `--primary-text` (zemin üstü bağlantı), `--primary-soft` (seçili çip), `--warning`, `--warning-bg`; `--color-primary-dark/-light` `color-mix` ile türetilir. (2) Sabit Tailwind renkleri rol sınıflarına çevrilir (`text-muted-theme`, `bg-card-theme` gibi mevcut sınıflar genişletilir); `.yz-ayar-koyu` kaldırılır, ayar penceresi temayı izler. (3) Tema 17 değerleri bu rollere yazılır. Sepya aynı rollerle kalır. Bu adım bitmeden ekran çalışmasına başlanmaz; aksi hâlde her ekranda renk yaması gerekir.

## 2. Başlık ve gezinme

**Bulgu**: iki başlık sistemi var. Site geneli `Layout.astro` başlığı (marka, üniversite bağlantıları, tema düğmeleri, telefonda açılır menü) ve yalnız ders sayfasındaki `MobilMenu.tsx` (kaydırınca gizlenen üst çubuk, ünite seçici, menü alt sayfası, alt çubuk düzenleme). Tasarımdaki beş sekmeli alt çubuk hiçbirinde yok.

**Karar**: sekme çubuğu yeni bir bileşen olarak eklenir ve yalnız telefon genişliğinde, ders sayfası dışındaki sayfalarda görünür. Ders sayfasında `MobilMenu` ve oynatıcı çubuğu kalır (tek sabit alt öğe kuralı). Site başlığı telefonda sadeleşir (marka ve arama simgesi); üniversite bağlantıları ve tema düğmeleri Ayarlar sekmesine taşınır. 768 px üstünde mevcut başlık kalır.

## 3. Ders sayfası: tek soru değil, uzun liste

**Bulgu**: ders sayfası dersin bütün sorularını ünite bölümleri (`#unite-N`) hâlinde tek sayfada listeler; üstte yapışkan ünite şeridi (`btn-unit-nav`), anlık soru `IntersectionObserver` ile izlenir (`currentIndex`). Varsayılan okuma kipidir: cevap ve açıklama açık gelir (`showAnswers: true`); "İnteraktif çözüm modu" (`btn-toggle-interactive`) açılınca şıklar seçilir, sonuç `quiz-progress-<ders>` kaydına yazılır.

**Açık**: 01 maketi tek soru ekranı, "Soru 12 / 40" sayacı ve "Sonraki soru" düğmesi çiziyor; bu yapı kodda yok ve SEO için tek sayfada liste gerekli.

**Karar**: tasarım listeye uyar. Soru kartı listede tekrarlanan bileşendir; üst çubuk anlık soruyu (`currentIndex`) "Ü 4 · 12 / 40" olarak gösterir; ünite şeridi kalır. "Sonraki soru" düğmesi kalkar, etkileşimli kipte cevaptan sonra liste kendiliğinden bir sonraki karta kayar (mevcut otomatik ilerle ayarı). Okuma ve Çözme kipi ders sayfasının üstünde iki parçalı seçicidir. Maket: 20a, 20b.

## 4. Veri kapsamı

**Bulgu** (veri klasörleri sayıldı): katalogda 10.988 ders, soru dosyası 3.910 ders (dört üniversite); yaklaşık 920 bin soru, %65'i açıklamalı. Kitap konu ağacı (`data/konular`) yalnız 6 derste (Atatürk). Ünite adları 591 derste (`src/data/kitap-unite-adlari.json`). Ünite özetleri (`data/ozetler`) 1 derste. Video özetleri 25 derste. `ders-icerik` dosyaları konu metni değil, sınav yılları taşır (`kod`, `yillar`, `son_yil`, `guncel`).

**Açık**: 05 (konu yüzdeleri, konu anlatımı), 06 (adım adım özet) ve 16a (video ve döküm) derslerin büyük kısmında boş kalır. Açıklamasız %35 soru için durum çizilmemiş.

**Karar**: her ekran en düşük ortak veriyle çizilir, fazlası varsa açılır. Ünite düzeyi her derste vardır, konu düzeyi yalnız konu ağacı olan derste görünür; özet ve video düğmeleri veri yoksa hiç çıkmaz (boş ekran yerine). Açıklamasız soruda açıklama kartı yerine "Açıklama yok · Yapay zekâ ile açıkla" satırı gelir (mevcut `AIMenu` ve anahtar varsa). Maket: 20c.

## 5. Ayarlar

**Bulgu**: ayar penceresi (`#global-settings-modal`) soru süzgeçlerini de taşır: soru türü (yanlışlar, cevaplanmamışlar), kaynak, sınav, ünite süzgeci; cevapları göster, açıklamaları göster, yanlış şıkları gizle, otomatik ilerle; ses modeli, okuma hızı, sesi dene; yapay zekâ zenginleştirme ve sağlayıcı formu.

**Açık**: 11 maketinde süzgeçler ve ses deneme yok; süzgeçler ders bağlamlıdır, genel ayar sekmesine konamaz.

**Karar**: ikiye ayrılır. Ders bağlamlı süzgeçler ders sayfasında "Süzgeç" alt sayfası olur (kaynak, sınav, ünite, yanlışlar, cevaplanmamışlar); genel tercih ayarları Ayarlar sekmesinde kalır. Ayar anahtarları (`quiz-settings` alanları) değişmez. Maket: 20d.

## 6. Arama

**Bulgu**: arama ders içidir (`#searchPanel`, `#searchInput`, sayaç); dersler arası soru araması yok. 920 bin soruyu tarayıcıda taramak olanaksız.

**Karar**: Ara sekmesi ders ve bölüm kataloğunda arar (10.988 ders adı, sıkıştırılmış küçük bir JSON). Soru araması ders içinde kalır. Dersler arası soru araması istenirse statik dizin (Pagefind gibi) ayrı bir altyapı adımıdır. Maket: 20e.

## 7. Keşif sayfaları

**Bulgu**: bölüm sayfası dersleri döneme göre gruplar; alan içi ve alan dışı seçmeli havuzlar ile birden fazla yabancı dil seçeneği katlanmış blokta durur. Üniversite sayfası bölümleri dereceye göre gruplar (lisans, ön lisans, lisans tamamlama, uzem); pasif programlar kendi grubunda kalır.

**Açık**: 07c ve 09d maketlerinde seçmeli havuz ve pasif program yok.

**Karar**: ders ekleme ve kurulum ekranları dönem içinde "Seçmeli havuz" katlanır satırını ve "Pasif program" etiketini taşır; veri yapısı aynen kullanılır.

## 8. Kişisel kayıtlar

**Bulgu**: `quiz-progress-<ders>` soru başına son iki sonucu tutar, tarih tutmaz; `favorite-departments`, `favorite-courses` var; okul ve dönem seçimi, işaretli soru ve gün damgası yok. `yedek.ts` birleştirme kuralları yalnız ilerleme ve favorileri tanır.

**Karar**: üç yeni anahtar tek adımda eklenir ve `yedek.ts` kurallarına girer: `kurulum` (okul, bölüm, dönem), `isaretli-<ders>` (soru kimlikleri, birleşim), ilerleme kaydında `[sonuç, gün]` (eski kayıt damgasız okunur). İlerleme ekranındaki seri ve günlük grafik bu adımdan sonra açılır.

## 9. Ders sayfasının üst bölümü

**Bulgu**: ders sayfasının başında içerik kartları var: sınav yılları (`ders-icerik`), video özetleri (`YouTubeVideolari`), materyaller bağlantısı, tartışma ve hata bildirimi (`Tartisma`).

**Açık**: maketlerde dersin giriş bölümü yok.

**Karar**: ders girişi tek kart: ders adı, kod, sınav yılları çipleri, kaynak satırları (Materyaller, Video özeti varsa, Tartış). Maket: 20a'nın üst kısmı.

## 10. Uygulama sırası (PLAN.md §3'ün yerine)

1. **Tema altyapısı**: eksik roller, sabit renklerin rol sınıflarına çevrilmesi, `.yz-ayar-koyu`'nun kalkması, tema 17 değerleri. Sınama: üç temada bütün sayfaların ekran görüntüsü.
2. **Ders sayfası**: liste kartı, kip seçici, üst çubuk sayacı, açıklamasız soru durumu, süzgeç alt sayfası, oynatıcı (iki katman, `cubuk-duzeni` korunur).
3. **Kabuk**: sekme çubuğu (ders sayfası dışında), sade telefon başlığı, Ayarlar sekmesi.
4. **Keşif ve Derslerim**: seçmeli havuz, pasif program, favori ve sıralama.
5. **Kayıt ekleri**: `kurulum`, `isaretli-<ders>`, gün damgası, `yedek.ts`.
6. **İlerleme ve Ara**: kayıtlardan ölçüler, katalog araması.
7. **Veri gelince**: konu düzeyi, özet okuyucu, video ve döküm.
