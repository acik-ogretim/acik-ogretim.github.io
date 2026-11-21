#!/usr/bin/env python3
"""Proper names in a course book (people, peoples and civilizations, places, events, works, institutions, movements), one Gemini call per unit.

Usage: python3 scripts/adlar-uret.py <ders> [N ...] [--anlatim | --ek]
Reads src/data/calisma-odasi/<ders>.json (book text per topic) and writes
data/calisma-odasi/adlar/<ders>.json. Units already in the output are skipped, so a rerun only pays for
missing units. The packager (scripts/calisma-odasi-paketle.mjs) turns the entries into underlined concept terms.
"""
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent

ISTEM = """Aşağıda bir üniversite ders kitabının {unite}. ünitesi var; her konu "### <no> <başlık>" ile başlıyor.
Görev: metinde geçen ve sınavda sorulabilecek özel adları bul: kişiler (düşünür, bilim insanı, hükümdar, yazar), topluluk ve uygarlıklar (ör. Hititler), yerler, olaylar (savaş, antlaşma, devrim), eserler, kurumlar, akım ve okullar. Kaynakça listesindeki adları ve yalnız kaynak gösterimi için geçen yazar adlarını alma; görüşü metinde aktarılan yazarları al.
Her ad için şu alanları ver:
- "tur": "kisi", "topluluk", "yer", "olay", "eser", "kurum" ya da "akim".
- "terim": metinde en sık geçen yazımı; kişide yalnız soyadı ya da tek başına kullanılan ad (ör. "Marx", "İbn Haldun", "Hititler", "Kadeş Antlaşması"). Türkçe ek ve kesme işareti olmadan.
- "ad": tam adı (metinde yoksa yaygın tam yazımı).
- "yasam": kişide metinde doğum ve ölüm yılı yazıyorsa "1818-1883", öteki türlerde metinde tarih ya da dönem yazıyorsa o; yoksa null.
- "tanim": sınava çalışan bir öğrenci için 2-4 cümlelik Türkçe açıklama: kim ya da ne olduğu ve BU METİNDE ona atfedilen görüş, olay ya da önem. Metinde yazmayan iddia ekleme; metin yalnız alıntı yapıyorsa hangi konuda alıntılandığını söyle.
- "anahtar": metinde bu adla birlikte geçen en önemli kavramlar (en çok 5, metindeki yazımla).
- "konular": adın geçtiği konu numaraları (metindeki "### <no>" değerleri).
Yalnız geçerli bir JSON dizisi döndür, başka metin yazma.

{metin}
"""


TURLER = {"kisi": "kisi", "kişi": "kisi", "topluluk": "topluluk", "yer": "yer", "olay": "olay", "eser": "eser", "kurum": "kurum", "akim": "akim", "akım": "akim"}
# citation lists ("Anderson ve diğerleri", "Collins & Makowsky") and suffixed forms are not tags
KOTU_TERIM = re.compile(r"\bve\b|&|diğerleri|\bvd\.?|'|’|Sözlüğü")


def temizle(liste: list, gecerli: set[str]) -> list[dict]:
    """Gemini sometimes writes topic numbers as "### 1.3.5" and types as "Kişi" (21 Nov 2026: the whole unit 1 supplement
    was dropped because of that)."""
    temiz = []
    for x in liste:
        if not isinstance(x, dict) or not x.get("terim") or not x.get("tanim") or KOTU_TERIM.search(x["terim"]):
            continue
        x["konular"] = [n for n in (str(n).lstrip("#").strip() for n in x.get("konular") or []) if n in gecerli]
        x["tur"] = TURLER.get(str(x.get("tur") or "kisi").strip().lower(), "kisi")
        if x["konular"]:
            temiz.append(x)
    return temiz


def kucuk(s: str) -> str:
    return s.replace("I", "ı").replace("İ", "i").lower()


def siradan_sozcuk(terim: str, metin: str) -> bool:
    """True when the term also appears as an ordinary lowercase word in the course text ("Sosyoloji", "Toprak", "Güven",
    "Erdem", "Perşembe"): the page underlines terms case-insensitively, so such a surname would tag every ordinary use."""
    for m in re.finditer(r"(?<![\wçğıöşüÇĞİÖŞÜ])" + re.escape(kucuk(terim)) + r"(?![\wçğıöşü])", kucuk(metin)):
        if metin[m.start()].islower():
            return True
    return False


