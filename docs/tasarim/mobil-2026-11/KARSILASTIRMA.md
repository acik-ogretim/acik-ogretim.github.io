# Benzer uygulamalarla karşılaştırma ve kör jüri sonucu (21 Kasım 2026)

## Başka uygulamalardan alınacaklar

**Apple Podcasts dökümü (video ve eş zamanlı metin için örnek)**: bölüm çalarken her sözcük işaretlenir, metne dokununca o noktadan çalar, döküm içinde arama yapılır, döküm "Şimdi Çalıyor" ekranının sol alt köşesinden açılır. Yazı tipi ve renk karşıtlığı uzun metni taramayı kolaylaştıracak biçimde seçilmiş. 16a maketi bu kalıbı izler: konuşulan cümle işaretlenir, zamana dokununca video oraya atlar. Eklenecek: döküm içinde arama ve sözcük düzeyinde işaretleme (seslendirme zaman damgası sözcük düzeyinde yazılırsa).

**Brilliant (etkileşimli ders)**: kısa, adım adım dersler ve anında geri bildirim güçlü yanı. App Store yorumlarında koyu tema olmaması ve ayar azlığı tekrar tekrar eleştiriliyor. Ders: koyu tema ve okuma ayarları bizde baştan var, bunu öne çıkar; adım adım özet (06) Brilliant'ın kısa adım kalıbına yakın.

**Anki, Noji, RemNote, Retain (tekrar uygulamaları)**: aralıklı tekrar ve "bugün tekrar edilecekler" listesi bu sınıfın çekirdeği; Retain sınav tarihine göre plan yapar. Bizde bunun karşılığı "Tekrar gereken" satırı ve sınav geri sayımı; ikisi de gün damgası ve akademik takvim verisi ister (LMS-PLANI.md §4, §2).

**iOS 26 sade kart uygulamaları (ör. Pinax)**: ana ekran araç takımı (widget), sesli okuma, açık ve koyu kip. PWA'da ana ekran aracı yok; yerine Web Push ve Badging API ile "bugün 19 tekrar" rozeti konabilir.

## Kurs ve LMS uygulamalarından örnekler (21 Kasım, ikinci tur)

**Coursera**: video altında konuşmayı izleyen tam döküm; dökümde vurgulanan cümle not olarak kaydedilir, video küçük resim içinde resim olarak sürer. Video notları belli bir saniyeyi işaretler. Mobil oynatıcıda ileri ve geri sarma, telefon kilitliyken sesi dinleme, takvime ödev tarihlerini ekleme var. Coursera'nın yeni kısa video uygulaması Ollie her kısa videoyu soru ve yapay zekâ sohbetiyle eşliyor; şirketin gerekçesi kısa video ile uygulamanın öğrenmeyi artırması. Bize karşılığı: 16a'ya dökümden not alma ve saniye işareti, kilit ekranında ses (Media Session API), ünite videolarını kısa bölümlere bölüp her bölümün sonuna 2-3 soru.

**Mobil LMS vaka çalışmaları**: ilerleme çubuğunu ve o anki ders adını ana öğrenme ekranına çıkarmak, "Ders içeriği" menüsüne gömmekten daha iyi sonuç vermiş (Cakap LMS, haftalık ilerleme %43'ten %49'a). Başka bir örnek ilerlemeyi ana sayfada, ders içinde ve oynatıcıda her adımda gösteriyor. Uzun kayıtlı derste tasarımın asıl konusu oynatıcı, altyazı ve dosya boyutu; kart ızgarası değil. Bize karşılığı: 17'deki kahraman kart ve ders içi ilerleme doğru yönde; oynatıcıya altyazı ve indirme durumu eklenir.

**Geniş ekranda ders**: dersin ana hatları bir yanda, içerik öbür yanda; dar ekranda ana hatlar içeriğin üstüne katlanır ya da ayrı gezinmeye geçer (Absorb LMS Course Player, Power Apps LMS örneği). Bize karşılığı: tablet ve masaüstünde ünite listesi solda, soru ve döküm sağda (DESIGN.md §8 ile aynı yön).

**Khan Academy**: kendi tasarım sistemi Wonder Blocks; renk belirteçleri Core, Learning ve Component diye üç alana ayrılmış. Bize karşılığı: belirteçlerimizi "temel" (yüzey, metin, kenar) ve "öğrenme" (doğru, yanlış, uyarı, ilerleme) diye ikiye ayırmak; vurgu değişince öğrenme renkleri etkilenmez.

Kaynaklar: https://blog.coursera.org/ready-for-retention-presenting-a-unified-note-taking-experience/ · https://blog.coursera.org/updates-to-your-learning-experience-on-coursera · https://www.businesstoday.in/technology/artificial-intelligence/story/courseras-ollie-borrows-social-medias-playbook-and-even-replaced-its-ctos-tiktok-habit-542816-2026-07-14 · https://contra.com/p/3Ecc2Bq7-how-revamping-the-lms-design-rescued-a-64percent-mobile-learner-base · https://contra.com/p/PbRqvRNk-learnova-learning-management-mobile-app · https://shakuro.com/blog/develop-mobile-learning-platform · https://collab365.com/blog/make-power-apps-prototype-feel-like-lms · https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up

## Kör jüri

Kural, şablon ve renk verilmeden yalnız Zeki'nin sözleriyle üç Nano Banana panosu ve bir Stitch ekranı üretildi (`alternatifler/kor-*.jpg`). Stitch'in kör ekranı da aynı yöne gitti: koyu VS Code dili, canlı ders altında zamanlı not akışı, vize geri sayımı, kulaklıkla dinleme kipi. Dördünün ortak kararları:

- Koyu tema varsayılan, VS Code koyu havası. Siyah beyaz varsayılana geçiş kararıyla uyumlu; koyu tema ayrı değil eş değer seçenek olmalı.
- Video ve döküm aynı ekranda, döküm canlı işaretli. 16a ile aynı yön.
- Ayrı "Yapay zekâya sor" ekranı ve sesli dinleme düğmesi her ekranda.
- Hepsi "e-Devlet ile giriş" ya da kullanıcı adı ve şifre koydu. Sitede hesap yok; giriş, kayıt getirme ekranı (7e) olarak kalır. e-Devlet girişi yalnız kurumla anlaşmayla mümkündür, plana alınmadı.
- Seri sayacı ve haftalık grafik koydular. Tarihli kayıt gelmeden bunlar sahte veri olur (DESIGN.md §11).
- Mor ve turkuaz gradyanlara kaydılar; siyah beyaz kararını güçlendiren bir sonuç: serbest bırakılan model kalıba düşüyor.

## Kaynaklar

- Apple Podcasts transcripts: https://www.apple.com/newsroom/2024/03/apple-introduces-transcripts-for-apple-podcasts/
- Brilliant, App Store sayfası ve yorumları: https://apps.apple.com/app/brilliant-learn-by-doing/id913335252
- 2026 kart uygulamaları derlemesi: https://venture-lab.org/?p=10005031
- Pinax, App Store: https://apps.apple.com/us/app/pinax/id6757667441
