# Sohbet ajanının belgeleri öğrencinin Drive'ına kaydetmesi

Kaynak: Zeki, 20 Kasım 2026.

Sohbet ajanı bir belge (konu anlatımı, özet, not defteri, çalışma planı) oluşturduğunda öğrenci onu tek dokunuşla kendi Google Drive'ına kaydedebilsin. Belge kartında (`src/components/sohbet/BelgeKarti.tsx`) "Drive'a kaydet" düğmesi olur.

## Uygulama notu

- Google OAuth istemcisi hazır: proje `acik-ogretim-portal`, kimlik repo değişkeni `GOOGLE_CLIENT_ID`.
- Şu an istenen tek izin `drive.appdata` (gizli uygulama klasörü). Görünür dosya yazmak için `drive.file` izni eklenir; yalnız uygulamanın oluşturduğu dosyalara erişir. Google Cloud > Data Access ekranına eklenmeli ve izin yalnız kullanıcı düğmeye bastığında istenmeli (artımlı yetkilendirme).
- Google konsolundaki "Use this client for an AI-powered agent" seçeneği gerekmez: kaydı öğrencinin tarayıcısı, öğrencinin kendi belirteciyle yapar.
- Kaydedilecek biçim: Markdown dosyası ya da Google Docs'a dönüştürülmüş belge (`mimeType: application/vnd.google-apps.document`).
