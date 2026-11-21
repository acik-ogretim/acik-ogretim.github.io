"""Generates the app-shell mockups 07-12 (welcome, home, my courses, stats, settings, PWA states).

Reuses the icon sprite of 05-unite-konu-yanlislar.html and the tokens in ortak.css, so every screen shares
one visual system with mockups 01-06. Run: python3 uret_uygulama.py (writes the HTML files next to it).
"""
import re
from pathlib import Path

KOK = Path(__file__).parent
SPRITE = re.search(r'<svg width="0".*?</svg>', (KOK / "05-unite-konu-yanlislar.html").read_text(), re.S).group(0)

YENI = {
    "ev": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    "kitaplik": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    "grafik": '<path d="M3 3v18h18"/><path d="M8 17v-6"/><path d="M13 17V7"/><path d="M18 17v-3"/>',
    "disli": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    "yildiz": '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
    "bulut": '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
    "anahtar-i": '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    "cihaz": '<rect width="10" height="18" x="3" y="3" rx="2"/><rect width="8" height="12" x="13" y="9" rx="2"/>',
    "indir": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "yukle": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    "wifi-yok": '<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M22 8.8a15 15 0 0 0-11.3-3.8"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M19 12.9a10 10 0 0 0-2.9-2"/><path d="m2 2 20 20"/>',
    "yenile": '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
    "paylas": '<path d="M12 3v13"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    "arti-kare": '<rect width="18" height="18" x="3" y="3" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    "ay": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "yazi": '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    "cop": '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    "tutamak": '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    "kalkan": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    "kep": '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    "github": '<path d="M9 19c-4 1.5-4-2-6-2.5"/><path d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19 5.2 4.8 4.8 0 0 0 18.9 1.6s-1.2-.3-3.9 1.5a13.4 13.4 0 0 0-7 0C5.3 1.3 4.1 1.6 4.1 1.6A4.8 4.8 0 0 0 4 5.2a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.1 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
    "kilit": '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "kitap-ac": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z"/>',
}
SPRITE = SPRITE.replace("</svg>", "".join(f'<symbol id="i-{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in YENI.items()) + "</svg>")


def ic(ad, ek=""):
    return f'<svg class="i {ek}" aria-hidden="true"><use href="#i-{ad}"/></svg>'


def ekran(icerik, alt, aciklama, koyu=False):
    tema = ' data-tema="koyu"' if koyu else ""
    return (f'<figure><div class="ekran"{tema}><div class="durum"><span>9:41</span><span class="ada"></span>'
            f'<span>100%</span></div>{icerik}<div class="ana-cubuk"></div></div><figcaption>{alt}. {aciklama}</figcaption></figure>')


def ust(baslik, alt="", sol=("left", "Geri"), sag=None):
    s = f'<button class="dugme" aria-label="{sol[1]}">{ic(sol[0])}</button>' if sol else '<span style="width:8px"></span>'
    a = f'<span class="k1">{alt}</span>' if alt else ""
    r = ""
    if sag:
        r = (f'<button class="dugme" aria-label="{sag[1]}">{ic(sag[0])}</button>' if sag[0] != "metin"
             else f'<button class="dugme" style="color:var(--vurgu-metin);padding:0 10px">{sag[1]}</button>')
    return f'<header class="ust">{s}<div class="ust-b"><b class="k1">{baslik}</b>{a}</div>{r}</header>'


def sekmeler(secili):
    ogeler = [("ev", "Ana sayfa"), ("kitaplik", "Derslerim"), ("search", "Ara"), ("grafik", "İlerleme"), ("disli", "Ayarlar")]
    return '<nav class="sekmeler" aria-label="Ana gezinme">' + "".join(
        f'<a href="#" class="{"secili" if ad == secili else ""}"{" aria-current=\"page\"" if ad == secili else ""}>{ic(s)}<span>{ad}</span></a>'
        for s, ad in ogeler) + "</nav>"


def satir(baslik, alt, sag="", sol="", ek=""):
    return f'<div class="satir" style="{ek}">{sol}<span class="t"><b class="k2">{baslik}</b><span class="k2">{alt}</span></span>{sag}</div>'


def ilerlemeli(baslik, alt, yuzde, sol=""):
    return (f'<div class="satir">{sol}<span class="t"><b class="k2">{baslik}</b><span class="k1">{alt}</span>'
            f'<div class="mini"><i style="width:{yuzde}%"></i></div></span><span class="yuzde say">%{yuzde}</span></div>')


def ayar(baslik, alt="", sag="", simge="", sinif=""):
    s = f'<span class="simge-kare">{ic(simge, "i-s")}</span>' if simge else ""
    a = f"<small>{alt}</small>" if alt else ""
    return f'<div class="ayar {sinif}">{s}<span class="t"><span class="k1" style="display:block">{baslik}</span>{a}</span>{sag}</div>'


SAG = ic("right", "i-s")
ANAHTAR = '<span class="anahtar acik" role="switch" aria-checked="true"></span>'
KAPALI = '<span class="anahtar" role="switch" aria-checked="false"></span>'
ADIM = lambda n: '<div class="adimlar" style="padding:0;margin:4px 0 16px">' + "".join(f'<i class="{"b" if i < n else ""}"></i>' for i in range(3)) + "</div>"


def sayfa(ad, baslik, ekranlar):
    html = (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" '
            f'content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{baslik}</title>'
            f'<link rel="stylesheet" href="ortak.css"></head><body>{SPRITE}<div class="sahne">{"".join(ekranlar)}</div></body></html>')
    (KOK / f"{ad}.html").write_text(html)


# ---------- 07 karşılama, kurulum, kayıt getirme ----------
UNI = [("AUZEF", "İstanbul Üniversitesi", "58 bölüm", "#7a1f2b"), ("Anadolu AÖF", "Anadolu Üniversitesi", "67 bölüm", "#1d4ed8"),
       ("ATA-AÖF", "Atatürk Üniversitesi", "67 bölüm", "#0f766e"), ("ANKUZEF", "Ankara Üniversitesi", "31 bölüm", "#9a3412")]
k7 = []
k7.append(ekran(
    '<main class="icerik" style="inset:calc(var(--sat) + 0px) 0 0 0;padding:64px 24px 0;display:flex;flex-direction:column">'
    f'<div class="logo">{ic("kep")}</div><h1 class="baslik-buyuk" style="margin-top:24px">Çıkmış sorularla çalış, dinleyerek tekrar et</h1>'
    '<p style="color:var(--metin-2);font-size:17px;line-height:1.5;margin-top:8px">Dört açık öğretim fakültesinin ders kitapları, ünite özetleri ve vize, final soruları tek yerde.</p>'
    '<div style="margin-top:auto;padding-bottom:calc(var(--sab) + 16px);display:flex;flex-direction:column;gap:10px">'
    '<button class="dugme dolu" style="width:100%;min-height:56px">Okulunu seç</button>'
    '<button class="dugme cizgili" style="width:100%;min-height:52px">Kayıtlarım başka cihazda</button>'
    '<p style="font-size:13px;color:var(--metin-2);text-align:center;margin-top:4px">Hesap açmadan çalışırsın; çözümlerin bu cihazda kalır.</p></div></main>',
    "7a", "Karşılama: bir cümle vaat, tek birincil eylem; hesap yerine kayıt getirme ikincil yol"))
k7.append(ekran(
    ust("Okulunu seç", "1 / 3") + '<main class="icerik">' + ADIM(1) +
    "".join(satir(a, f"{b} · {c}", SAG, f'<span class="rozet" style="background:{r}">{a[:3]}</span>') for a, b, c, r in UNI) +
    "</main>", "7b", "Kurulum 1/3: dört üniversite; rozet kısa ad ve kurum rengiyle, gerçek logo varsa onunla"))
bolumler = [("Çocuk Gelişimi", "Lisans · 8 dönem", True), ("Çocuk Gelişimi", "Önlisans · 4 dönem", False),
            ("Çocuk Gelişimi (Uzaktan)", "Önlisans · 4 dönem", False)]
k7.append(ekran(
    ust("Bölümünü seç", "AUZEF · 2 / 3") + '<main class="icerik">' + ADIM(2) +
    f'<div class="alan" style="border-color:var(--cizgi)">{ic("search", "i-s")}<span class="girdi">çocuk</span><button class="dugme" aria-label="Temizle">{ic("x", "i-s")}</button></div>'
    '<div class="yatay" style="margin:12px 0 4px"><span class="chip v">Tümü</span><span class="chip">Lisans</span><span class="chip">Önlisans</span><span class="chip">Tamamlama</span></div>'
    + "".join(satir(f"<mark>Çocuk</mark>{a[5:]}", b,
                    f'<button class="dugme" aria-label="Favorilere ekle" style="color:{"var(--uyari)" if f else "var(--metin-2)"}">{ic("yildiz", "i-fill" if f else "")}</button>')
              for a, b, f in bolumler) + "</main>", "7c", "Kurulum 2/3: arama ve derece çipleri; yıldız bölümü favorilere ekler"))
dersler = [("Anne Çocuk Sağlığı", True), ("Erken Çocukluk Eğitimine Giriş", True), ("Fiziksel Büyüme ve Motor Gelişim", True),
           ("Oyun ve Oyun Materyalleri", True), ("Çocuk Edebiyatı", False), ("Özel Eğitime Giriş", True)]
k7.append(ekran(
    ust("Derslerini seç", "Çocuk Gelişimi · 3 / 3") + '<main class="icerik">' + ADIM(3) +
    '<div class="yatay" style="margin-bottom:6px"><span class="chip">1.</span><span class="chip">2.</span><span class="chip v">3. dönem</span><span class="chip">4.</span><span class="chip">5.</span><span class="chip">6.</span></div>'
    + "".join(f'<div class="satir" style="min-height:56px"><span class="secim {"acik" if s else ""}">{ic("check", "i-s")}</span><span class="t"><b class="k2">{d}</b></span></div>' for d, s in dersler)
    + '</main><div class="yuzen-eylem"><button class="dugme dolu">5 dersi Derslerime ekle</button></div>',
    "7d", "Kurulum 3/3: dönem çipleri, işaretle, tek birincil eylem; sonra her zaman değiştirilebilir"))
yollar = [("bulut", "Google Drive", "Kendi Drive'ının gizli uygulama klasörü"), ("kalkan", "remoteStorage", "Kendi depolama sunucun"),
          ("github", "GitHub", "Parolanla şifrelenmiş gizli gist"), ("cihaz", "Yakındaki cihaz", "İki cihaza aynı parolayı yaz"),
          ("dosya", "Yedek dosyası", "Önceden indirdiğin .json dosyası")]
k7.append(ekran(
    ust("Kayıtlarını getir", sol=("x", "Kapat")) + '<main class="icerik">'
    '<p style="color:var(--metin-2);font-size:15px;line-height:1.5;margin-bottom:12px">Çözdüğün sorular, yanlışların ve favorilerin hangi yolla saklandıysa onu seç.</p>'
    '<div class="grup">' + "".join(ayar(a, b, SAG, s) for s, a, b in yollar) + "</div>"
    f'<div class="bant v" style="margin-top:14px">{ic("kilit", "i-s")}<span class="t">Kayıtlar sitemize hiç gelmez; yalnız seçtiğin yerle bu cihaz arasında taşınır.</span></div></main>',
    "7e", "Giriş yerine kayıt getirme: sitede hesap yok, sistemdeki beş eşitleme yolu birebir"))
sayfa("07-karsilama-giris", "Karşılama, kurulum ve kayıt getirme", k7)

# ---------- 08 ana sayfa ----------
def ana(koyu=False, bos=False):
    if bos:
        govde = (f'<div class="kart vurgulu"><b>İlk soruyla başla</b><span class="ac">Erken Çocukluk Eğitimine Giriş · Ünite 1</span>'
                 '<div class="kart-alt"><button class="dugme dolu" style="flex:1">Çözmeye başla</button></div></div>'
                 '<p class="alt-baslik">Derslerim</p>' + "".join(ilerlemeli(d, "0 / 120 soru", 0) for d, s in dersler if s)[:4000])
    else:
        govde = (f'<div class="kart vurgulu"><span class="chip u" style="margin-bottom:8px">Kaldığın yer</span><b class="k2">Erken Çocukluk Eğitimine Giriş</b>'
                 '<span class="ac k1">Ünite 4 · Soru 12 / 40</span><div class="kart-alt"><div class="mini"><i style="width:30%"></i></div>'
                 f'<button class="dugme yuvarlak" style="background:var(--vurgu);color:var(--vurgu-ustu);width:52px;height:52px" aria-label="Devam et">{ic("play", "i-fill")}</button></div></div>'
                 f'<div class="satir" style="margin-top:8px"><span class="simge-kare" style="background:var(--yanlis-zemin);color:var(--yanlis)">{ic("tekrar", "i-s")}</span>'
                 '<span class="t"><b>Tekrar gereken 19 soru</b><span>Son denemende yanlış yaptıkların</span></span>' + SAG + '</div>'
                 '<p class="alt-baslik">Derslerim</p>' + ilerlemeli("Erken Çocukluk Eğitimine Giriş", "312 / 420 soru", 74)
                 + ilerlemeli("Anne Çocuk Sağlığı", "96 / 380 soru", 25) + ilerlemeli("Oyun ve Oyun Materyalleri", "0 / 210 soru", 0))
    return ('<main class="icerik kabuk" style="inset:var(--sat) 0 0 0;padding-top:12px">'
            f'<div style="display:flex;align-items:center;gap:8px"><h1 class="baslik-buyuk" style="flex:1">Bugün</h1><button class="dugme" aria-label="Derse sor">{ic("sohbet")}</button></div>'
            '<p style="color:var(--metin-2);font-size:14px;margin-bottom:14px">AUZEF · Çocuk Gelişimi · 3. dönem</p>' + govde + "</main>" + sekmeler("Ana sayfa"))


sayfa("08-ana-sayfa", "Ana sayfa", [
    ekran(ana(), "8a", "Ana sayfa: kaldığın yer tek birincil kart, tekrar gerekenler, derslerim ilerlemesi; sekme çubuğu tek sabit alt öğe"),
    ekran(ana(bos=True), "8b", "İlk gün: veri yokken boş istatistik yerine ilk eylem"),
    ekran(ana(koyu=True), "8c", "Koyu tema", koyu=True),
])

# ---------- 09 derslerim, favoriler, ders ekle ----------
seg = lambda a: (f'<div class="segment" role="tablist"><button class="dugme {"secili" if a == 0 else ""}" role="tab">Derslerim</button>'
                 f'<button class="dugme {"secili" if a == 1 else ""}" role="tab">Favoriler</button></div>')
benim = [("Erken Çocukluk Eğitimine Giriş", "AUZEF · 3. dönem", 74), ("Anne Çocuk Sağlığı", "AUZEF · 3. dönem", 25),
         ("Fiziksel Büyüme ve Motor Gelişim", "AUZEF · 3. dönem", 12), ("Özel Eğitime Giriş", "AUZEF · 3. dönem", 0)]
k9 = [
    ekran(ust("Derslerim", sol=None, sag=("metin", "Düzenle")) + '<main class="icerik kabuk">' + seg(0)
          + "".join(ilerlemeli(a, b, c) for a, b, c in benim)
          + f'<button class="satir" style="color:var(--vurgu-metin);border-bottom:0"><span class="simge-kare">{ic("yeni", "i-s")}</span><span class="t"><b>Ders ekle</b></span></button></main>'
          + sekmeler("Derslerim"), "9a", "Derslerim: mevcut favori ders kaydından gelir, ilerleme yerel çözümlerden"),
    ekran(ust("Derslerim", "Sürükle, sırala, çıkar", sol=None, sag=("metin", "Bitti")) + '<main class="icerik kabuk">'
          + "".join(f'<div class="satir"><button class="dugme" aria-label="Taşı" style="color:var(--metin-2)">{ic("tutamak")}</button><span class="t"><b class="k2">{a}</b><span>{b}</span></span>'
                    f'<button class="dugme" aria-label="Çıkar" style="color:var(--yanlis)">{ic("daire-x")}</button></div>' for a, b, _ in benim)
          + '<p style="font-size:13px;color:var(--metin-2);margin-top:12px">Çıkardığın dersin çözümleri silinmez; dersi yeniden eklersen kaldığın yerden sürer.</p></main>'
          + sekmeler("Derslerim"), "9b", "Düzenleme: @dnd-kit sıralama (alt çubuk düzenleyicisiyle aynı kütüphane), çıkarma veri silmez"),
    ekran(ust("Derslerim", sol=None) + '<main class="icerik kabuk">' + seg(1)
          + '<p class="alt-baslik">Bölümler</p>' + satir("Çocuk Gelişimi", "AUZEF · Lisans", SAG, f'<span class="rozet" style="background:#7a1f2b">AUZ</span>')
          + satir("Sosyal Hizmetler", "AUZEF · Önlisans", SAG, f'<span class="rozet" style="background:#7a1f2b">AUZ</span>')
          + '<p class="alt-baslik">İşaretli sorular · 7</p>'
          + satir("Piaget'ye göre somut işlemler döneminin temel özelliği hangisidir?", "Erken Çocukluk Eğitimine Giriş · 2024 Final", f'<span style="color:var(--uyari)">{ic("yildiz", "i-fill i-s")}</span>')
          + satir("Bebeklerde ilk altı ay yalnız anne sütü önerisinin gerekçesi aşağıdakilerden hangisidir?", "Anne Çocuk Sağlığı · 2023 Vize", f'<span style="color:var(--uyari)">{ic("yildiz", "i-fill i-s")}</span>')
          + "</main>" + sekmeler("Derslerim"), "9c", "Favoriler: bölümler mevcut kayıttan; işaretli sorular yeni kayıt ister (DESIGN.md §10)"),
    ekran(ust("Ders ekle", "Çocuk Gelişimi · AUZEF") + '<main class="icerik">'
          + f'<div class="alan" style="border-color:var(--cizgi);margin-bottom:10px">{ic("search", "i-s")}<span class="girdi" style="color:var(--metin-2)">Ders ara</span></div>'
          + '<div class="yatay" style="margin-bottom:6px"><span class="chip">1.</span><span class="chip">2.</span><span class="chip v">3. dönem</span><span class="chip">4.</span><span class="chip">5.</span><span class="chip">Başka bölüm</span></div>'
          + "".join(satir(d, "380 çıkmış soru",
                          f'<button class="dugme {"secili" if s else "cizgili"} yuvarlak" style="min-height:36px;padding:0 14px;font-size:14px">{"Derslerimde" if s else "Ekle"}</button>')
                    for d, s in dersler) + "</main>", "9d", "Ders ekleme: dönem çipleri, satırda tek eylem, eklenen durum metinle"),
]
sayfa("09-derslerim-favoriler", "Derslerim ve favoriler", k9)

# ---------- 10 ilerleme ----------
kutu = lambda s, a, r="": f'<div class="kutu"><b style="color:{r or "var(--metin)"}">{s}</b><span>{a}</span></div>'
yatay = lambda a, y, r="": f'<div class="cubuk-yatay"><span class="ad k2">{a}</span><div class="mini {r}"><i style="width:{y}%"></i></div><span class="yuzde say" style="min-width:40px">%{y}</span></div>'
k10 = [
    ekran(ust("İlerleme", "Bu cihazdaki ve eşitlenen kayıtlar", sol=None) + '<main class="icerik kabuk">'
          + '<div class="kutular">' + kutu("1.248", "çözülen soru") + kutu("%71", "son denemede doğru", "var(--dogru)")
          + kutu("642", "üst üste iki kez doğru") + kutu("186", "tekrar gereken", "var(--yanlis)") + "</div>"
          + '<p class="alt-baslik">Derslere göre doğru oranı</p>'
          + yatay("Erken Çocukluk Eğitimine Giriş", 82) + yatay("Anne Çocuk Sağlığı", 64) + yatay("Fiziksel Büyüme ve Motor Gelişim", 48) + yatay("Özel Eğitime Giriş", 0)
          + "</main>" + sekmeler("İlerleme"), "10a", "Genel: dört ölçü yalnız kayıtta olan veriden (son iki deneme), sahte seri ya da süre yok"),
    ekran(ust("Anne Çocuk Sağlığı", "96 / 380 soru çözüldü") + '<main class="icerik">'
          + '<div class="segment" style="grid-template-columns:1fr 1fr 1fr" role="tablist"><button class="dugme secili">Üniteler</button><button class="dugme">Sınavlar</button><button class="dugme">Konular</button></div>'
          + yatay("Ünite 1", 88) + yatay("Ünite 2", 71) + yatay("Ünite 3", 52) + yatay("Ünite 4", 31, "y") + yatay("Ünite 5", 0)
          + '<p class="alt-baslik">En çok yanlış yaptığın konular</p>'
          + satir("4.2 Bağışıklama takvimi", "9 yanlış", '<span class="chip y">Çöz</span>') + satir("3.1 Doğum öncesi bakım", "6 yanlış", '<span class="chip y">Çöz</span>')
          + "</main>", "10b", "Ders ayrıntısı: ünite, sınav, konu kırılımı; zayıf konudan tek dokunuşla çözme"),
    ekran(ust("İlerleme", sol=None) + '<main class="icerik kabuk" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:96px">'
          + f'<span class="simge-kare" style="width:64px;height:64px;border-radius:20px">{ic("grafik")}</span>'
          + '<h2 style="font-size:20px;margin:16px 0 6px">Henüz çözüm yok</h2><p style="color:var(--metin-2);max-width:30ch">İlk soruyu çözdüğünde doğru oranın ve tekrar gereken sorular burada görünür.</p>'
          + '<button class="dugme dolu" style="margin-top:20px">Derslerime git</button>'
          + '<button class="dugme" style="margin-top:6px;color:var(--vurgu-metin)">Kayıtlarım başka cihazda</button></main>'
          + sekmeler("İlerleme"), "10c", "Boş durum: ilk eyleme yönlendirir, kayıt getirme yolu da burada", koyu=True),
]
sayfa("10-ilerleme", "İlerleme ve istatistik", k10)

# ---------- 11 ayarlar ----------
k11 = [
    ekran(ust("Ayarlar", sol=None) + '<main class="icerik kabuk">'
          + '<p class="alt-baslik" style="margin-top:4px">Görünüm</p><div class="grup">' + ayar("Tema", "", '<span class="d">Sistem</span>' + SAG, "ay") + ayar("Yazı boyutu", "", '<span class="d">Büyük</span>' + SAG, "yazi") + "</div>"
          + '<p class="alt-baslik">Sesli okuma</p><div class="grup">' + ayar("Ses", "", '<span class="d k1" style="max-width:120px">Yelda</span>' + SAG, "ses") + ayar("Okuma hızı", "", '<span class="d say">1,2×</span>' + SAG, "otomatik") + ayar("Otomatik ilerle", "", ANAHTAR, "next") + "</div>"
          + '<p class="alt-baslik">Soru çözme</p><div class="grup">' + ayar("Cevabı hemen göster", "", ANAHTAR) + ayar("Açıklamaları göster", "", ANAHTAR) + ayar("Yanlış şıkları gizle", "", KAPALI) + "</div>"
          + '<p class="alt-baslik">Kayıtlar ve yapay zekâ</p><div class="grup">' + ayar("Eşitleme", "Google Drive · 2 dk önce", SAG, "bulut") + ayar("Yapay zekâ anahtarı", "Gemini · bu cihazda", SAG, "anahtar-i") + "</div>"
          + "</main>" + sekmeler("Ayarlar"), "11a", "Ayarlar: gruplar mevcut ayar anahtarlarıyla birebir (tema, yazı boyutu, quiz-settings, eşitleme, sağlayıcı)"),
    ekran(ust("Ayarlar", sol=None) + '<div class="perde"></div><div class="sayfa" role="dialog" aria-label="Görünüm"><div class="tutamac"></div>'
          + f'<div class="sayfa-b"><div class="t"><b>Görünüm</b></div><button class="dugme" aria-label="Kapat">{ic("x")}</button></div>'
          + '<div class="temalar">' + "".join(f'<div class="tema {"secili" if s else ""}"><i style="background:{r}"></i>{a}</div>' for a, r, s in
                                              [("Sistem", "linear-gradient(90deg,#F3F5F6 50%,#0D1418 50%)", True), ("Açık", "#F3F5F6", False), ("Koyu", "#0D1418", False), ("Sepya", "#F1E7D6", False)]) + "</div>"
          + '<p class="alt-baslik">Yazı boyutu</p><div class="kaydirici"><i style="width:66%"></i><b style="left:66%"></b></div>'
          + '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--metin-2)"><span>Küçük</span><span>Büyük</span></div>'
          + '<p class="soru" style="margin-top:14px;font-size:20px">Oyun, çocuğun gelişim alanlarının tümünü destekleyen temel etkinliktir.</p></div>',
          "11b", "Görünüm alt sayfası: tema ve yazı boyutu anında örnek metinde görünür"),
    ekran(ust("Eşitleme", "Kayıtların cihazlar arasında") + '<main class="icerik">'
          + f'<div class="kart vurgulu"><b>Google Drive</b><span class="ac">Son eşitleme 2 dk önce · 1.248 çözüm, 7 işaret</span><div class="kart-alt"><button class="dugme hafif" style="flex:1">{ic("yenile", "i-s")} Şimdi eşitle</button><button class="dugme cizgili" style="padding:0 12px">Bağlantıyı kes</button></div></div>'
          + '<p class="alt-baslik">Başka yol ekle</p><div class="grup">' + ayar("remoteStorage", "", SAG, "kalkan") + ayar("GitHub (şifreli)", "", SAG, "github") + ayar("Yakındaki cihaz", "", SAG, "cihaz") + "</div>"
          + '<p class="alt-baslik">Yedek dosyası</p><div class="grup">' + ayar("Yedeği indir", ".json, anahtarlar dahil değil", ic("indir", "i-s"), "indir") + ayar("Yedekten yükle", "Var olanla birleştirir", ic("yukle", "i-s"), "yukle") + "</div>"
          + '<div class="grup" style="margin-top:16px">' + ayar("Bu cihazdaki kayıtları sil", "", "", "", "tehlike") + "</div></main>",
          "11c", "Eşitleme: /yedek sayfasının uygulama içi hâli; silme onay ister"),
    ekran(ust("Yapay zekâ", "Açıklama ve Derse sor için") + '<main class="icerik">'
          + '<div class="yatay" style="margin-bottom:12px"><span class="chip v">Gemini</span><span class="chip">OpenAI</span><span class="chip">Anthropic</span><span class="chip">OpenRouter</span></div>'
          + f'<div class="alan" style="border-color:var(--cizgi)">{ic("anahtar-i", "i-s")}<span class="girdi say">AIza••••••••••••3fQ</span><button class="dugme" aria-label="Sil">{ic("cop", "i-s")}</button></div>'
          + '<a class="konu-link" style="margin-top:4px">Ücretsiz anahtar al ' + SAG + "</a>"
          + '<div class="grup" style="margin-top:8px">' + ayar("Model", "", '<span class="d">Gemini Flash</span>' + SAG) + ayar("Açıklamaları zenginleştir", "Soruda yapay zekâ açıklaması düğmesi", ANAHTAR) + "</div>"
          + f'<div class="bant v" style="margin-top:14px">{ic("kilit", "i-s")}<span class="t">Anahtar yalnız bu cihazda durur, yedeğe ve eşitlemeye girmez.</span></div></main>',
          "11d", "Yapay zekâ: kendi anahtarını getir (BYOK); anahtarın dışa aktarılmadığı ekranda söylenir"),
]
sayfa("11-ayarlar", "Ayarlar", k11)

# ---------- 12 PWA durumları ----------
k12 = [
    ekran(ana() + '<div class="perde"></div><div class="sayfa" role="dialog" aria-label="Ana ekrana ekle"><div class="tutamac"></div>'
          + f'<div class="sayfa-b"><div class="t"><b>Ana ekrana ekle</b><span>Uygulama gibi açılır, çevrimdışı da çalışır</span></div><button class="dugme" aria-label="Kapat">{ic("x")}</button></div>'
          + f'<div class="satir">{"<span class=simge-kare>1</span>"}<span class="t"><b>Paylaş düğmesine dokun</b><span>Safari alt çubuğunda</span></span>{ic("paylas")}</div>'
          + f'<div class="satir">{"<span class=simge-kare>2</span>"}<span class="t"><b>Ana Ekrana Ekle\'yi seç</b><span>Listede biraz aşağıda</span></span>{ic("arti-kare")}</div>'
          + '<div class="satir" style="border-bottom:0"><span class="simge-kare">3</span><span class="t"><b>Ekle\'ye dokun</b></span></div>'
          + '<button class="dugme hafif" style="width:100%;margin-top:8px">Bir daha gösterme</button></div>',
          "12a", "iOS kurulum rehberi: iOS'ta kurulum istemi yok, üç adım alt sayfada; Android'de yerel istem kullanılır"),
    ekran('<main class="icerik kabuk" style="inset:var(--sat) 0 0 0;padding-top:12px">'
          + f'<div class="bant v">{ic("yenile", "i-s")}<span class="t">Yeni sürüm hazır</span><button class="dugme dolu" style="min-height:36px;padding:0 14px;font-size:14px">Yenile</button></div>'
          + '<h1 class="baslik-buyuk" style="margin-top:14px">Bugün</h1>'
          + f'<div class="bant u" style="margin:10px 0 12px">{ic("wifi-yok", "i-s")}<span class="t">Çevrimdışısın. Açtığın dersler çalışır, sohbet ve eşitleme bağlantı gelince sürer.</span></div>'
          + '<p class="alt-baslik">Derslerim</p>'
          + ilerlemeli("Erken Çocukluk Eğitimine Giriş", "Bu cihazda hazır", 74) + ilerlemeli("Anne Çocuk Sağlığı", "Bu cihazda hazır", 25)
          + '<div class="satir" style="opacity:.55"><span class="t"><b class="k2">Oyun ve Oyun Materyalleri</b><span>Bağlantı gelince açılır</span></span></div>'
          + "</main>" + sekmeler("Ana sayfa"), "12b", "Güncelleme ve çevrimdışı bantları: hangi dersin cihazda olduğu satırda yazar"),
    ekran(ust("Sayfa bulunamadı", sol=("left", "Geri")) + '<main class="icerik" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:96px">'
          + f'<span class="simge-kare" style="width:64px;height:64px;border-radius:20px">{ic("kitap-ac")}</span>'
          + '<h2 style="font-size:20px;margin:16px 0 6px">Bu ders taşınmış olabilir</h2><p style="color:var(--metin-2);max-width:30ch">Ders kodu ya da bölüm adı değiştiyse arama aynı dersi bulur.</p>'
          + f'<div class="alan" style="border-color:var(--cizgi);margin-top:20px;width:100%;text-align:left">{ic("search", "i-s")}<span class="girdi">Erken çocukluk</span></div>'
          + '<button class="dugme dolu" style="margin-top:12px;width:100%">Ara</button></main>',
          "12c", "Hata ve 404: suçlama yok, aynı ekranda arama ile çıkış", koyu=True),
]
sayfa("12-pwa-durumlar", "PWA durumları", k12)
print("ok")
