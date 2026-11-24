# Bekleyen değişikliklerin denetimi

24 Kasım 2026. Kart: C-b5f1789a. Denetleyen oturum: c0898ac5-be6c-4694-8e42-1300efef1811.

## Doğrulanmış durum

Denetimin başında 63 dosya bekliyordu: 53 dosya indekste, 5 izlenen dosya değiştirilmiş, 5 dosya izlenmiyordu. Uyarıdaki 61 sayısı güncel sayımla örtüşmedi. `git fetch origin` sonrasında `git rev-list --left-right --count HEAD...origin/main` çıktısı `0 0` idi. Başlangıç commit'i `9d1bea8c`. `git log @{u}..HEAD` ve `git ls-files --unmerged` boştu.

## Sahiplik ve kapsam

Bu dosyalar oturum başlamadan önce vardı. Denetim sırasında içerikleri ve indeks kayıtları korundu. Yerel oturum kaydı, Sürü kartları ve arşivler dahil Mac oturum listesi tarandı; aşağıdaki dosyalar için kesin bir sahiplik kaydı bulunamadı.

| Dosyalar | Durum ve sahiplik |
| --- | --- |
| `agent_texts/` altındaki 53 ekleme | Altı dersin ünite metinleri. Önceden indekse eklenmiş, sahibi teyit bekliyor. |
| `scripts/generate_agent_text.ts` | Aynı altı ders için üretici değişikliği. Metinlerle ilişkisi koddan doğrulandı; sahibi teyit bekliyor. |
| `scripts/sync-anadolu-raw.ts`, `scripts/utils/clean-html.ts` | Soru aktarımı ve HTML temizleme değişiklikleri. Sahibi teyit bekliyor. |
| `data/questions/anadolu-aof/3b-tasarim-ve-modelleme.json` | 120 sorunun 35 mevcut açıklaması boşaltılmış. Anadolu soruları işi C-10422dc2 ile kapsam benzerliği var; bu dosyanın sahipliği doğrulanmadı. |
| `data/courses/auzef/cocuk-gelisimi.json` | 54 automationId değişikliği. Kaynak sistemle doğrulama ve sahiplik teyit bekliyor. |
| `data/questions/auzef/donem-1/{anatomi,bilimsel-arastirma-teknikleri,psikoloji}.json` | Üç yeni soru dosyası. Sahibi ve aktarımın tamamlanma durumu teyit bekliyor. |
| `data/questions/auzef/donem-8/cocuk-gelisimi-uygulamalari-ii.json` | Yeni soru dosyası. Sahibi ve aktarımın tamamlanma durumu teyit bekliyor. |
| `Users/wildgenie/Projects/acik-ogretim-portal/.tanstack-projected-ef1afb10f5df9a1d` | Sıfır baytlık izlenmeyen dosya. Adından geçici araç çıktısı olduğu tahmin ediliyor; sahibi doğrulanmadı. |

## Kapılar ve bulgular

- `./node_modules/.bin/astro check`: 257 dosya, 0 hata, 0 uyarı, 36 öneri. Çıkış 0.
- `./node_modules/.bin/vitest run scripts/tests/clean-html.test.ts`: 7 başarısız, 89 başarılı, 3 atlanan test. Çıkış 1. Örnek: `Metin<br/>&nbsp;<br/> &nbsp;` girdisinin sonunda gereksiz `<br/>` kalıyor. Günlük: `/tmp/acik-portal-c-b5f1789a-clean-html.log`.
- `git diff --check HEAD`: çıkış 2; üretilmiş metinlerde satır sonu boşlukları ve dosya sonunda boş satırlar var. Tam çıktı 637 satır.
- Üreticiye eklenen temizleme döngüsü, `agent_texts/` klasöründeki bütün girdileri `unlinkSync` ile siliyor. Başka bir dersin çıktısının korunmasını sağlayan kapsam kontrolü yok. Üretici çalıştırılmadı.
- 3B tasarım soru dosyasındaki 35 açıklamanın boşalması, HEAD ile soru kimliği üzerinden karşılaştırılarak sayıldı. Bu kaybın amaçlandığına dair kanıt bulunamadı.

## Denenen çözümler

1. Sürü geçidine normal bağlantı 503, yerel `ws://127.0.0.1:8787` bağlantısı ECONNREFUSED verdi. Sandbox dışından aynı resmî çağrı betiğiyle bağlantı sağlandı; kart ve sahiplik kayıtları okunabildi.
2. İlk test ve tip denetimi bağımlılıklar bulunmadığı için npm önbellek iznine takıldı. `npm ci --cache /tmp/acik-portal-npm-cache --no-audit --no-fund` çalıştırıldı; kurulumdan sonra gerçek test ve tip denetimi sonuçları alındı. Test kapısı geçmedi.
3. Yerel oturum kaydı, iki depo adıyla kart listesi ve arşivler dahil Mac oturumları incelendi. Bekleyen dosyalar için kesin sahiplik bulunamadı. Kapsam benzerliği sahiplik kanıtı olarak kabul edilmedi.

## Devam

Önce dosya gruplarının sahipliği veya devri netleştirilmeli. HTML temizleme testleri düzeltilmeli, açıklama kaybı ve üreticinin silme kapsamı çözülmeli, AUZEF kimlikleri aktarım kaynağıyla doğrulanmalı. Ardından ilgili değişiklikler ayrı commit'lerle gönderilmeli. Bu denetimin teslimi yalnız bu nottur; mevcut kod ve veri değişiklikleri gönderilmedi.

BİTEN: Güncel git durumu, kart, sahiplik kaynakları, tip denetimi ve HTML testleri incelendi.

YARIM: Temiz çalışma ağacı kabul koşulu sağlanmadı.

KARARLAR: Önceden bekleyen dosyalar ve indeks korundu; yalnız denetim notu teslim ediliyor.

ÇIKMAZLAR: Yedi başarısız test, açıklama kaybı ve kesin sahiplik kaydının bulunamaması.

SIRADAKİ: Dosya gruplarını devralan kişi kaynak ve test doğrulamasını tamamlayıp temiz git kapısını çalıştırmalı.
