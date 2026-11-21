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

Diğer üniversiteler (AUZEF, Anadolu, Ankara) MDX'leri üretildikçe aynı hatta girer.
