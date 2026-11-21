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
    liste = json.loads(m.group(0))
    gecerli = {k["no"] for k in konular if k["unite"] == unite}
    temiz = []
    for x in liste:
        if not isinstance(x, dict) or not x.get("terim") or not x.get("tanim"):
            continue
        x["konular"] = [n for n in x.get("konular") or [] if n in gecerli]
        if x["konular"]:
            temiz.append(x)
    return temiz


EK_ISTEM = """Aşağıda bir üniversite ders kitabının {unite}. ünitesinden konular ve metinde geçip özel adlar listesinde henüz bulunmayan aday adlar var.
Adaylardan gerçekten özel ad olanları (kişi, eser, kurum, olay, yer, topluluk, akım) al; metinde görüşü ya da çalışması anılan yazarları kaynak gösteriminde geçse bile al (ör. "Schaefer (2013) sosyolojiyi ... diye tanımlar"). Sıradan sözcükleri, başlıkları ve ay adlarını alma.
Her ad için şu alanları ver: "tur", "terim" (metindeki yazımı, kişide soyadı), "ad" (tam adı; metinde yoksa yaygın tam yazımı), "yasam" (metinde yazıyorsa, yoksa null), "tanim" (2-4 cümle: kim ya da ne olduğu ve BU METİNDE hangi görüş ya da konuyla anıldığı; metinde olmayan iddia ekleme), "anahtar" (en çok 5 kavram), "konular" (adın geçtiği "### <no>" değerleri).
Yalnız geçerli bir JSON dizisi döndür.

Adaylar: {adaylar}

{metin}
"""
ADAY_RE = [
    re.compile(r"\b([A-ZÇĞİÖŞÜ][a-zçğıöşüéèäë'-]+(?:\s+(?:[A-ZÇĞİÖŞÜ]\.\s*)*[A-ZÇĞİÖŞÜ][a-zçğıöşüéèäë'-]+)?)\s*\(\s*\d{4}"),
    re.compile(r"\(\s*([A-ZÇĞİÖŞÜ][^,()\d]{2,40}?),\s*\d{4}"),
    re.compile(r"\*\*([A-ZÇĞİÖŞÜ][^*]{2,40}?)\*\*"),
]


def bilinen_adlar(kayit: dict) -> set[str]:
    adlar: set[str] = set()
    for alan in ("uniteler", "anlatimUniteler", "ekUniteler"):
        for liste in (kayit.get(alan) or {}).values():
            for x in liste:
                for a in (x.get("terim"), x.get("ad")):
                    if a:
                        adlar.add(a.lower())
                        adlar.update(p.lower() for p in a.split() if len(p) > 3)
    return adlar


def ek_uret(unite: int, konular: list[dict], bilinen: set[str]) -> list[dict]:
    """Names the first passes missed (e.g. authors whose definitions the text quotes with a year), from a regex scan of
    the explanation and the book text, checked and described by Gemini (Zeki, 21 Nov 2026: Richard T. Schaefer was missing)."""
    secili = [k for k in konular if k["unite"] == unite]
    metin = "\n\n".join(f"### {k['no']} {k['baslik']}\n{k.get('anlatim') or ''}\n{k.get('metin') or ''}" for k in secili)
    adaylar = sorted({m.group(1).strip() for r in ADAY_RE for m in r.finditer(metin)})
    adaylar = [a for a in adaylar if a.lower() not in bilinen and not any(p.lower() in bilinen for p in a.split() if len(p) > 3) and 2 < len(a) < 45]
    if not adaylar:
        return []
    istem = EK_ISTEM.format(unite=unite, adaylar=", ".join(adaylar), metin=metin)
    sonuc = subprocess.run(["gapi", "generate", "--stdin", "--stream=false", "--model", "gemini-3.8-flash"], input=istem, capture_output=True, text=True, timeout=600)
    m = re.search(r"\[.*\]", sonuc.stdout, re.S)
    if sonuc.returncode or not m:
        raise RuntimeError(f"ünite {unite} ek: {sonuc.stderr[-300:] or sonuc.stdout[:300]}")
    gecerli = {k["no"] for k in secili}
    temiz = []
    for x in json.loads(m.group(0)):
        if isinstance(x, dict) and x.get("terim") and x.get("tanim"):
            x["konular"] = [n for n in x.get("konular") or [] if n in gecerli]
            if x["konular"]:
                temiz.append(x)
    return temiz


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
        kayit.setdefault("ekUniteler", {})
        uniteler = secili or sorted({k["unite"] for k in paket["konular"]})
        with ThreadPoolExecutor(max_workers=7) as havuz:
            isler = {u: havuz.submit(ek_uret, u, paket["konular"], bilinen) for u in uniteler}
            for u, is_ in isler.items():
                try:
                    kayit["ekUniteler"][str(u)] = is_.result()
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
