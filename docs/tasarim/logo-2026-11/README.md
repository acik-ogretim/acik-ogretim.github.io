# Logo ve favicon, Kasım 2026

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
