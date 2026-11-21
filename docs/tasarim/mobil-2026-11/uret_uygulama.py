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


def ekran(icerik, alt, aciklama, koyu=False, palet=""):
    tema = (' data-tema="koyu"' if koyu else "") + (f' data-palet="{palet}"' if palet else "")
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
            f'<link rel="stylesheet" href="ortak.css"></head><body>{SPRITE}<a class="galeri" href="index.html">‹ Tüm ekranlar</a><div class="sahne">{"".join(ekranlar)}</div></body></html>')
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
# ---------- 13 renk seçenekleri ----------
SORU = re.findall(r"<figure>.*?</figure>", (KOK / "01-soru-cozme.html").read_text(), re.S)[1]
SORU = re.sub(r"<figcaption>.*?</figcaption>", "", SORU)
PALETLER = [("", "Şimdiki: siyah beyaz", "Birincil eylem siyah, renk yalnız doğru, yanlış ve uyarı için; VS Code açık temasındaki gibi sade"),
            ("yesil", "Eski: deniz yeşili", "Önceki varsayılan; kalıp gibi durduğu için bırakıldı"),
            ("murekkep", "A. Mürekkep ve fosforlu kalem", "Lacivert mürekkep, kaldığın yer ve arama eşleşmesi fosforlu sarı; ders çalışırken kitabın altını çizme alışkanlığından"),
            ("okul", "B. Okulunun rengi", "Nötr zemin, vurgu öğrencinin üniversitesinin rengi (burada AUZEF bordosu); her okulda uygulama kendi kimliğine bürünür"),
            ("kobalt", "C. Kobalt", "Canlı kobalt mavisi; daha enerjik ve teknolojik, en az özgün olan seçenek"),
            ("kehribar", "D. Gece ve kehribar", "Koyu öncelikli; kehribar vurgu dinleme ve gece çalışması için, açık tema ikincil")]
k13 = []
for kod, ad, ack in PALETLER:
    k13.append(ekran(ana(), ad, ack, palet=kod))
    soru = SORU.replace('<div class="ekran"', f'<div class="ekran" data-palet="{kod}"', 1).replace(' data-palet=""', "")
    k13.append(soru.replace("</div></figure>", f"</div><figcaption>{ad}: soru çözme, cevaplanmış</figcaption></figure>"))
sayfa("13-renk-secenekleri", "Renk seçenekleri", k13)

# ---------- 14 iOS 26 tarzı cam ----------
def camla(h):
    return h.replace('<div class="ekran"', '<div class="ekran cam"', 1)
ekstra = ilerlemeli("Fiziksel Büyüme ve Motor Gelişim", "40 / 330 soru", 12) + ilerlemeli("Özel Eğitime Giriş", "0 / 260 soru", 0) + ilerlemeli("Çocuk Edebiyatı", "0 / 240 soru", 0)
ana_uzun = ana().replace("</main>", ekstra + "</main>", 1)
soru_cam = SORU.replace('<div class="ekran"', '<div class="ekran cam" data-palet="murekkep"', 1).replace("</div></figure>", "</div><figcaption>14b. Soru çözme: üst çubuk ve oynatıcı cam kapsül, soru metni altlarından akar</figcaption></figure>")
ayar_sayfa = k11[1].replace('<div class="ekran"', '<div class="ekran" data-palet="murekkep"', 1)
ayar_sayfa = re.sub(r"<figcaption>.*?</figcaption>", "<figcaption>14c. Alt sayfa kenarlardan ayrılır, köşeleri ekran köşesiyle eş merkezli</figcaption>", ayar_sayfa)
sayfa("14-ios-cam", "iOS 26 tarzı cam deneme", [
    camla(ekran(ana_uzun, "14a", "Sekme çubuğu yüzen cam kapsül; liste arkasından bulanık akar, seçili sekme hap içinde", palet="murekkep")),
    soru_cam, camla(ayar_sayfa),
    camla(ekran(ana_uzun, "14d", "Gece ve kehribar paletinde cam", palet="kehribar")),
])

# ---------- 15 alternatifler: Nano Banana, Stitch, sürü dili ----------
def resim(yol, alt, gen=880):
    return f'<figure style="max-width:{gen}px"><img src="{yol}" alt="" style="width:100%;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.2)"><figcaption style="max-width:{gen}px">{alt}</figcaption></figure>'
