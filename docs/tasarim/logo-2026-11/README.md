# Logo ve favicon, Kasım 2026

## Tur 2 (21 Kasım 2026): tema 17 mavisi, yeni simge

Teal ve "üç çubuklu kitap" simgesi kullanıcı tarafından beğenilmedi (eski daire içinde kitap simgesi daha okunaklıydı). Tur 2'de tema 17 renkleriyle (`#2563B8` zemin, `#FCFCFB` biçim, `#7AB0F2` ikinci ton) 14 yön elle SVG olarak çizildi ve açık ve koyu zeminde 150, 64 ve 16 px'te karşılaştırıldı (`tur-2/karsilastirma-paftasi.jpg`). Nano Banana'dan iki simge paftası alındı (`tur-2/nano-banana/`); çıktı doğrudan simge olmadığı için yalnız fikirler (soru işaretli kitap, balon ve kitap, yarısı konuşma balonu olan kitap) alınıp elle temiz geometriyle yeniden çizildi. Kaynak SVG'ler `tur-2/svg/`.

Elenenler: **e yol ve ufuk** (tuvalet levhasına benziyor), **c A monogramı** (çadır gibi okunuyor), **d sayfalar** ve **h kart ve onay** (genel belge simgesi), **f kitap sırtları** (16 px'te bulanık), **b soru işaretli kitap (mavi sayfalı)** ve **l halka** (yerine b2 ve a2 var), **m kitap ve nokta** (anlamı belirsiz).

Seçilen üç aday (`tur-2/en-iyi-3.jpg`):

1. **b2 Soru işaretli açık kitap (uygulandı)**: ürünün iki işi, ders kitabı ve soru bankası, tek bakışta. 16 px'te soru işareti ve kitap sırtı ayrı okunuyor; mavi zeminde açık ve koyu sayfa arka planında kenar kaybetmiyor. Tek ton biçim, gradyan ve gölge yok.
2. **a2 İki tonlu açık kitap**: eski simgenin sadeliğine en yakın yön; sol sayfa `#7AB0F2`. 16 px'te okunaklı ama soru bankası vurgusu yok, genel bir "kütüphane" simgesi.
3. **n Sayfa ve konuşma balonu**: sol sayfa konuşma balonu, yapay zekâ sohbeti ile kitabı birleştiriyor. 16 px'te okunuyor, ama balon ağırlığı mesajlaşma uygulamasını çağrıştırıyor.

## Uygulama

`public/` altında: `favicon.svg` ve `logo.svg` (aynı SVG, yuvarlatılmış kare, saydam köşe), `favicon-32.png`, `logo-120.png`, `og-logo-512.png` (saydam köşeli), `apple-touch-icon.png` (180, tam kare opak zemin, iOS köşeyi kendisi keser), `android-chrome-192x192.png` ve `android-chrome-512x512.png` (tam kare zemin, biçim güvenli alanın içinde: maskable). `manifest.json`: maskable simgeler, `purpose: any` için `og-logo-512.png`, zemin ve tema rengi `#151515`. Saydam PNG'ler doğrudan SVG'den `rsvg-convert` ile üretildi; Codex gerekmedi. Yedekler: `favicon-eski.svg`, `apple-touch-icon-eski.png` (dokunulmadı).

---

## Tur 1 (20 Kasım 2026, teal; terk edildi)

Yön: ana vurgu teal `#0A7C76` (docs/tasarim/mobil-2026-11/DESIGN.md), tek ya da iki renk, gradyan ve mor yok, 512 birimlik kare tuval, yuvarlatılmış kare kap.

## Kavramlar (kavramlar/)

- **k1 Açık kitap ve ses dalgası**: sitenin iki işi, okumak ve dinlemek. Beş çubuk 16 px'te el gibi okundu; r1'de üç çubuğa indirildi.
- **k2 A monogramı**: sol bacak ile sağ bacak arasında açıklık. Tepedeki nokta 16 px'te leke oldu, elendi.
- **k3 Kapı ve eşik**: "açık öğretim" imgesi. Küçükte at nalı ya da mıknatısa benziyor, elendi.
- **k4 Soru balonu ve onay**: çıkmış soru ve yapay zekâ sohbeti. 16 px'te en net kavram; r2 olarak rafine edildi. Mesajlaşma uygulaması simgelerine benzediği için markaya özgü değil.
- **k5 Yörünge ve ilerleme**: 16 px'te okunur ama genel bir "yükleniyor" simgesi gibi.

Paftalar: `pafta-1.png` (beş kavram), `pafta-2-rafine.png` (r1 ve r2), her biri açık ve koyu zeminde 16, 32, 64, 120 ve büyük boyutta; `*-16px-buyuk.png` 16 px'i piksel piksel büyütür. Yazı kullanılmadığı için Türkçe karakter sorunu yoktur.

## Jüri

- **Marka tasarımcısı**: r1 siteye özgü (kitap + ses); r2 daha net ama jenerik. Teal zemin ve beyaz biçim DESIGN.md ile uyumlu.
- **Erişilebilirlik uzmanı**: beyaz / `#0A7C76` kontrastı yaklaşık 5,2:1; her iki kavram açık ve koyu zeminde kenar kaybetmiyor. Küçük boyutta r1'in ses çubukları incelir, bu yüzden favicon için çubukları kalınlaştırılmış küçük varyant çizildi.
- **Öğrenci gözü**: r1 "ders kitabı + dinle" diye tanınıyor, r2 "mesaj geldi" diye okunuyor.

## Seçim: r1, açık kitap ve ses dalgası

Sitenin ayırt edici sözü okuma ve sesli dinlemeyi birleştirmesi; r2 16 px'te biraz daha güçlü ama her uygulamada olabilir. Yedek: r2 (`kavramlar/r2-soru-onay.svg`).

## Üretilen dosyalar (public/)

`logo.svg`, `favicon.svg` (kalın çubuklu küçük varyant), `favicon-32.png`, `apple-touch-icon.png` (180, tam kare zemin; iOS köşeyi kendisi keser), `logo-120.png` (Google OAuth onay ekranı), `og-logo-512.png`. Yedekler: `favicon-eski.svg`, `apple-touch-icon-eski.png`. `Layout.astro` içine 32 px PNG bağlantısı eklendi; SVG ve apple-touch yolları aynı kaldı. `android-chrome-*` ve manifest simgeleri bu işte değişmedi.
