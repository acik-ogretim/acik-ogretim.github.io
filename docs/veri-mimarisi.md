# Veri mimarisi: ders paketi

Bu belge, bir dersin bütün içeriğinin (kitap metni, konu anlatımı, kavramlar, çıkmış sorular, videolar, sesler ve dökümler) tek bir JSON düzeninde nasıl tutulduğunu, kimin nasıl düzenlediğini ve kullanıcı katkılarının nasıl alındığını anlatır. Şema: `src/lib/ders-paketi/sema.ts` (Zod). Kararlar Zeki'nin 21 Kasım 2026 akşamki istekleridir: "JSON'larla güzel, eksiksiz bir yapı kur", "ajan bu yapıyı düzenleyebilmeli, ekleme yapabilmeli", "kişiler isterse bağışlayabilmeli".

## Neden tek düzen

21 Kasım'a kadar aynı veri dört ayrı biçimde üretiliyordu: konu dosyaları (`public/konu/<uni>/<ders>/<no>.json`), çalışma odası paketi (`src/data/calisma-odasi/<ders>.json`, konu metni burada ikinci kez), ünite soru uçları (`/calisma/<ders>/sorular-<n>.json`) ve çevrimdışı dosyası (`/veri/<uni>/<ders>.json`). Her yeni özellik bir biçim daha ekliyordu. Bundan sonra her tüketici (ders sayfası, çalışma odası, çevrimdışı indirme, yazdırma, Quiz Time içe aktarma, MCP ve WebMCP araçları) yalnız aşağıdaki paketi okur. Eski biçimler paket hazır olunca kaldırılır.

## Dosya düzeni

Derlemede `public/ders/<uni>/<ders>/` altına yazılır ve sitede `/ders/<uni>/<ders>/` adresinden okunur. Yolları her yerde `paketDosyalari` üretir, elle yol yazılmaz.

**`index.json` (DersDizini)**: küçük ve ilk okunan dosya. Ders adı, kodu, dönemi; ünite listesi (konu kimlikleri ve soru sayısı); kitap sırasıyla konu özeti (başlık, üst konu, soru ve kavram sayısı, çalışma malzemesi var mı, konunun hangi medyada hangi saniyeler arasında geçtiği); medya listesi (YouTube ya da ses, kısa özet, uzun anlatım, soru çözümü, ünite, süre, döküm dosyası); paketteki bütün dosyalar ve boyutları (çevrimdışı indirme listesi); içerik karması `surum` (çevrimdışı kopya bununla güncelliğini anlar).

**`konu/<id>.json` (KonuDosyasi)**: bir konunun her şeyi. Kitap metni (`kitap.html`, sayfa), çalışma malzemesi (`calisma`: özet, temel noktalar, sebep-sonuçlar, örnekler, benzetmeler, mini test, üzerine düşün soruları; listeler serbest uzunlukta, boşsa hiç yazılmaz), konuda geçen kavram kimlikleri, konunun soru kimlikleri, medya anları, önceki ve sonraki konu, ilişkili konular (kavram, öncül, devam, benzer).

**`unite/<n>.json` (UniteSorulari)**: ünitenin bütün soruları tam hâliyle, her biri ait olduğu konunun kimliğiyle (`konu`). Ders sayfası ve çalışma odasının Sınav ve Konu konu görünümleri bunu okur. Sorular HTML'e gömülmez (Zeki, 21 Kasım: arama motoru önceliği yok).

**`kavramlar.json` (KavramSozlugu)**: kavram kimliği (terimden üretilen kısa ad), terim, tanım, tanımlandığı konu ve geçtiği bütün konular (geri bağlantılar).

**`medya/<id>.json` (MedyaDokumu)**: bir video ya da sesin zamanlı dökümü; her satırda başlangıç ve bitiş saniyesi, konuşmacı, metin, konu kimliği, atama güveni (0-1) ve soru çözüm videolarında okunan sorunun kimliği.

**Kimlikler**: konu kimliği kitaptaki numaradır ("1.3.2"); ünite sayıdır; kavram ve medya kimliği `kimlikYap` ile üretilen kısa addır. Soru kimliği soru bankasındakidir.

## Kaynak ve üretim

Paket bir derleme çıktısıdır; elle düzenlenen kaynaklar şunlardır:

