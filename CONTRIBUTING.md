# Katkıda Bulunma Rehberi (Contributing)

Öncelikle **Açık Öğretim Portal**'a katkıda bulunmak istediğiniz için teşekkürler! 🎉

Bu proje, açık kaynak felsefesiyle büyüyen ve topluluğun desteğiyle gelişen bir eğitim platformudur. İster küçük bir yazım hatası düzeltmesi, ister yeni bir özellik eklemesi olsun, her türlü katkınız bizim için değerlidir.

## 🛠️ Nasıl Katkıda Bulunabilirim?

### 1. Hata Bildirimi ve Öneriler
Kod yazmadan da katkıda bulunabilirsiniz!
- Karşılaştığınız hataları bildirmek için [Issue](https://github.com/acik-ogretim/acik-ogretim.github.io/issues) açabilirsiniz.
- Yeni bir ders, bölüm veya özellik önerisinde bulunabilirsiniz.

### 2. Geliştirme Süreci (Kod Katkısı)

Projeyi kendi bilgisayarınızda çalıştırmak ve değişiklik yapmak için aşağıdaki adımları izleyin:

#### Adım 1: Projeyi Fork'layın
GitHub sayfasının sağ üst köşesindeki **"Fork"** butonuna tıklayarak projeyi kendi hesabınıza kopyalayın.

#### Adım 2: Klonlayın
Fork'ladığınız projeyi bilgisayarınıza indirin:
```bash
git clone https://github.com/KULLANICI_ADINIZ/acik-ogretim.github.io.git
cd acik-ogretim.github.io
```

#### Adım 3: Bağımlılıkları Yükleyin
Node.js (v18+) kurulu olduğundan emin olun ve gerekli paketleri yükleyin:
```bash
npm install
```

#### Adım 4: Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Tarayıcınızda `http://localhost:4321` adresine gidin.

#### Adım 5: Branch Oluşturun
Her özellik veya düzeltme için yeni bir dal (branch) açın:
```bash
git checkout -b ozellik/yeni-header-tasarimi
# veya
git checkout -b fix/mobil-menu-hatasi
```

#### Adım 6: Değişiklikleri Kaydedin
Yaptığınız değişiklikleri commitleyin:
```bash
git add .
git commit -m "feat: Header tasarımı yenilendi ve logo eklendi"
```
*(Lütfen commit mesajlarınızda açıklayıcı olun)*

#### Adım 7: Push ve Pull Request (PR)
Değişiklikleri kendi fork'unuza gönderin:
```bash
git push origin ozellik/yeni-header-tasarimi
```
Ardından GitHub'daki orijinal projeye giderek **"Compare & pull request"** butonuna tıklayın ve PR'ınızı oluşturun.

## 📏 Kod Düzeni ve Standartlar
- **Framework:** Astro v5 kullanıyoruz.
- **Dil:** TypeScript tercih ediyoruz.
- **Stil:** Tailwind CSS sınıflarını kullanın. `style` tag'i içine css yazmaktan kaçının.
- **Format:** Projeye `prettier` dahildir. Kodunuzu göndermeden önce formatlamaya özen gösterin.

## 📝 İçerik (Soru/Ders) Ekleme
Eğer `data/` klasörüne yeni soru veya ders ekliyorsanız:
- JSON formatının bozulmadığından emin olun.
- `id` alanlarının benzersiz (unique) olduğundan emin olun.
- Telif hakkı içeren materyalleri (kitap PDF'i vb.) doğrudan yüklemeyin.

Teşekkürler! 🚀