k15 = [
    resim("alternatifler/stitch-v1.jpg", "Stitch varyant 1, Bugün, modüler: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/stitch-v2.jpg", "Stitch varyant 2, Soru, uzamsal alt sayfa: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/stitch-v3.jpg", "Stitch varyant 3, Soru, kod ve terminal: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/stitch-v4.jpg", "Stitch varyant 4, Bugün, editoryal: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/stitch-v5.jpg", "Stitch varyant 5, Soru, iOS pro sade: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/stitch-v6.jpg", "Stitch varyant 6, Bugün, uzamsal odak: kendi Bugün ve soru ekranlarından siyah beyaz yönde yeniden yorum. Saf siyah zemin ve keskin beyaz düğmeler sert duruyor; 17 numaradaki sürü tonları bu yüzden seçildi.", 300),
    resim("alternatifler/kor-stitch.jpg", "Kör jüri, Stitch: koyu VS Code dili, eşaralıklı etiketler; canlı ders paneli altında zamanlı not akışı, vize geri sayımı, kulaklıkla dinleme kipi. GNO, öğretim üyesi, kullanıcı sayısı ve 'GPT-4o' modelin uydurmasıdır.", 360),
    resim("alternatifler/kor-1.jpg", "Kör jüri 1. Yalnız Zeki'nin sözleri verildi, kural ve şablon yok: koyu VS Code havası, video ve döküm, seri sayacı."),
    resim("alternatifler/kor-2.jpg", "Kör jüri 2. Canlı ders ve eş zamanlı döküm yan yana, yapay zekâ asistanı ayrı ekran."),
    resim("alternatifler/kor-3.jpg", "Kör jüri 3. Ders seçmede dönem çipleri, ders satırında Sınav, Özet, Sesli kısayolları. Üç kör jüri de bağımsız olarak koyu temaya ve 'e-Devlet ile giriş' ekranına gitti; sitede hesap olmadığı için giriş, kayıt getirme olarak kalır (7e)."),
    resim("alternatifler/nb-8-gece-yeni.jpg", "Nano Banana 8. Gece ve kehribar, yeni nesil: yüzen cam sekme çubuğu, oynat düğmesinin çevresinde halka ilerleme, büyük tipografi."),
    resim("alternatifler/nb-7-yz-sohbet.jpg", "Nano Banana 7. Yapay zekâ öncelikli: ana sayfa bir yazma alanı ve öneri çipleri, açıklama sohbet yanıtı gibi akar, sesli mod kehribar küre ve canlı altyazı. Sohbet ve sesli mod sitede zaten var; bu yön onları ana kapı yapar."),
    resim("alternatifler/nb-9-gunduz.jpg", "Nano Banana 9. Aynı dilin açık teması: sıcak beyaz yüzey, koyulaştırılmış kehribar, cam alt çubuk."),
    resim("alternatifler/nb-4-ios-murekkep.jpg", "Nano Banana 4. Yerel iOS 26 hissi, mürekkep laciverti: büyük başlık, gruplu ayar satırları, cam oynatıcı; açık oynatıcı alt sayfası 15 sn geri ve ileri ile. Resimde doğru şık yanlışlıkla A işaretli, açıklamadaki yan şerit eski maketten kopyalandı; ikisi de uygulamada düzeltilir."),
    resim("alternatifler/nb-5-ios-gece.jpg", "Nano Banana 5. iOS 26 koyu tema, kehribar vurgu, dinleme odaklı: oynatıcı alt sayfası arkadaki soruyu bulanıklaştırır. Doğru şık B doğru işaretli."),
    resim("alternatifler/nb-6-kagit-cam.jpg", "Nano Banana 6. Kâğıt ve cam: serif soru metni, ince çizgili ders listesi, cam yalnız alt çubukta. Doğru şık yanlışlıkla A işaretli."),
    resim("alternatifler/nb-1-murekkep.jpg", "Nano Banana 1. Mürekkep ve fosforlu kalem: serif başlıklar, ince çizgiler, gölgesiz düz yüzey, vurgu fosforlu sarı. Sorular ve son 7 gün grafiği modelin uydurmasıdır."),
    resim("alternatifler/nb-2-gece.jpg", "Nano Banana 2. Gece ve kehribar, sesli dinleme önde: oynatıcı ana öğe, dalga biçimi, 15 sn geri ve ileri. Haftalık grafik için tarihli kayıt gerekir (DESIGN.md §11)."),
    resim("alternatifler/nb-3-cam.jpg", "Nano Banana 3. iOS 26 cam: renkli bulanık içerik üstünde cam kartlar. Kişi fotoğrafı ve ders adları uydurmadır; sitede hesap ve profil yok."),
    resim("alternatifler/stitch-1-bugun.jpg", "Stitch, Bugün: sınav kâğıdı dili, sıfır köşe, kiremit vurgu, eşaralıklı etiketler. Vize geri sayımı ve ders kodları uydurmadır; sınav takvimi verisi eklenirse geri sayım gerçek olur.", 360),
    resim("alternatifler/stitch-2-soru.jpg", "Stitch, soru çözme: obsidyen ve kehribar koyu tema, doğru şık yeşil, alt oynatıcı tek satır kapsül.", 360),
    ekran(ana(), "15a", "Sürü dili, ana sayfa: panonun sıcak kâğıt zemini, kiremit vurgu, 8 px köşe, ince simge, serif başlık", palet="suru"),
    SORU.replace('<div class="ekran"', '<div class="ekran" data-palet="suru"', 1).replace("</div></figure>", "</div><figcaption>15b. Sürü dili, soru çözme: aynı bileşenler, yalnız belirteçler değişti</figcaption></figure>"),
    ekran(k10[0].split('<div class="ekran">',1)[1].rsplit('<div class="ana-cubuk">',1)[0].split('</div>',1)[1] if False else "", "", "") if False else "",
]
k15 = [x for x in k15 if x]
sayfa("15-alternatifler", "Alternatif tasarımlar", k15)