**Kitap ve çalışma malzemesi**: `acik-ogretim/ders-kitaplari` deposu (MDX, `kitap/etkinlik/unite-NN.json`).
**Soru bankası**: bu depoda `data/questions/<uni>/<ders>.json`; ileride `acik-ogretim/acik-ogretim-veri` deposuna taşınacak.
**Medya ve dökümler**: `auzeff-tui` deposu (`data/ata-aof/yayin/dokum/`), ses dosyaları medya sunucusunda (`medya.zeki.website`).
**Ek veriler ve katkılar**: `data/ders-paketi/<uni>/<ders>/ek/*.json` (aşağıda "Düzenleme").

Üretici betik kaynakları birleştirir, Zod ile doğrular, `public/ders/...` altına yazar ve `npm run paket:denetle` raporunu çıkarır (eksik konu anlatımı, sorusuz konu, konusuz soru, dökümde düşük güvenli satırlar, kırık bağlantı). Doğrulamadan geçmeyen paket yayımlanmaz.

## Düzenleme: ajanlar ve geliştiriciler

Paket dosyaları elle düzenlenmez; düzeltme kaynakta ya da ek dosyalarında yapılır ve paket yeniden üretilir. Ek dosyaları kaynağın üstüne uygulanan küçük değişikliklerdir, her biri tek bir şeye dokunur:

```json
{ "v": 1, "hedef": { "tur": "konu", "id": "1.3.2" },
  "islem": "duzelt", "alan": "calisma.ornekler", "deger": ["..."],
  "gerekce": "kitap s. 14", "katki": { "ad": "Zeki", "kaynak": "ajan", "tarih": "2026-11-21" } }
```

`tur` konu, soru, kavram ya da medya satırıdır; `islem` ekle, duzelt ya da kaldir. Ajanlar için komut satırı (yapılacak): `npm run paket -- duzelt konu 1.3.2 calisma.ozet "..."`, `npm run paket -- ekle kavram ...`, `npm run paket -- denetle sosyolojiye-giris`. Komut ek dosyasını yazar, paketi yeniden üretir ve Zod ile doğrular. MCP araçları (sitenin `src/lib/ajan-araclari.ts` kalıbı ve Quiz Time'ın `/mcp` uç noktası) aynı işlemleri `paket_oku`, `paket_oneri_yaz` adlarıyla sunar.

## Katkı bağışı: kullanıcılar

Okuyan herkes bir konuya örnek, bir soruya açıklama, bir kavrama daha iyi tanım ya da bir hatanın düzeltmesini bağışlayabilir. Akış:

1. **Öneri**: konu, soru ya da kavram kartındaki "Katkı ver" düğmesi bir form açar; form önerinin yerini (hedef ve alan) kendisi doldurur. Tarayıcıdaki yapay zekâ asistanı ya da WebMCP ajanı da aynı öneriyi yazabilir (yalnız öneri; doğrudan yayın yok). Öneri önce bu cihazda saklanır.
2. **Gönderim**: "Gönder" iki yoldan birini kullanır. Hesapsız yol: önerinin JSON'u önceden doldurulmuş bir GitHub issue formu olarak açılır (sitede hata bildirme için kullanılan kalıp). Hesaplı yol ileride: küçük bir Worker (sayaç Worker'ı gibi) öneriyi bot hesabıyla `acik-ogretim-veri` deposuna PR olarak açar; kötüye kullanıma karşı Turnstile ve hız sınırı.
3. **Denetim**: her öneri ek dosyası olarak gelir; otomatik denetim şemayı, kaynağa uyumu (kitapta dayanağı var mı) ve yinelenmeyi Gemini ile ön değerlendirir; insan onayıyla birleşir. Onaylanan katkı paketin bir sonraki üretiminde yayına çıkar.
4. **Teşekkür**: katkı veren isterse adı (ya da takma adı) katkının yanında ve ders sayfasındaki "Katkı verenler" listesinde görünür; istemezse anonim kalır. Kişisel veri (e-posta vb.) pakete yazılmaz.

## Uygulama sırası

1. Şema ve bu belge (bitti).
2. Üretici betik ve `public/ders/` çıktısı; önce `ataturk-aof/sosyolojiye-giris`.
3. Çalışma odası, ders sayfası ve çevrimdışı indirmenin pakete geçmesi; eski biçimlerin kaldırılması.
4. Ajan komut satırı ve MCP/WebMCP öneri araçları.
5. Katkı formu, GitHub issue yolu, sonra Worker ile PR yolu.
