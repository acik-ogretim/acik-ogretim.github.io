#!/usr/bin/env python3
"""Link exam questions to their book topic (section) and fill missing unit numbers, one Gemini call per unit batch.

Usage: python3 scripts/soru-konu-esle.py <uni> <ders> [--paralel 6] [--hepsi] [--kuru]
Reads data/questions/<uni>/<ders>.json and the topics in src/data/calisma-odasi/<uni>--<ders>.json.
A question that already has a section keeps it (exam imports carry real ones) unless --hepsi is given.
Questions without unitNumber get both unit and topic from the whole book. Low-confidence answers
(guven < 0.6) and topics that do not exist in the book are left unlinked instead of guessed.
The study room's Sınav tab shows a topic's questions through this section field.
"""
import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
MODELLER = ["gemini-4-argon", "gemini-4-hydrogen"]
ATLA = re.compile(r"^(değerlendirme soruları|yararlanılan kaynaklar|yararlanılan ve önerilen kaynaklar|kaynakça|özet|özet \(devamı\)|kendimizi sınayalım|sıra sizde)", re.I)
PARTI = 30

ISTEM = """Sen {ders} dersinin kitabını iyi bilen bir öğretim elemanısın. Aşağıda kitabın konu listesi ve çoktan seçmeli sınav soruları var.
Her soru için, sorunun cevabının kitapta anlatıldığı EN ÖZEL konuyu seç (alt konu varsa alt konuyu). {unite_notu}
Konu numarasını yalnız listedeki numaralardan seç. Emin değilsen guven değerini düşük ver.

Yalnız JSON dizi döndür, başka hiçbir şey yazma:
[{{"id": "<soru kimliği>", "konu": "<konu no>", "unite": <ünite no>, "guven": <0 ile 1 arası>}}]

KONULAR (no | başlık | kitaptan kısa alıntı):
{konular}

SORULAR:
{sorular}
"""


def duz(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def gemini(istem: str) -> str:
    son = ""
    for deneme in range(4):
        model = MODELLER[deneme % len(MODELLER)]
        r = subprocess.run(["gapi", "generate", "--stdin", "--model", model], input=istem, capture_output=True, text=True, timeout=900)
        metin = "\n".join(s for s in r.stdout.splitlines() if not s.startswith("Interaction ID"))
        m = re.search(r"\[[\s\S]*\]", metin)
        if r.returncode == 0 and m:
            return m.group(0)
        son = (r.stderr or r.stdout)[-300:]
    raise RuntimeError(f"yanıt alınamadı: {son}")


def konu_satiri(k: dict, uzun: int) -> str:
    return f"{k['no']} | {k['baslik']} | {duz(k.get('metin') or '')[:uzun]}"


def soru_satiri(q: dict) -> str:
    sec = q.get("options") or {}
    dogru = sec.get(q.get("correctAnswer"), "")
    return f"- id={q['id']} | {duz(q.get('text'))} | doğru cevap: {duz(dogru)}"


def isle(ders_adi: str, konular: list, parti: list, unite: int | None) -> list:
    if unite:
        kl = [k for k in konular if k["unite"] == unite]
        notu = f"Bütün sorular {unite}. üniteden; yalnız bu ünitenin konularını kullan."
        uzun = 260
    else:
        kl = konular
        notu = "Sorunun ünitesi bilinmiyor; bütün kitaptan en uygun konuyu seç ve ünitesini de yaz."
        uzun = 110
    istem = ISTEM.format(ders=ders_adi, unite_notu=notu, konular="\n".join(konu_satiri(k, uzun) for k in kl), sorular="\n".join(soru_satiri(q) for q in parti))
    return json.loads(gemini(istem))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("uni")
    ap.add_argument("ders")
    ap.add_argument("--paralel", type=int, default=6)
    ap.add_argument("--hepsi", action="store_true", help="also relink questions that already have a section")
    ap.add_argument("--tum-kitap", action="store_true", help="search across all units for unlinked questions and fix wrong unitNumber")
    ap.add_argument("--kuru", action="store_true", help="print the plan, write nothing")
    a = ap.parse_args()

    soru_yolu = KOK / "data" / "questions" / a.uni / f"{a.ders}.json"
    paket = json.loads((KOK / "src" / "data" / "calisma-odasi" / f"{a.uni}--{a.ders}.json").read_text())
    sorular = json.loads(soru_yolu.read_text())
    konular = [k for k in paket["konular"] if not ATLA.match(k["baslik"].strip())]
    konu_var = {k["no"]: k["unite"] for k in konular}

    hedef = [q for q in sorular if a.hepsi or not q.get("section") or not q.get("unitNumber")]
    gruplar: dict = {}
    for q in hedef:
        u_key = 0 if a.tum_kitap else (q.get("unitNumber") or 0)
        gruplar.setdefault(u_key, []).append(q)
    isler = [(u, g[i : i + PARTI]) for u, g in sorted(gruplar.items()) for i in range(0, len(g), PARTI)]
    print(f"{a.ders}: {len(hedef)}/{len(sorular)} soru, {len(isler)} çağrı", flush=True)
    if a.kuru:
        return

    kimlik = {str(q["id"]): q for q in sorular}
    sayac = {"bagli": 0, "unite": 0, "dusuk": 0, "gecersiz": 0}
    with ThreadPoolExecutor(a.paralel) as ex:
        isler_f = {ex.submit(isle, paket["ders"], konular, p, u or None): (u, p) for u, p in isler}
        for f in as_completed(isler_f):
            u, p = isler_f[f]
            try:
                yanit = f.result()
            except Exception as e:  # noqa: BLE001 - one failed batch must not lose the others
                print(f"  ünite {u}: {e}", file=sys.stderr, flush=True)
                continue
            for y in yanit:
                q = kimlik.get(str(y.get("id")))
                no = str(y.get("konu") or "")
                if not q or no not in konu_var:
                    sayac["gecersiz"] += 1
                    continue
                if float(y.get("guven") or 0) < 0.6:
                    sayac["dusuk"] += 1
                    continue
                if not a.tum_kitap and q.get("unitNumber") and konu_var[no] != q["unitNumber"]:
                    sayac["gecersiz"] += 1
                    continue
                if not q.get("unitNumber") or (a.tum_kitap and q.get("unitNumber") != konu_var[no]):
                    q["unitNumber"] = konu_var[no]
                    sayac["unite"] += 1
                q["section"] = no
                sayac["bagli"] += 1
            soru_yolu.write_text(json.dumps(sorular, ensure_ascii=False, indent=2) + "\n")
            print(f"  ünite {u or '?'}: {len(p)} soru işlendi", flush=True)
    print(f"{a.ders}: {json.dumps(sayac, ensure_ascii=False)}", flush=True)


if __name__ == "__main__":
    main()