# ---------- 16 video, eş zamanlı konu anlatımı, canlı ders, kurs akışı ----------
VIDEO = lambda yazi, sure, yuzde, canli=False: (f'<div class="video"><div class="cerceve"></div><span class="yazi">{yazi}</span>'
    + (f'<span class="chip canli-chip" style="position:absolute;top:10px;left:10px">CANLI</span>' if canli else "")
    + f'<div class="alt">{ic("pause", "i-s i-fill")}<div class="mini"><i style="width:{yuzde}%"></i></div><span class="say">{sure}</span></div></div>')
dokum = [("02:10", "Oyun, çocuğun kendiliğinden seçtiği ve sürecin kendisinden keyif aldığı etkinliktir."),
         ("02:24", "Bu yüzden oyun, gelişim alanlarının hepsini aynı anda destekler: bedensel, bilişsel, dil ve sosyal-duygusal."),
         ("02:41", "Piaget oyunu üç evrede inceler: alıştırma oyunu, sembolik oyun ve kurallı oyun."),
         ("02:58", "Sembolik oyun iki yaş civarında başlar; çocuk bir nesneyi başka bir şeymiş gibi kullanır.")]
k16 = [
    ekran(ust("Oyun ve Oyun Materyalleri", "Ünite 2 · Konu anlatımı") + '<main class="icerik">'
          + VIDEO("Piaget oyunu üç evrede inceler", "02:41 / 18:20", 15)
          + '<div class="segment" style="grid-template-columns:1fr 1fr 1fr;margin-top:12px"><button class="dugme secili">Anlatım</button><button class="dugme">Özet</button><button class="dugme">Sorular · 12</button></div>'
          + '<div class="dokum">' + "".join(f'<p class="{"simdi" if i == 2 else ""}"><span class="zm">{z}</span><span>{t}</span></p>' for i, (z, t) in enumerate(dokum)) + "</div></main>",
          "16a", "Video ve eş zamanlı anlatım: konuşulan cümle fosforla işaretlenir, zamana dokununca video oraya atlar; metin kitap ünitesinden ya da podcast senaryosundan gelir", palet="murekkep"),
    ekran(ust("Canlı ders: Ünite 4 tekrarı", "Çocuk Gelişimi · 20.00", sag=("sohbet", "Sohbet")) + '<main class="icerik">'
          + VIDEO("Erken çocukluk dönemi değerlendirme", "38 dk", 62, canli=True)
          + '<div class="kart" style="margin-top:12px"><span class="chip u" style="margin-bottom:8px">Hızlı soru · 45 sn</span><b class="k2">Sembolik oyun en erken hangi yaşta görülür?</b>'
          + '<div style="display:grid;gap:8px;margin-top:10px">' + "".join(f'<div class="cubuk-yatay"><span class="ad" style="width:120px">{a}</span><div class="mini"><i style="width:{y}%"></i></div><span class="yuzde say">%{y}</span></div>' for a, y in [("A) 6 ay", 8), ("B) 2 yaş", 71), ("C) 5 yaş", 21)]) + "</div></div>"
          + '<p class="alt-baslik">Sorular · en çok oy alan üstte</p>'
          + satir("Kurallı oyun ile oyun kuralı arasında fark var mı?", "▲ 14 · cevaplandı", "") + satir("Vizede kaç soru bu üniteden çıkar?", "▲ 9", "")
          + "</main>", "16b", "Canlı ders: yayın, anlık soru ve oylanan sorular; yayın YouTube Live gömmesiyle, sorular giscus ya da gerçek zamanlı kanalla (LMS-PLANI.md)", palet="murekkep"),
    ekran(ust("Hafta 4", "Oyun ve Oyun Materyalleri · Ünite 4") + '<main class="icerik">'
          + '<div class="mini" style="margin:0 0 12px"><i style="width:60%"></i></div>'
          + "".join(f'<div class="oge"><span class="simge-kare" style="{st}">{ic(s, "i-s")}</span><span class="t"><b class="k2">{a}</b><span>{b}</span></span>{r}</div>' for s, a, b, r, st in [
              ("play", "Konu anlatımı videosu", "18 dk · izlendi", ic("check", "i-s"), "background:var(--dogru-zemin);color:var(--dogru)"),
              ("kitap-ac", "Ünite 4 ders kitabı", "PDF · 24 sayfa", ic("check", "i-s"), "background:var(--dogru-zemin);color:var(--dogru)"),
              ("ses", "Ünite özeti podcast", "12 dk · yarıda kaldı", '<span class="chip v">Sürdür</span>', ""),
              ("hedef", "Ünite sonu deneme", "10 soru", SAG, ""),
              ("canli", "Canlı tekrar dersi", "Perşembe 20.00", '<span class="chip">Takvime ekle</span>', ""),
              ("dosya", "Ödev: oyun materyali tasarla", "Teslim 28 Kasım", SAG, "")])
          + "</main>", "16c", "Kurs akışı: haftalık modül, sıra ve tamamlanma; LMS'deki ders yapısının telefondaki hâli", palet="murekkep"),
]
sayfa("16-video-canli-ders", "Video, canlı ders ve kurs akışı", k16)

