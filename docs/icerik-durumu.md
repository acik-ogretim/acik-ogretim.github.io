# İçerik durumu

`/durum/` sayfası `public/durum.json` dosyasını okur. TanStack Table React adaptörü arama, sıralama, sütun süzgeçleri ve görünürlüğü, satır açma ve sayfalamayı yürütür. Aynı tablo telefonda kartlara dönüşür. Görünür sütunlar `durum-sutunlar` anahtarında yalnız tarayıcıda saklanır. Süzgeçler ve sıralama adrese yazılır. CSV bütün süzülmüş sonuçları içerir; tablo sayfasıyla sınırlanmaz.

## Veriyi yenileme

```sh
npm run durum:uret
node scripts/medya-bagla.mjs
node scripts/auzef-bagla.mjs --yukle
```

Üretici site `data/` ve `src/data/`, kardeş `ders-kitaplari` ve `auzeff-tui` klonlarını okur. Kitap klasörü `KITAP_DIZINI`, üretim klasörü `URETIM_DIZINI` ile seçilir. `medya-bagla` yayımlanmış YouTube kimliklerini bağlar, video yüklemez. `auzef-bagla` mevcut ses ve videoları içerik karmalı adlarla medya sunucusuna taşır, yayında bulunan dosyayı yeniden göndermez ve yalnız 200 dönen bağlantıyı kaydeder. Üretilen JSON dosyaları kaynak dosyalar değiştikten sonra yeniden üretilip commit edilir; GitHub derlemesi kardeş özel klonları gerektirmez.

Kitap sayısı gerçek MDX ünitelerinden gelir; yalnız içindekiler listesi ayıklanmış kitap sayılmaz. Özet ve çalışma kitabı, etkinlik ve özet dosyalarından; yazılı anlatım oda ve senaryo dosyalarından; ses ve döküm medya sözleşmesinden; çıkmış soru sayıları yalnız `source=cikmis-soru` kayıtlarından gelir. Deneme, soru bankası ve kitap sonu soruları çıkmış sınava katılmaz. Aynı soru birden fazla sınavda geçse de toplamda bir kez sayılır. Vize ve final sayılarında ilgili sınavda görünen benzersiz soru sayısı kullanılır.

Bir üniteye ait dosyanın bulunması içerik kalitesinin onayı değildir. Kaynak yoksa `veri yok`, taranmış kaynakta kayıt yoksa `yok`, bilinen toplamdan az ünite varsa `kısmi` yazılır. Beklenen ünite sayısı bilinmediğinde tamamlanma oranı üretilmez. Soru açıklamaları açıklamalı çıkmış soru / toplam çıkmış soru olarak sayılır. Son güncelleme kaynak dosyasının git tarihidir; envanterin üretim saati ayrıca gösterilir. Son 14 gündeki eklemeler git ekleme kayıtlarından gelir. Önceki bir dosyanın içeriğine eklenen maddeler son güncellemede görülür; yeni dosya gibi sayılmaz.

## Doğrulama

```sh
npx vitest run
npx tsc --noEmit
npx astro check
npm run build
DURUM_DIST=dist npm run test:e2e:durum
```

Yerel Chrome kullanılacaksa `PW_CHROMIUM_PATH` verilir. Ekran görüntüleri `/tmp/durum-ekran/` altındadır. Tam derleme için disk yeterli değilse `ONIZLEME_BOLUMLERI` ile önizleme yapılır; canlı tam derleme GitHub Actions kanıtıyla ayrıca doğrulanır. Şema testi her çalışma odası paketini oynatıcının gerçek şemasıyla denetler.
