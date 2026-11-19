#!/usr/bin/env python3
"""List a program's courses and find the same course (by automationId) in other programs.

Usage: python3 scripts/ortak-dersler.py ataturk-aof tekstil-ve-moda-tasarimi [--icerik path/to/auzeff-tui/data/ata-aof]
--icerik marks courses that already have produced content (folder named after the course id).
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent / "data" / "courses"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("uni")
    p.add_argument("bolum")
    p.add_argument("--icerik", default=None, help="Root of produced course folders, e.g. auzeff-tui/data/ata-aof")
    a = p.parse_args()

    uni_dir = KOK / a.uni
    by_auto: dict[str, list[str]] = defaultdict(list)
    for f in sorted(uni_dir.glob("*.json")):
        for c in json.loads(f.read_text()):
            if c.get("automationId"):
                by_auto[c["automationId"]].append(f.stem)

    icerik_slugs: set[str] = set()
    if a.icerik:
        k = Path(a.icerik)
        icerik_slugs = {d.name for d in k.iterdir() if d.is_dir()} | {
            d.name for d in (k / "metin").iterdir() if d.is_dir()
        }

    hedef = json.loads((uni_dir / f"{a.bolum}.json").read_text())
    for c in sorted(hedef, key=lambda x: (x["semester"], x["code"])):
        diger = sorted(set(by_auto.get(c.get("automationId", ""), [])) - {a.bolum})
        var = "İÇERİK VAR" if c["id"] in icerik_slugs else ""
        print(f'{c["semester"]}. dönem | {c["code"]:8} | {c["name"]:40} | id {c.get("automationId","-"):6} | {var:10} | ortak: {", ".join(diger) or "-"}')


if __name__ == "__main__":
    main()