# ---------- 17 önerilen dil ----------
def ana_yeni():
    ders = [("Erken Çocukluk Eğitimine Giriş", "312 / 420 soru", 74), ("Anne Çocuk Sağlığı", "96 / 380 soru", 25),
            ("Oyun ve Oyun Materyalleri", "0 / 210 soru", 0), ("Fiziksel Büyüme ve Motor Gelişim", "40 / 330 soru", 12)]
    return ('<main class="icerik kabuk" style="inset:var(--sat) 0 0 0;padding-top:14px">'
            f'<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1"><h1 class="baslik-buyuk">Bugün</h1>'
            '<p style="color:var(--metin-2);font-size:14px;margin-top:6px">AUZEF · Çocuk Gelişimi · 3. dönem</p></div>'
            f'<button class="dugme hafif yuvarlak" aria-label="Derse sor">{ic("sohbet")}</button></div>'
            '<div class="kahraman" style="margin-top:18px"><div class="t"><small>Kaldığın yer</small><b class="k2">Erken Çocukluk Eğitimine Giriş</b><span>Ünite 4 · Soru 12 / 40</span><div class="mini" style="margin-top:12px"><i style="width:30%"></i></div></div>'
            f'<button class="halka" style="--i:30%" aria-label="Devam et">{ic("play", "i-fill")}</button></div>'
            '<div class="ikili"><div class="y"><b>19</b><span>tekrar gereken soru</span></div><div><b>%71</b><span>son denemede doğru</span></div></div>'
            '<p class="alt-baslik">Derslerim</p>' + "".join(ilerlemeli(a, b, c) for a, b, c in ders) + "</main>" + sekmeler("Ana sayfa"))

def yenile(h, koyu, vurgu=""):
    h = h.replace('<div class="ekran"', '<div class="ekran yeni cam"' + (' data-tema="koyu"' if koyu else "") + (f' data-vurgu="{vurgu}"' if vurgu else ""), 1)
    return h.replace(' data-tema="koyu" data-tema="koyu"', ' data-tema="koyu"')

oynatici = re.findall(r"<figure>.*?</figure>", (KOK / "02-oynatici.html").read_text(), re.S)[1]
oynatici = re.sub(r"<figcaption>.*?</figcaption>", "<figcaption>17c. Oynatıcı alt sayfası: kenardan ayrık cam, eş merkezli köşeler</figcaption>", oynatici)
soru_yeni = lambda alt, ack: re.sub(r"<figcaption>.*?</figcaption>", "", SORU).replace("</div></figure>", f"</div><figcaption>{alt}. {ack}</figcaption></figure>")
k17 = [
    yenile(ekran(ana_yeni(), "17a", "Ana sayfa, koyu: sürü panosunun koyu kademeleri, %9 kenar, serif başlık; vurgu yalnız devam düğmesinde, ilerleme ve sekme nötr"), True),
    yenile(soru_yeni("17b", "Soru çözme, koyu: vurgu yalnız Sonraki soru düğmesinde; oynatıcı, simgeler ve konu bağlantısı nötr"), True),
    yenile(oynatici, True),
    yenile(ekran(ana_yeni(), "17d", "Aynı dil açık temada: panonun açık kâğıt yüzeyleri"), False),
    yenile(soru_yeni("17e", "Soru çözme, açık"), False),
]
sayfa("17-onerilen-dil", "Önerilen dil: sürü panosu tonları ve yeni nesil", k17)

