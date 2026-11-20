#!/usr/bin/env python3
"""Splits course records that share one course id but are different courses.

A shared id makes every program show the same question file, so courses that are only same-named end up with
another course's questions. Key that tells courses apart, per university:
  anadolu-aof, auzef: course code (a new code means a new course and separate exam questions)
  ataturk-aof: automationId (the ÖYS course; many programs share one ÖYS course under different codes)
  ankuzef: course name (placeholder codes such as AAUF0000 are not unique)
The largest group keeps the id (and its question file); other groups get "<id>-<key slug>" and stay without
questions until their own are imported. Only the "id" line of each record changes, file formatting is kept.
Usage: python3 scripts/ders-kimligi-ayir.py [--yaz]
"""
import collections
import glob
import json
import re
import sys
import unicodedata

ANAHTAR = {"anadolu-aof": "code", "auzef": "code", "ataturk-aof": "automationId", "ankuzef": "name"}


def slug(s):
    s = s.translate(str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU"))
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def kayitlar(f):
    d = json.load(open(f))
    return d if isinstance(d, list) else d.get("courses", [])


def main():
    yaz = "--yaz" in sys.argv
    toplam = 0
    for uni, alan in ANAHTAR.items():
        dosyalar = sorted(glob.glob(f"data/courses/{uni}/*.json"))
        grup = collections.defaultdict(lambda: collections.defaultdict(list))
        for f in dosyalar:
            for x in kayitlar(f):
                anahtar = (x.get(alan) or "").strip()
                if anahtar:
                    grup[x["id"]][anahtar].append((f, x.get("code"), x.get("name")))
        degis = {}  # (file, code, name) -> new id
        for cid, g in grup.items():
            if alan == "name":
                # same name written with different case is the same course
                birlesik = collections.defaultdict(list)
                for k, v in g.items():
                    birlesik[k.lower().replace("i̇", "i")].extend(v)
                g = birlesik
            if len(g) < 2:
                continue
            # the group the id was named after keeps it, otherwise the largest group
            sirali = sorted(g.items(), key=lambda kv: (not cid.startswith(slug(kv[0])), -len(kv[1])))
            for k, v in sirali[1:]:
                for f, code, name in v:
                    degis[(f, code, name)] = f"{cid}-{slug(k)}"
        for f in dosyalar:
            metin = open(f).read()
            for x in kayitlar(f):
                yeni = degis.get((f, x.get("code"), x.get("name")))
                if not yeni:
                    continue
                desen = re.compile(r'("id":\s*)"' + re.escape(x["id"]) + r'"(,\s*"code":\s*' + re.escape(json.dumps(x.get("code"), ensure_ascii=False)) + r'\s*,\s*"name":\s*' + re.escape(json.dumps(x.get("name"), ensure_ascii=False)) + ")")
                metin, n = desen.subn(lambda m: m.group(1) + json.dumps(yeni, ensure_ascii=False) + m.group(2), metin, count=1)
                if n:
                    toplam += 1
                    print(f"  {uni} {x.get('code')} {x.get('name')}: {x['id']} -> {yeni}")
            if yaz:
                open(f, "w").write(metin)
    print(f"{toplam} kayıt {'ayrıldı' if yaz else 'ayrılacak'}")


if __name__ == "__main__":
    main()
