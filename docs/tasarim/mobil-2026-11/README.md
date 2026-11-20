# Mobil öncelikli arayüz tasarım önerisi (Kasım 2026)

Canlı kod değişmedi; yalnız tasarım çıktısı.

- `DESIGN.md`: renk, yazı, boşluk belirteçleri, bileşen sözleşmeleri, oynatıcı yeniden tasarım kararı, güvenli alan kuralı, tablet notları, uygulama notları.
- `ortak.css`: maketlerin ortak belirteçleri ve bileşenleri (açık ve koyu tema, `data-tema="koyu"`).
- Maketler (her dosyada birden çok durum yan yana; tarayıcıda açın):
  1. `01-soru-cozme.html`: cevaplanmamış, cevaplanmış, koyu tema çalarken
  2. `02-oynatici.html`: kapalı çubuk, genişletilmiş alt sayfa, koyu
  3. `03-arama.html`: klavyeyle yazarken, boş, koyu
  4. `04-sohbet.html`: sohbet, geçmiş, canlı mod
  5. `05-unite-konu-yanlislar.html`: ünite/konu listesi, yanlışlarım, konu anlatımı
  6. `06-ozet-okuma.html`: adım adım özet, tamamlama, koyu
- `onizleme/`: her kareden 390x844 PNG ekran görüntüsü (Playwright + Chrome).

## Araçlar

Maketler elle yazılmış HTML ve CSS'tir (Tailwind CDN yok, ağ gerektirmez). Stitch (suru `design_*`) de denendi: proje `6122307043301883512`, ekranlar `d08a75af6cd24af8a15dbab0181389f0` (soru çözme) ve `4e22817a04d948dfa07c42e650e23a36` (oynatıcı). Stitch çıktısı yalnız ilham referansıdır: üretilen soru metni ve içerik gerçek değildir, ikinci ekran koyu tema ve sınav bağlamını kendi uydurdu. Stitch PNG'leri araç yalnız base64 döndürdüğü için depoya alınmadı. Kanonik tasarım bu klasördeki maketlerdir.

Maket cihaz benzetimi (çentik, 47 px üst ve 34 px alt güvenli alan) gerçek `env(safe-area-inset-*)` yerine sabit değerdir; gerçek cihazda sınanmadı.