# ---------- 18 renk oyunu ----------
VURGULAR = [("", "Mavi", "VS Code'un vurgusuna yakın yumuşak mavi; doğru ve yanlış renkleriyle karışmaz"),
            ("kehribar", "Kehribar", "Sıcak, dinleme ve gece çalışmasına uygun; uyarı sarısına yakın, uyarılar ayrı simgeyle verilir"),
            ("kiremit", "Kiremit", "Sürü panosunun rengi; yanlış şıkla neredeyse aynı parlaklıkta, soru ekranında karışır"),
            ("notr", "Nötr", "Hiç renk yok, birincil düğme bir ton açık yüzey ve ince kenar; en sakin, en VS Code")]
k18 = []
for kod, ad, ack in VURGULAR:
    k18.append(yenile(ekran(ana_yeni(), ad, ack), True, kod))
    k18.append(yenile(soru_yeni(ad, "soru çözme"), True, kod))
sayfa("18-renk-oyunu", "Önerilen dilde vurgu rengi seçenekleri", k18)

# ---------- 19 tema 17 üstünde düzeltmeler ----------
sayfa("19-tema17-duzeltmeler", "Tema 17 üstünde Stitch ve Nano Banana düzeltmeleri", [
    resim("alternatifler/nb-10-tema17.jpg", "Nano Banana, koyu: 17'nin ekranları ve tema belirteçleri verildi, yalnız boşluk, hizalama ve hiyerarşi düzeltildi. Renkler ve içerik korundu."),
    resim("alternatifler/nb-11-tema17-acik.jpg", "Nano Banana, açık: aynı ekranların açık teması; derin mavi tek vurgu, cam alt çubuk ve oynatıcı."),
    resim("alternatifler/stitch-tema17-1.jpg", "Stitch, Bugün: tema birebir uygulandı; ders satırları ayrı kartlar, sayılar sağda iki satır, ilerleme nötr. Profil simgesi eklemiş, sitede profil yok.", 380),
    resim("alternatifler/stitch-tema17-2.jpg", "Stitch, soru: soru metni serif ve büyük, şıklar daha yüksek, oynatıcı tek satır kompakt. Üst başlığı İngilizce yazmış, '1 Puan' ve 'Doğruluk oranı %68' uydurma; uygulamada çıkarılır.", 380),
])

# ---------- 20 yapıya uygun ders sayfası ----------
def qkart(sinav, soru, siklar, durum=None, aciklama=None, konu=None):
    sat = f'<div class="ust-sat"><span class="chip">{sinav}</span>' + (f'<span class="k1" style="font-size:13px;color:var(--metin-2)">{konu}</span>' if konu else "") + "</div>"
    sk = ""
    for h, t in siklar:
        sinif = {"d": "dogru", "y": "yanlis", "s": "soluk"}.get((durum or {}).get(h, ""), "")
        isaret = ic("check", "i-s") if sinif == "dogru" else ic("x", "i-s") if sinif == "yanlis" else ""
        sk += f'<div class="sik {sinif}"><span class="h">{h}</span><span class="m">{t}</span><span class="d">{isaret}</span></div>'
    ac = ""
    if aciklama == "yok":
        ac = f'<div class="ac-yok">{ic("bilgi" if False else "sohbet", "i-s")}<span style="flex:1">Açıklama yok · <b>Yapay zekâ ile açıkla</b></span>{SAG}</div>'
    elif aciklama:
        ac = (f'<div class="aciklama"><div class="aciklama-b">{ic("dosya", "i-s")}<b>Açıklama</b><button class="dugme hafif yuvarlak" aria-label="Seslendir">{ic("ses", "i-s")}</button>'
              f'<button class="dugme hafif yuvarlak" aria-label="Derse sor">{ic("sohbet", "i-s")}</button></div><p>{aciklama}</p><p class="kaynak">Ünite 4, s. 82</p></div>')
    return f'<div class="qkart"><p class="soru">{soru}</p>{sat if False else ""}{sk}{ac}</div>'.replace('<div class="qkart"><p', f'<div class="qkart">{sat}<p', 1)

