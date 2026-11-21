---
name: Açık Öğretim Portal
version: 2 (21 Kasım 2026)
summary: Sürü panosunun sakin tonları üstünde mobil öncelikli çalışma uygulaması; koyu ve açık eş değer, tek vurgu, uzun okuma için serif başlık.
themes: [light, dark, sepia]
colors:
  light:
    bg-color: '#FCFCFB'
    card-bg: '#FFFFFF'
    button-bg: '#F7F7F5'
    button-bg-hover: '#EFEFEC'
    border-color: 'rgba(20,20,20,0.10)'
    border-color-hover: 'rgba(20,20,20,0.20)'
    text-color: '#151515'
    text-color-muted: '#525252'
    primary-color: '#2563B8'
    primary-color-text: '#FFFFFF'
    primary-text: '#1F56A3'
    primary-soft: '#E4EDF8'
    correct-border: '#17703D'
    correct-bg: '#E0F2E6'
    incorrect-border: '#AE2F27'
    incorrect-bg: '#FBE5E2'
    warning: '#7F5200'
    warning-bg: '#FAEECE'
  dark:
    bg-color: '#151515'
    card-bg: '#1A1A19'
    button-bg: '#20201F'
    button-bg-hover: '#2C2C2A'
    border-color: 'rgba(255,255,255,0.09)'
    border-color-hover: 'rgba(255,255,255,0.18)'
    text-color: '#F5F5F5'
    text-color-muted: '#A3A3A3'
    primary-color: '#7AB0F2'
    primary-color-text: '#151515'
    primary-text: '#7AB0F2'
    primary-soft: '#1C2633'
    correct-border: '#7BC79A'
    correct-bg: '#18241C'
    incorrect-border: '#E58C82'
    incorrect-bg: '#2A1C1A'
    warning: '#E3B75A'
    warning-bg: '#2A2416'
  sepia: mevcut değerler korunur (global.css [data-theme='sepia']); eksik dört rol aşağıdaki kuralla türetilir
typography:
  display: { family: 'ui-serif, "Iowan Old Style", "Source Serif 4", Georgia, serif', weight: 600 }
  sans: { family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }
  mono: { family: 'ui-monospace, "SF Mono", Menlo, monospace' }
  scale:
    title-xl: 36px / 1.05 / display
    title-l: 22px / 1.2 / display
    title-m: 17px / 1.25 / sans 700
    question: 18px / 1.55 / display 400
    body-reading: 18px / 1.7 / sans 400
    body: 16px / 1.5 / sans 400
    meta: 13px / 1.3 / sans 600
rounded: { chip: 999px, row: 16px, card: 24px, hero: 28px, sheet: 28px, small: 8px }
spacing: [4, 8, 12, 16, 20, 24, 32]
touch-target: 44px
---

# DESIGN.md: Açık Öğretim Portal

Bu belge sitenin görsel sözleşmesidir. Değerler `src/styles/global.css` içindeki `[data-theme]` rol değişkenlerine birebir yazılır; bileşenler hiçbir zaman ham renk kullanmaz. Koda uyum kararları ve açıklar `UYUM.md` içindedir, ekran envanteri `PLAN.md` içindedir. Canlı örnek: `17-onerilen-dil.html`, `18-renk-oyunu.html`. Bu sürüm Kasım 2026'daki ilk sözleşmenin yerini alır (deniz yeşili ve slate değerleri git geçmişinde).

## 1. Atmosfer ve yön

Gece çalışan, telefonda soru çözen ve dinleyen yetişkin öğrenci için sakin bir çalışma masası. Yön, sürü panosunun Claude teması tonlarından gelir: koyu temada #151515 kademeleri, açıkta sıcak kâğıt beyazı. Ekranda tek bir vurgu vardır ve yalnız birincil eylemde görünür; geri kalan her şey nötrdür. Yoğunluk orta: listeler sık, okuma alanları geniş. Hareket sakin, süs yok.

Üç ayar: sapma düşük (tanıdık iOS kalıpları), hareket düşük, yoğunluk orta.

## 2. Yüzey ve renk

**Yüzey kademeleri**: zemin `--bg-color`, kart `--card-bg`, iç yüzey ve pasif düğme `--button-bg`, üstte açılan yüzey `--button-bg-hover`. Derinlik gölgeyle değil, ton farkı ve ince kenarla kurulur.

**Metin**: `--text-color` ve `--text-color-muted`. Saf siyah ve saf beyaz kullanılmaz.

**Vurgu**: `--primary-color` yalnız ekrandaki tek birincil eylemde (devam, sonraki, uygula) ve odak halkasında. Zemin üstünde bağlantı ya da seçili metin gerektiğinde `--primary-text`, seçili çip zemininde `--primary-soft`. İlerleme çubukları, seçili sekme, simgeler ve oynatıcı nötrdür (`--text-color-muted`, `--text-color`).

