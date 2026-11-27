#!/usr/bin/env python3
"""Anadolu AÖF'te en çok bölümde okutulan dersler için elimizdeki içeriğin kapsam denetimi.

Her ders için: kaç bölümde okutulduğu (ORT kodları hariç), ders kategorisi, eKampüs ünite listesi,
Bologna (abp) ders sayfası (kaynak kitap, haftalık konu, çıktı), soru bankası (konuya bağlı ve
açıklamalı soru sayısı), ders-kitaplari deposundaki kitap metni ve çalışma odası paketi.

Kullanım:
  python3 scripts/anadolu-ders-kapsam.py [--ilk 30] [--kategori zorunlu] [--kitaplar ../ders-kitaplari]
          [--yaz docs/raporlar/anadolu-ders-kapsam.md]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from collections import defaultdict
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
UNI = "anadolu-aof"


def kitap_klasorleri(kitaplar: Path) -> set[str]:
    """ders-kitaplari deposunda (seyrek klonda da) origin/main'de bulunan Anadolu ders klasörleri."""
    try:
        cikti = subprocess.run(
            ["git", "-C", str(kitaplar), "ls-tree", "-d", "--name-only", "origin/main", f"{UNI}/"],
            capture_output=True, text=True, check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return set()
    return {satir.split("/", 1)[1] for satir in cikti.split() if "/" in satir}


def dersleri_topla(kategori: str | None) -> dict[str, dict]:
    dersler: dict[str, dict] = {}
    for dosya in sorted((KOK / "data/courses" / UNI).glob("*.json")):
        for d in json.loads(dosya.read_text()):
            kod = (d.get("code") or "").strip()
            if not kod or kod.upper().startswith("ORT"):
                continue
            if kategori and d.get("kategori") != kategori:
                continue
            kayit = dersler.setdefault(kod, {"kod": kod, "ad": d["name"], "slug": d["id"],
                                             "bolumler": set(), "kategoriler": defaultdict(int)})
            kayit["bolumler"].add(d["departmentId"])
            kayit["kategoriler"][d.get("kategori") or "belirsiz"] += 1
    return dersler


def kapsam(ders: dict, uniteler: dict, kitaplar: set[str]) -> dict:
    slug, kod = ders["slug"], ders["kod"]
    icerik_yolu = KOK / "data/ders-icerik" / UNI / f"{slug}.json"
    icerik = json.loads(icerik_yolu.read_text()) if icerik_yolu.exists() else {}
    soru_yolu = KOK / "data/questions" / UNI / f"{slug}.json"
    sorular = json.loads(soru_yolu.read_text()) if soru_yolu.exists() else []
    return {
        "unite": len(uniteler.get(kod) or uniteler.get(kod.replace("İ", "I")) or []),
        "abp": bool(icerik.get("url")),
        "kaynak_kitap": (icerik.get("kaynaklar") or "").strip()[:90],
        "hafta": len(icerik.get("konular") or []),
        "soru": len(sorular),
        "konulu": sum(1 for q in sorular if q.get("section")),
        "aciklamali": sum(1 for q in sorular if (q.get("explanation") or "").strip()),
        "kitap_metni": slug in kitaplar,
        "calisma_odasi": (KOK / "src/data/calisma-odasi" / f"{UNI}--{slug}.json").exists(),
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ilk", type=int, default=30)
    p.add_argument("--kategori")
    p.add_argument("--kitaplar", default=str(KOK.parent / "ders-kitaplari"))
    p.add_argument("--yaz")
    p.add_argument("--json", action="store_true")
    a = p.parse_args()

    uniteler = json.loads((KOK / "data/kitap-uniteleri" / f"{UNI}.json").read_text())["dersler"]
    kitaplar = kitap_klasorleri(Path(a.kitaplar))
    dersler = sorted(dersleri_topla(a.kategori).values(), key=lambda d: (-len(d["bolumler"]), d["kod"]))
    satirlar = []
    for d in dersler[: a.ilk]:
        satirlar.append({"kod": d["kod"], "ad": d["ad"], "slug": d["slug"], "bolum": len(d["bolumler"]),
                         "kategori": dict(d["kategoriler"]), **kapsam(d, uniteler, kitaplar)})
    if a.json:
        print(json.dumps(satirlar, ensure_ascii=False, indent=1))
        return
    evet = lambda b: "var" if b else "yok"  # noqa: E731
    metin = ["| Kod | Ders | Bölüm | eKampüs ünite | Bologna haftası | Soru (konulu / açıklamalı) | Kitap metni | Çalışma odası |",
             "|---|---|---|---|---|---|---|---|"]
    for s in satirlar:
        metin.append(f"| {s['kod']} | {s['ad']} | {s['bolum']} | {s['unite'] or 'yok'} | {s['hafta'] or 'yok'} | "
                     f"{s['soru']} ({s['konulu']} / {s['aciklamali']}) | {evet(s['kitap_metni'])} | {evet(s['calisma_odasi'])} |")
    cikti = "\n".join(metin)
    print(cikti)
    if a.yaz:
        Path(a.yaz).write_text(cikti + "\n")


if __name__ == "__main__":
    main()