SIK1 = [("A", "Toplumsal sözleşme kuramı"), ("B", "Güç (zor) kuramı"), ("C", "Ailecilik kuramı"), ("D", "Teokratik kuram"), ("E", "Organik kuram")]
SIK2 = [("A", "Mutlak monarşi"), ("B", "Meşruti monarşi"), ("C", "Oligarşi"), ("D", "Teokrasi"), ("E", "Cumhuriyet")]
UST20 = lambda alt: ust("Devlet Teorisi", alt, sag=("liste", "İçindekiler"))
SERIT = '<div class="serit"><span class="chip">Ü 2</span><span class="chip">Ü 3</span><span class="chip secili">Ü 4</span><span class="chip">Ü 5</span><span class="chip">Ü 6</span><span class="chip">Ü 7</span></div>'
KIP = lambda c: f'<div class="segment" style="margin:0 0 10px"><button class="dugme {"secili" if c == 0 else ""}">Okuma</button><button class="dugme {"secili" if c == 1 else ""}">Çözme</button></div>'
GIRIS = ('<div class="giris"><h2>Devlet Teorisi</h2><p style="color:var(--metin-2);font-size:14px">Anadolu AÖF · SBY103U · 2017-2025 arası 9 yılın soruları</p>'
         f'<div class="yatay" style="margin-top:10px;flex-wrap:wrap"><span class="chip">{ic("kitap-ac", "i-s")} Materyaller</span><span class="chip">{ic("play", "i-s")} Video özeti</span><span class="chip">{ic("sohbet", "i-s")} Tartış</span></div></div>')
OYN = (f'<nav class="bar" aria-label="Oynatıcı"><div class="ilerle"><i style="width:30%"></i></div><button class="dugme" aria-label="Önceki">{ic("prev")}</button>'
       f'<button class="dugme" aria-label="Soruyu oku">{ic("ses")}</button><button class="dugme oynat" aria-label="Oynat">{ic("play", "i-fill")}</button>'
       f'<button class="dugme" aria-label="Süzgeç">{ic("ayar")}</button><button class="dugme" aria-label="Sonraki">{ic("next")}</button></nav>')