**Öğrenme renkleri**: `--correct-*`, `--incorrect-*`, `--warning*`. Vurgudan bağımsızdır; vurgu değişince değişmez. Vurgu hiçbir zaman yanlış rengine yakın seçilmez (kiremit turuncusu bu yüzden elendi: yanlış rengiyle parlaklık oranı 1,05).

**Sepya**: mevcut değerler kalır. Eksik roller şöyle türetilir: `--primary-text` = `--primary-color`, `--primary-soft` = `color-mix(in srgb, var(--primary-color) 14%, var(--card-bg))`, `--warning` = #7F5200, `--warning-bg` = #F3E6C8.

**Kontrast** (WCAG oranı, hesaplandı): açık temada metin 17,8, ikincil metin 7,8, vurgu üstü beyaz yazı 5,9, vurgu metni 7,0, doğru 5,3, yanlış 5,4, uyarı 5,9; koyu temada metin 16,8, ikincil metin kartta 6,9, vurgu üstü yazı 8,1, doğru 8,0, yanlış 6,6, uyarı 8,2. Hepsi 4,5'in üstünde.

**Üniversite rengi**: `universities.json` içindeki `color` yalnız üniversite rozetinde kullanılır; arayüz vurgusu olmaz.

## 3. Tipografi

**Aileler**: başlık ve soru metni serif (`display`), arayüz sistem yazı tipi (`sans`), sayılar ve kod eşaralıklı ya da `tabular-nums`. Ek yazı tipi indirilmez; sistem yazı tiplerinde Türkçe glifler (ÇĞİÖŞÜ çğıöşü, I İ ı i) tamdır.

**Ölçek**: büyük başlık 36, ekran başlığı 22 serif, çubuk başlığı 17 sans 700, soru 18/1,55 serif, okuma gövdesi 18/1,7, gövde 16/1,5, meta 13. Kullanıcının yazı boyutu ayarı (`yazi-boyutu`) kökte ölçek çarpanı olarak uygulanır.

**Satır sınırı**: başlık, meta ve liste satırı en çok 2 satır, sonra üç nokta. Soru, şık, açıklama ve okuma metni kesilmez, 60 karakter ölçüyle sarılır.

## 4. Yerleşim ve boşluk

**Ölçek**: 4 tabanlı (4, 8, 12, 16, 20, 24, 32). Kenar boşluğu 16, şıklar arası 10, grup içi 8, gruplar arası 16 ila 24.

**Telefon**: tek sütun. Ders sayfası dışındaki sayfalarda alt sekme çubuğu (Ana sayfa, Derslerim, Ara, İlerleme, Ayarlar); ders sayfasında tek sabit alt öğe oynatıcı çubuğudur.

**Güvenli alan**: bütün sabit alt öğeler `bottom: calc(env(safe-area-inset-bottom) + 6px)`, kenarlardan `max(12px, env(safe-area-inset-left/right))` içeride. İçerik alt boşluğu çubuk yüksekliği artı 20 px. Klavye açıkken `--klavye` (`viewport.ts`) alt sayfaları yukarı iter, oynatıcı gizlenir.

**Tablet ve masaüstü (600 px ve üstü)**: okuma alanı en çok 680 px ortada; sekme çubuğu sol rayda; alt sayfalar sağdan 420 px çekmece; ders sayfasında ünite ve konu listesi solda, sorular sağda.

## 5. Bileşenler

**Soru kartı** (`.question-card`): kart yüzeyi, 24 px köşe, 1 px kenar, iç boşluk 16 (telefon) ve 24. Üstte `.q-label` (sınav çipi, kaynak), varsa konu bağlantısı (`.q-konu`, yalnız konu ağacı olan derste), soru metni (`.question-text`, serif 18), şıklar, açıklama. Listede tekrarlanır; tek soru ekranı yoktur.

**Şık** (`.option-item`, `.option-key`): en az 56 px, 16 px köşe, 1 px kenar. Harf rozeti 32 px daire. Durumlar: varsayılan, seçili (`--primary-soft` zemin, `--primary-text` rozet), doğru (`.is-correct`, `.was-revealed`: doğru kenar ve zemin, onay simgesi), yanlış (`.is-wrong`: yanlış kenar ve zemin, çarpı), soluk (cevaptan sonra diğerleri %70). Renk tek başına anlam taşımaz, simge de vardır.

**Açıklama** (`.explanation-card`): iç yüzey zemini, 20 px köşe, yan şerit yok. Başlıkta "Açıklama" ve nötr iki simge düğmesi (seslendir, derse sor); kaynak satırı meta boyutunda. Açıklaması olmayan soruda kart yerine tek satır: "Açıklama yok · Yapay zekâ ile açıkla" (`AIMenu`, anahtar yoksa ayarlara götürür).