def json_dizi(cikti: str) -> list:
    """The JSON array in gapi's output. gapi prints a YAML-like record around the model text, so a greedy [.*] match can
    swallow trailing record fields; decode from the first "[ {" instead."""
    m = re.search(r"\[\s*\{", cikti)
    if not m:
        raise ValueError("JSON dizisi yok")
    return json.JSONDecoder().raw_decode(cikti[m.start():])[0]


def uret(ders: str, unite: int, konular: list[dict], alan: str = "metin") -> list[dict]:
    parcalar = [f"### {k['no']} {k['baslik']}\n{k[alan]}" for k in konular if k["unite"] == unite and k.get(alan)]
    istem = ISTEM.format(unite=unite, metin="\n\n".join(parcalar))
    sonuc = subprocess.run(
        ["gapi", "generate", "--stdin", "--stream=false", "--model", "gemini-3.8-flash"],
        input=istem,
        capture_output=True,
        text=True,
        timeout=600,
    )
    cikti = sonuc.stdout
    m = re.search(r"\[.*\]", cikti, re.S)
    if sonuc.returncode or not m:
        raise RuntimeError(f"ünite {unite}: Gemini yanıtı okunamadı: {sonuc.stderr[-400:] or cikti[:400]}")
    return temizle(json_dizi(cikti), {k["no"] for k in konular if k["unite"] == unite})


EK_ISTEM = """Aşağıda bir üniversite ders kitabının {unite}. ünitesinden konular ve metinde geçip özel adlar listesinde henüz bulunmayan aday adlar var.
Adaylardan gerçekten özel ad olanları (kişi, eser, kurum, olay, yer, topluluk, akım) al; metinde görüşü ya da çalışması anılan yazarları kaynak gösteriminde geçse bile al (ör. "Schaefer (2013) sosyolojiyi ... diye tanımlar"). Sıradan sözcükleri, başlıkları ve ay adlarını alma.
Her ad için şu alanları ver: "tur", "terim" (metindeki yazımı, kişide soyadı), "ad" (tam adı; metinde yoksa yaygın tam yazımı), "yasam" (metinde yazıyorsa, yoksa null), "tanim" (2-4 cümle: kim ya da ne olduğu ve BU METİNDE hangi görüş ya da konuyla anıldığı; metinde olmayan iddia ekleme), "anahtar" (en çok 5 kavram), "konular" (adın geçtiği "### <no>" değerleri).
Yalnız geçerli bir JSON dizisi döndür.

Adaylar: {adaylar}

{metin}
"""
ADAY_RE = [
    re.compile(r"\b([A-ZÇĞİÖŞÜ][a-zçğıöşüéèäë'-]+(?:[ \t]+(?:[A-ZÇĞİÖŞÜ]\.[ \t]*)*[A-ZÇĞİÖŞÜ][a-zçğıöşüéèäë'-]+)?)[ \t]*\([ \t]*\d{4}"),
    re.compile(r"\(\s*([A-ZÇĞİÖŞÜ][^,()\d]{2,40}?),\s*\d{4}"),
    re.compile(r"\*\*([A-ZÇĞİÖŞÜ][^*\n]{2,40}?)\*\*"),
]


def bilinen_adlar(kayit: dict) -> set[str]:
    """Full names and surnames already filed. Only the last word counts as a surname: matching any word dropped
    Richard T. Schaefer because another Richard was known (21 Nov 2026)."""
    adlar: set[str] = set()
    for alan in ("uniteler", "anlatimUniteler", "ekUniteler"):
        for liste in (kayit.get(alan) or {}).values():
            for x in liste:
                for a in (x.get("terim"), x.get("ad")):
                    if a:
                        adlar.add(a.lower())
                        adlar.add(a.split()[-1].lower())
    return adlar


YAYINEVI = re.compile(r"Yayın|Kitabevi|Basım|Yayınevi|Matbaa", re.I)


