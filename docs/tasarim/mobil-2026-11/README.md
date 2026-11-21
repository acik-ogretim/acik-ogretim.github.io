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
  7. `07-karsilama-giris.html`: karşılama, üç adımlı kurulum, kayıt getirme (giriş)
  8. `08-ana-sayfa.html`: Bugün ekranı, ilk gün, koyu
  9. `09-derslerim-favoriler.html`: Derslerim, düzenleme, favoriler, ders ekleme
  10. `10-ilerleme.html`: genel ölçüler, ders ayrıntısı, boş durum
  11. `11-ayarlar.html`: ayarlar, görünüm, eşitleme, yapay zekâ anahtarı
  12. `12-pwa-durumlar.html`: ana ekrana ekle, güncelleme ve çevrimdışı, 404
  13. `13-renk-secenekleri.html`: şimdiki deniz yeşili ve dört aday palet (mürekkep ve fosforlu kalem, okul rengi, kobalt, gece ve kehribar)
  14. `14-ios-cam.html`: iOS 26 tarzı cam deneme (yüzen kapsül sekme çubuğu, cam oynatıcı, kenardan ayrık alt sayfa)
- `index.html`: tüm maketlerin listesi; her maketin sol üstündeki düğme buraya döner.
- `uret_uygulama.py`: 07-12 maketlerini üretir (`python3 uret_uygulama.py`).
- `onizleme/`: her kareden 390x844 PNG ekran görüntüsü (Playwright + Chrome).

## Araçlar

Maketler elle yazılmış HTML ve CSS'tir (Tailwind CDN yok, ağ gerektirmez). Stitch (suru `design_*`) de denendi: proje `6122307043301883512`, ekranlar `d08a75af6cd24af8a15dbab0181389f0` (soru çözme) ve `4e22817a04d948dfa07c42e650e23a36` (oynatıcı). Stitch çıktısı yalnız ilham referansıdır: üretilen soru metni ve içerik gerçek değildir, ikinci ekran koyu tema ve sınav bağlamını kendi uydurdu. Stitch PNG'leri araç yalnız base64 döndürdüğü için depoya alınmadı. Kanonik tasarım bu klasördeki maketlerdir.

Maket cihaz benzetimi (çentik, 47 px üst ve 34 px alt güvenli alan) gerçek `env(safe-area-inset-*)` yerine sabit değerdir; gerçek cihazda sınanmadı.
