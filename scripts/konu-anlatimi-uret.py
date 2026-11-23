#!/usr/bin/env python3
"""Written topic explanations (konu anlatımı) for the study room, one Gemini call per topic.

Usage: python3 scripts/konu-anlatimi-uret.py <ders> [--konu 1.3.1 ...] [--paralel 12]
Sources per topic: the book text and the long narration lines labelled with the topic (both from
src/data/calisma-odasi/<ders>.json). Output: data/calisma-odasi/anlatim/<ders>.json, {no: markdown}.
Topics already in the output are skipped, so a rerun only pays for missing ones; pass --konu to redo some.
"""
import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
MODEL = "gemini-4-hydrogen"
ATLA = re.compile(r"^(değerlendirme soruları|yararlanılan kaynaklar|yararlanılan ve önerilen kaynaklar|kaynakça|özet|özet \(devamı\))$", re.I)

ISTEM = """Sen bir üniversite dersinin konu anlatımını yazan deneyimli bir öğretim elemanısın. Ders: {ders}. Konu: {no} {baslik}.
Aşağıda bu konunun ders kitabındaki metni ve aynı konunun sesli anlatımından alınmış konuşma dökümü var.
Görev: sınava hazırlanan bir öğrencinin yalnız bunu okuyarak konuyu eksiksiz öğrenebileceği yazılı bir konu anlatımı yaz.

Kurallar:
- Kitaptaki bütün bilgileri kapsa: tanımlar, kişiler ve görüşleri, tarihler, sınıflandırmalar, örnekler, karşılaştırmalar. Sınavda sorulabilecek hiçbir ayrıntıyı atlama.
- Uzunluğu içerik belirler: kısa konu 2 paragraf, uzun konu 8 ile 12 paragraf olabilir. Kitap metnini kısaltıp özetlemek yerine açıklayarak anlat. Kitap metni yaklaşık {kitap_sozcuk} sözcük; anlatım bundan kısa olmasın.
- Kitapta ve dökümde olmayan bilgi, sayı, tarih ya da alıntı ekleme. Döküm yalnız açıklama ve örnek için kaynaktır; konuşma biçimini, soru-cevabı ve konuşmacı adlarını alma.
- Düzgün biçimlendirilmiş bir ders notu gibi yaz (Markdown): konu uzunsa "### " ile 2-5 alt başlık aç; tanımlanan kavramı ve kişi adını ilk geçtiği yerde **kalın** yaz; türler, aşamalar, özellikler, ilkeler gibi sayılabilen şeyleri "- " ya da "1. " listesiyle ver (her madde bir iki cümle açıklama taşısın); geri kalanı kısa paragraflarla anlat. Bir paragraf tek bir fikri işlesin. Konu başlığını tekrar yazma, tablo ve emoji kullanma.
- Doğal, akıcı Türkçe kullan: cümle sonlarını çeşitlendir, her cümleyi "-dır/-maktadır" ile bitirme, "bu bölümde", "sonuç olarak", "özetle", "önemlidir" gibi kalıp ve geçiş cümleleri kullanma. Uzun tire ve orta tire kullanma.
- Yalnız Markdown metni döndür; başına ya da sonuna açıklama, kod bloğu çiti yazma.

KİTAP METNİ:
{kitap}

SESLİ ANLATIM DÖKÜMÜ:
{dokum}
"""


def dokum_metni(paket: dict, no: str) -> str:
    parcalar = []
    for m in paket.get("medyalar", []):  # packages built before the media contract have none
        if m.get("cesit") != "uzun-anlatim":
            continue
        a = m.get("konuAraliklari", {}).get(no)
        if a:
            parcalar.extend(s["m"] for s in m["satirlar"][a["ilk"] : a["ilk"] + a["say"]])
    return " ".join(parcalar)


def uret(paket: dict, k: dict) -> str:
    istem = ISTEM.format(ders=paket["ders"], no=k.get("goster") or k["no"], baslik=k["baslik"], kitap=k.get("metin") or "(yok)", kitap_sozcuk=len((k.get("metin") or "").split()), dokum=dokum_metni(paket, k["no"]) or "(yok)")
    for deneme in range(3):
        r = subprocess.run(["gapi", "generate", "--stdin", "--model", MODEL], input=istem, capture_output=True, text=True, timeout=600)
        metin = re.sub(r"^```(?:markdown)?\s*|\s*```$", "", r.stdout.strip())
        # The CLI's non-streamed output wraps the text in interaction metadata; never store that.
        if r.returncode == 0 and len(metin) > 80 and not re.search(r"^(steps:|signature:|model_output|service_tier:)", metin, re.M):
            return metin.replace("\u2014", ",").replace("\u2013", "-")
    raise RuntimeError(f"{k['no']}: yanıt okunamadı: {r.stderr[-300:] or r.stdout[:300]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("ders")
    ap.add_argument("--konu", nargs="*", default=[])
    ap.add_argument("--paralel", type=int, default=12)
    ap.add_argument("--model", default="gemini-4-hydrogen", help="Gemini model (Flash class by default)")
    a = ap.parse_args()
    global MODEL
    MODEL = a.model
    paket = json.loads((KOK / "src" / "data" / "calisma-odasi" / f"{a.ders}.json").read_text())
    yol = KOK / "data" / "calisma-odasi" / "anlatim" / f"{a.ders}.json"
    yol.parent.mkdir(parents=True, exist_ok=True)
    kayit = json.loads(yol.read_text()) if yol.exists() else {}
    hedef = [
        k for k in paket["konular"]
        if not ATLA.match(k["baslik"].strip()) and (k.get("metin") or dokum_metni(paket, k["no"]))
        and ((k["no"] in a.konu) if a.konu else k["no"] not in kayit)
    ]
    print(f"{len(hedef)} konu üretilecek", flush=True)
    with ThreadPoolExecutor(max_workers=a.paralel) as havuz:
        isler = {havuz.submit(uret, paket, k): k["no"] for k in hedef}
        for i, f in enumerate(as_completed(isler), 1):
            no = isler[f]
            try:
                kayit[no] = f.result()
                print(f"[{i}/{len(hedef)}] {no}: {len(kayit[no].split())} sözcük", flush=True)
            except Exception as hata:  # keep the others
                print(hata, file=sys.stderr, flush=True)
            if i % 10 == 0:
                yol.write_text(json.dumps(kayit, ensure_ascii=False, indent=1) + "\n")
    yol.write_text(json.dumps(kayit, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