def ek_uret(unite: int, konular: list[dict], bilinen: set[str]) -> list[dict]:
    """Names the first passes missed (e.g. authors whose definitions the text quotes with a year), from a regex scan of
    the explanation and the book text, checked and described by Gemini (Zeki, 21 Nov 2026: Richard T. Schaefer was missing)."""
    secili = [k for k in konular if k["unite"] == unite]
    metin = "\n\n".join(f"### {k['no']} {k['baslik']}\n{k.get('anlatim') or ''}\n{k.get('metin') or ''}" for k in secili)
    adaylar = sorted({m.group(1).strip() for r in ADAY_RE for m in r.finditer(metin)})
    adaylar = [a.rstrip(":") for a in adaylar]
    adaylar = sorted({a for a in adaylar if a.lower() not in bilinen and a.split()[-1].lower() not in bilinen and not YAYINEVI.search(a) and 2 < len(a) < 45})
    if not adaylar:
        return []
    istem = EK_ISTEM.format(unite=unite, adaylar=", ".join(adaylar), metin=metin)
    sonuc = subprocess.run(["gapi", "generate", "--stdin", "--stream=false", "--model", "gemini-3.8-flash"], input=istem, capture_output=True, text=True, timeout=600)
    m = re.search(r"\[.*\]", sonuc.stdout, re.S)
    if sonuc.returncode or not m:
        raise RuntimeError(f"ünite {unite} ek: {sonuc.stderr[-300:] or sonuc.stdout[:300]}")
    return temizle(json_dizi(sonuc.stdout), {k["no"] for k in secili})


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    ders = sys.argv[1]
    secili = [int(a) for a in sys.argv[2:] if a.isdigit()]
    # --anlatim scans the written topic explanations too (they name people the book text only cites in passing)
    alan, anahtar = ("anlatim", "anlatimUniteler") if "--anlatim" in sys.argv else ("metin", "uniteler")
    paket = json.loads((KOK / "src" / "data" / "calisma-odasi" / f"{ders}.json").read_text())
    yol = KOK / "data" / "calisma-odasi" / "adlar" / f"{ders}.json"
    yol.parent.mkdir(parents=True, exist_ok=True)
    kayit = json.loads(yol.read_text()) if yol.exists() else {"ders": ders, "uniteler": {}}
    if "--ek" in sys.argv:
        # supplement pass: --ek [unit ...]; writes ekUniteler (merged by the packager like the other passes)
        bilinen = bilinen_adlar(kayit)
        tum_metin = "\n".join(f"{k.get('anlatim') or ''}\n{k.get('metin') or ''}" for k in paket["konular"])
        kayit.setdefault("ekUniteler", {})
        uniteler = secili or sorted({k["unite"] for k in paket["konular"]})
        with ThreadPoolExecutor(max_workers=7) as havuz:
            isler = {u: havuz.submit(ek_uret, u, paket["konular"], bilinen) for u in uniteler}
            for u, is_ in isler.items():
                try:
                    # append: an earlier supplement pass keeps its names
                    yeni = [x for x in is_.result() if not siradan_sozcuk(x["terim"], tum_metin)]
                    kayit["ekUniteler"][str(u)] = (kayit["ekUniteler"].get(str(u)) or []) + yeni
                    print(f"ünite {u}: {len(kayit['ekUniteler'][str(u)])} ek ad: " + ", ".join(x["terim"] for x in kayit["ekUniteler"][str(u)]))
                except Exception as hata:
                    print(hata, file=sys.stderr)
        yol.write_text(json.dumps(kayit, ensure_ascii=False, indent=1))
        return
    kayit.setdefault(anahtar, {})
    uniteler = secili or sorted({k["unite"] for k in paket["konular"]})
    eksik = [u for u in uniteler if secili or str(u) not in kayit[anahtar]]
    with ThreadPoolExecutor(max_workers=7) as havuz:
        islerin = {u: havuz.submit(uret, ders, u, paket["konular"], alan) for u in eksik}
        for u, is_ in islerin.items():
            try:
                kayit[anahtar][str(u)] = is_.result()
                print(f"ünite {u}: {len(kayit[anahtar][str(u)])} ad")
            except Exception as hata:  # one failed unit must not lose the others
                print(hata, file=sys.stderr)
    yol.write_text(json.dumps(kayit, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