ACK1 = "Toplumsal sözleşme kuramına göre devlet, doğa durumundan çıkmak isteyen bireylerin özgür iradeleriyle yaptıkları bir sözleşmeyle kurulur."
k20 = [
    ekran(UST20("Ü 4 · 12 / 40") + '<main class="icerik" style="padding-bottom:0">' + KIP(0) + GIRIS + SERIT
          + qkart("2023 Final", "Devletin ortaya çıkışını açıklayan kuramlardan hangisi, devleti bireylerin sözleşmesinin ürünü olarak görür?", SIK1, {"A": "d", "B": "s", "C": "s", "D": "s", "E": "s"}, ACK1)
          + "</main>" + OYN, "20a", "Ders sayfası, okuma kipi: ders girişi kartı, ünite şeridi, liste hâlinde kutusuz sorular; cevap ve açıklama açık gelir (showAnswers)"),
    ekran(UST20("Ü 4 · 13 / 40") + '<main class="icerik" style="padding-bottom:0">' + KIP(1) + SERIT
          + qkart("2022 Vize", "Yönetimin dinî kurallara ve din adamlarına dayandığı devlet biçimi hangisidir?", SIK2, {"A": "y", "B": "s", "C": "s", "D": "d", "E": "s"}, "yok")
          + qkart("2023 Final", "Devletin ortaya çıkışını açıklayan kuramlardan hangisi, devleti bireylerin sözleşmesinin ürünü olarak görür?", SIK1)
          + "</main>" + OYN, "20b", "Çözme kipi: cevaplanan soru sonucu gösterir, sıradaki soru altında bekler; açıklaması olmayan soruda tek satır yapay zekâ önerisi"),
    ekran(UST20("Ü 4 · 12 / 40") + '<div class="perde"></div><div class="sayfa" role="dialog" aria-label="İçindekiler" style="max-height:78%"><div class="tutamac"></div>'
          + f'<div class="sayfa-b"><div class="t"><b>İçindekiler</b><span>8 ünite · 312 soru</span></div><button class="dugme" aria-label="Kapat">{ic("x")}</button></div>'
          + "".join(ilerlemeli(f"Ünite {n}: {a}", f"{q} soru", y) for n, a, q, y in [(2, "Devletin unsurları", 40, 88), (3, "Devlet ve egemenlik", 38, 71), (4, "Devletin kuruluşu, kuramlar ve sona ermesi", 42, 52), (5, "Devlet biçimleri", 39, 0)])
          + '<p class="kaynak" style="margin-top:10px">Bu derste kitap konu ağacı yok; konu düzeyi yalnız konu ağacı olan derslerde açılır.</p></div>',
          "20c", "İçindekiler: her derste ünite düzeyi; konu satırları yalnız konu verisi olan derste (6 ders) eklenir"),
    ekran(UST20("Ü 4 · 12 / 40") + '<div class="perde"></div><div class="sayfa" role="dialog" aria-label="Süzgeç"><div class="tutamac"></div>'
          + f'<div class="sayfa-b"><div class="t"><b>Süzgeç</b><span>Bu derste 312 sorudan 41\'i gösteriliyor</span></div><button class="dugme" aria-label="Kapat">{ic("x")}</button></div>'
          + '<p class="alt-baslik" style="margin-top:4px">Soru türü</p><div class="yatay"><span class="chip secili v">Yanlışlarım · 19</span><span class="chip">Cevaplanmamış · 22</span></div>'
          + '<p class="alt-baslik">Sınav</p><div class="yatay" style="flex-wrap:wrap"><span class="chip">Tümü</span><span class="chip v">Final</span><span class="chip">Vize</span><span class="chip">Bütünleme</span></div>'
          + '<p class="alt-baslik">Kaynak</p><div class="yatay"><span class="chip v">Çıkmış sorular</span><span class="chip">Ünite sonu</span><span class="chip">Deneme</span></div>'
          + '<p class="alt-baslik">Ünite</p><div class="yatay"><span class="chip">Tümü</span><span class="chip v">Ü 4</span><span class="chip">Ü 5</span></div>'
          + '<div style="display:flex;gap:8px;margin-top:16px"><button class="dugme cizgili" style="flex:1">Sıfırla</button><button class="dugme dolu" style="flex:2">Uygula</button></div></div>',
          "20d", "Süzgeç alt sayfası: ayar penceresindeki ders bağlamlı süzgeçler (soru türü, sınav, kaynak, ünite) ders sayfasına taşınır; quiz-settings anahtarları aynı"),
    ekran(ust("Ara", sol=None) + '<main class="icerik kabuk">'
          + f'<div class="alan" style="border-color:var(--cizgi)">{ic("search", "i-s")}<span class="girdi">devlet</span><button class="dugme" aria-label="Temizle">{ic("x", "i-s")}</button></div>'
          + '<div class="yatay" style="margin:12px 0 4px"><span class="chip v">Dersler · 7</span><span class="chip">Bölümler · 1</span></div>'
          + "".join(satir(f"<mark>Devlet</mark>{a}", b, SAG) for a, b in [(" Teorisi", "Anadolu AÖF · Siyaset Bilimi · 1. dönem"), (" Teorisi", "ATA-AÖF · Kamu Yönetimi · 1. dönem"), (" ve Toplum", "AUZEF · Sosyoloji · 3. dönem"), ("lerarası İlişkiler", "AUZEF · Uluslararası İlişkiler · 2. dönem")])
          + '<p class="kaynak" style="margin-top:12px">Soru araması ders sayfasında, dersin içinde yapılır.</p></main>' + sekmeler("Ara"),
          "20e", "Ara sekmesi: 10.988 derslik katalogda ders ve bölüm araması; soru araması ders içinde kalır"),
    ekran(UST20("Ü 4 · 13 / 40") + '<main class="icerik" style="padding-bottom:0">' + KIP(1) + SERIT
          + qkart("2023 Final", "Devletin ortaya çıkışını açıklayan kuramlardan hangisi, devleti bireylerin sözleşmesinin ürünü olarak görür?", SIK1, {"A": "d", "B": "y", "C": "s", "D": "s", "E": "s"}, ACK1)
          + "</main>" + OYN, "20f", "Çözme kipi, koyu tema", koyu=True),
]
sayfa("20-yapiya-uygun", "Yapıya uygun ders sayfası", k20)
URUN_EK = ["20-yapiya-uygun"]

# ---------- tema 17'yi ürün ekranlarına uygula ----------
URUN = ["01-soru-cozme", "02-oynatici", "03-arama", "04-sohbet", "05-unite-konu-yanlislar", "06-ozet-okuma",
        "07-karsilama-giris", "08-ana-sayfa", "09-derslerim-favoriler", "10-ilerleme", "11-ayarlar", "12-pwa-durumlar", "16-video-canli-ders"] + URUN_EK
for ad in URUN:
    f = KOK / f"{ad}.html"; t = f.read_text()
    t = re.sub(r'<div class="ekran"(?! yeni)', '<div class="ekran yeni"', t)
    t = re.sub(r'<div class="ekran cam"', '<div class="ekran yeni cam"', t)
    t = t.replace(' data-palet="murekkep"', "")
    f.write_text(t)

