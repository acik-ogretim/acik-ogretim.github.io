#!/usr/bin/env python3
"""Proper names in a course book (people, peoples and civilizations, places, events, works, institutions, movements), one Gemini call per unit.

Usage: python3 scripts/adlar-uret.py <ders> [--unite N ...]
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