**Ünite şeridi** (`.btn-unit-nav`): yatay kaydırılan çipler, seçili çip `--primary-soft`. Üst çubuk anlık soruyu "Ü 4 · 12 / 40" diye gösterir (`currentIndex`).

**Kip seçici**: ders sayfasının başında iki parçalı seçici, Okuma ve Çözme (`btn-toggle-interactive` ile aynı durum).

**Oynatıcı çubuğu** (`#quiz-player-bar`): yüzen kapsül, 60 px, cam yüzey. Oynat ortada nötr ve sabit; iki yanında kullanıcının seçtiği ikişer eylem (`cubuk-duzeni`), sığmayanlar alt sayfa ızgarasında. Mevcut düğme kimlikleri korunur (`btn-prev`, `btn-next`, `btn-read-question`, `btn-read-explanation`, `btn-stop-speech`, `btn-speed`, `btn-toggle-reader`, `btn-open-settings`, `btn-mobil-menu`).

**Alt sayfa**: Base UI `Drawer` (sohbet ve içindekilerle aynı). Kenarlardan 8 px ayrık, 28 px köşe, tutamaç, cam yüzey; perde %25 karartma; `role="dialog"`, odak içeri girer ve kapanınca çağıran düğmeye döner; arka sayfa `inert`.

**Sekme çubuğu**: yüzen cam kapsül, 62 px, beş sekme, seçili sekme nötr hap içinde, `aria-current="page"`.

**Liste satırı**: en az 60 px, başlık 2 satır, altında 6 px nötr ilerleme şeridi, sağda tabular yüzde.

**Kahraman kart** (Bugün, kaldığın yer): 28 px köşe, serif ders adı, ünite ve soru satırı, ince nötr ilerleme, sağda tek vurgulu yuvarlak devam düğmesi.

**Süzgeç alt sayfası** (ders bağlamlı): soru türü (yanlışlar, cevaplanmamışlar), kaynak, sınav, ünite; `quiz-settings` alanlarını kullanır.

**Ayarlar**: gruplu satırlar (görünüm, sesli okuma, soru çözme, kayıtlar, yapay zekâ, yardım). Ayar penceresi temayı izler; sabit koyu yüzey kullanılmaz.

## 6. Derinlik ve kenar

Gölge yalnız yüzen öğelerde (sekme çubuğu, oynatıcı, alt sayfa) ve yumuşak. Kartlar ve satırlar 1 px yarı saydam kenarla ayrılır (açıkta %10 siyah, koyuda %9 beyaz). Cam yüzey: `color-mix(in srgb, var(--card-bg) 58%, transparent)`, `backdrop-filter: blur(22px) saturate(180%)` (Safari için `-webkit-` önekli). SVG kırılma süzgeci kullanılmaz; Safari onu göstermez.

## 7. Simge ve medya

Lucide simgeleri, 1,7 çizgi kalınlığı, `currentColor`. Simge düğmelerin adı `aria-label` ile verilir, sürekli açıklama metni yoktur; ilk kullanımda ve basılı tutunca kısa ipucu çipi görünür. Video 16:9, köşe kart yarıçapıyla aynı. Kişi fotoğrafı ve avatar yok.

## 8. Hareket

Rutin geçişler 300 ms altında, eğri `cubic-bezier(.2,0,0,1)`. Basma `scale(.96)` 120 ms, renk 200 ms, alt sayfa açılış 300 ms kapanış 150 ms, ipucu çipi 150 ms girer ve 1,6 sn sonra çıkar. Listede ve çubuklarda giriş animasyonu yok. `prefers-reduced-motion` ve Motion `reducedMotion="user"` hepsini kapatır.

## 9. İlkeler ve sınırlar

**Koru**: tek vurgu, nötr ilerleme, serif soru metni, yüzen cam alt öğeler, eş merkezli köşeler, öğrenme renklerinin vurgudan bağımsızlığı, veride olmayan alanın çizilmemesi.

**Kaçın**: yan şerit, gradyan, gölgeli kart yığını, mor ve turkuaz, saf siyah ve keskin beyaz, her yüzeyde vurgu, sahte veri (seri, haftalık grafik, sınav geri sayımı veri gelmeden), sabit Tailwind renk sınıfı (`text-slate-*`, `bg-teal-*` gibi), temadan bağımsız sabit koyu yüzey.

**Erişilebilirlik**: dokunma hedefi en az 44 px; odak halkası 3 px `--primary-color`, 2 px boşluk; ilerleme `role="progressbar"`; açık kapalı düğmeler `aria-pressed`; alt sayfa açan düğme `aria-expanded`.

**Sınama**: her değişiklikte 375, 390, 430 ve 768 px'te, açık, koyu ve sepya temada Playwright ekran görüntüsü.