# ---------- galeri: plan yapısında ----------
BOLUMLER = [
    ("Tasarım dili", "Tema 17: sürü panosunun tonları, koyu ve açık eş değer, vurgu yalnız birincil eylemde, belirteçler temel ve öğrenme diye iki katman.",
     [("17-onerilen-dil", "Önerilen dil", "var"), ("18-renk-oyunu", "Vurgu seçenekleri", "karar")]),
    ("Kabuk ve giriş", "Beş sekme; ders sayfası tam ekran. Sitede hesap yok, giriş kayıt getirmedir.",
     [("07-karsilama-giris", "Karşılama, okul seçimi, kayıt getirme", "yeni"), ("08-ana-sayfa", "Bugün", "yeni")]),
    ("Keşif ve Derslerim", "/[üniversite], /[bölüm] ve favori dersler.",
     [("09-derslerim-favoriler", "Derslerim, favoriler, ders ekleme", "var")]),
    ("Ders sayfası", "/[ders]: uzun liste, okuma ve çözme kipi, ünite şeridi; özet ve video yalnız verisi olan derste.",
     [("20-yapiya-uygun", "Yapıya uygun ders sayfası (UYUM.md)", "var"), ("01-soru-cozme", "Soru çözme", "var"), ("02-oynatici", "Oynatıcı", "var"), ("03-arama", "Arama", "var"),
      ("04-sohbet", "Derse sor", "var"), ("05-unite-konu-yanlislar", "Ünite, konu, yanlışlarım", "var"),
      ("06-ozet-okuma", "Özet okuma", "var"), ("16-video-canli-ders", "Video ve döküm, canlı ders, kurs akışı", "veri gerekir")]),
    ("İlerleme, ayarlar, sistem", "Kayıtlardan hesaplanan ölçüler; tek ayar sekmesi; PWA durumları.",
     [("10-ilerleme", "İlerleme", "yeni"), ("11-ayarlar", "Ayarlar", "var"), ("12-pwa-durumlar", "Ana ekrana ekle, çevrimdışı, 404", "yeni")]),
    ("Denemeler (arşiv)", "Karar sürecinde üretilen renk, cam, kör jüri, Stitch ve Nano Banana denemeleri.",
     [("13-renk-secenekleri", "İlk renk seçenekleri", "arşiv"), ("14-ios-cam", "iOS cam denemesi", "arşiv"),
      ("15-alternatifler", "Alternatifler ve kör jüri", "arşiv"), ("19-tema17-duzeltmeler", "Tema 17 üstünde düzeltmeler", "arşiv")]),
]
RENK = {"var": "#1C6E3F", "yeni": "#1F56A3", "veri gerekir": "#8A5A00", "karar": "#5C5C5C", "arşiv": "#8A8A8A"}
govde = ""
for baslik, ack, ogeler in BOLUMLER:
    govde += f"<section><h2>{baslik}</h2><p>{ack}</p><ul>"
    for ad, et, durum in ogeler:
        govde += f'<li><a href="{ad}.html"><span class="no">{ad[:2]}</span><span class="ad">{et}</span><span class="dz" style="color:{RENK[durum]}">{durum}</span></a></li>'
    govde += "</ul></section>"
(KOK / "index.html").write_text(
    '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    '<title>Açık Öğretim Portal mobil tasarım</title><style>'
    'body{font-family:system-ui;background:#FCFCFB;color:#151515;margin:0;padding:32px 20px}main{max-width:680px;margin:auto}'
    'h1{font:600 30px/1.15 ui-serif,Georgia,serif;margin:0 0 8px}h2{font:600 20px/1.2 ui-serif,Georgia,serif;margin:28px 0 4px}'
    'p{color:#525252;line-height:1.5;margin:0 0 10px}ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}'
    'a{display:flex;gap:12px;align-items:center;min-height:52px;padding:0 16px;background:#fff;border:1px solid hsla(0,0%,8%,.1);border-radius:16px;color:#151515;text-decoration:none;font-weight:600}'
    'a:hover{border-color:#2563B8}.no{color:#525252;font-variant-numeric:tabular-nums;width:24px}.ad{flex:1}.dz{font-size:13px;font-weight:600}'
    '.lejant{font-size:13px;color:#525252;margin-top:6px}</style></head><body><main>'
    '<h1>Mobil öncelikli tasarım, Kasım 2026</h1>'
    '<p>Maketler sitenin rotalarına ve kayıtlarına göre gruplandı; tümü tema 17 ile üretildi. Plan ve veri eşlemesi PLAN.md içinde.</p>'
    '<p class="lejant"><b style="color:#1C6E3F">var</b>: kod ve veri hazır, yeni dile giydirilir · <b style="color:#1F56A3">yeni</b>: veri var, ekran yeni · '
    '<b style="color:#8A5A00">veri gerekir</b>: önce kayıt ya da veri dosyası eklenir</p>'
    + govde + "</main></body></html>")
print("ok")
