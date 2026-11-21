#!/usr/bin/env python3
"""Writes the e2e scenario courses (test-uni) used by tests/e2e/calisma-durumu.spec.ts."""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")

def soru(i, unite, bolum, sinavlar, dogru="A", aciklama=True):
    harf = "ABCDE"
    q = {
        "id": f"sen-{i}",
        "unitNumber": unite,
        "text": f"Senaryo sorusu {i}: ünite {unite}, konu {bolum or 'yok'}. Hangisi doğrudur?",
        "options": [{"key": k, "text": f"Seçenek {k} (soru {i})"} for k in harf],
        "correctAnswer": dogru,
        "explanation": f"Soru {i} açıklaması: doğru cevap {dogru}." if aciklama else "",
        "source": "cikmis-soru" if sinavlar else "deneme",
        "sinavlar": [{"year": y, "examType": t} for y, t in sinavlar],
        "year": sinavlar[0][0] if sinavlar else "",
        "examType": sinavlar[0][1] if sinavlar else "genel",
        "difficulty": "orta",
        "topics": [],
    }
    if bolum:
        q["section"] = bolum
    return q

# Unit 1 is written out of book order on purpose: book order is 1.2 < 1.7 < 1.7.4 < 1.10 < (no topic)
s = [
    soru(1, 1, "1.10", [("2023-2024", "vize")], "A"),
    soru(2, 1, "1.2", [("2020-2021", "final"), ("2021-2022", "vize"), ("2024-2025", "final")], "B"),
    soru(3, 1, None, [], "C", aciklama=False),
    soru(4, 1, "1.7.4", [("2019-2020", "vize"), ("2022-2023", "final")], "D"),
    soru(5, 1, "1.7", [("2025-2026", "vize")], "E"),
    soru(6, 2, "2.1", [("2022-2023", "vize")], "A"),
    soru(7, 2, "2.3", [("2018-2019", "final"), ("2019-2020", "final"), ("2020-2021", "final"), ("2021-2022", "final")], "B"),
    soru(8, 2, "2.2", [], "C"),
    soru(9, 2, "2.4", [("2024-2025", "vize")], "D"),
    soru(10, 3, "3.1", [("2021-2022", "vize")], "A"),
    soru(11, 3, "3.2", [], "B"),
    soru(12, 3, "3.3", [("2023-2024", "final")], "C"),
]
os.makedirs(f"{R}/questions/test-uni", exist_ok=True)
json.dump(s, open(f"{R}/questions/test-uni/course-senaryo.json", "w"), ensure_ascii=False, indent=1)
s2 = [soru(100 + i, 1 + i // 3, f"{1 + i // 3}.{i % 3 + 1}", [], "ABCDE"[i % 5]) for i in range(6)]
for q in s2: q["id"] = q["id"].replace("sen-", "iki-")
json.dump(s2, open(f"{R}/questions/test-uni/course-senaryo-2.json", "w"), ensure_ascii=False, indent=1)

def ders(id, dept, ad, kod, n):
    return {"id": id, "universityId": "test-uni", "departmentId": dept, "name": ad, "code": kod, "semester": 1,
            "credits": 3, "unitCount": 3, "questionCount": n, "automationId": kod, "lastUpdated": "2026-11-21T00:00:00Z"}

for dept, dersler in [("test-dept-active", [("course-senaryo", "Senaryo Dersi", "SEN101", len(s)), ("course-senaryo-2", "İkinci Senaryo Dersi", "SEN102", len(s2))]),
                      ("test-dept-passive", [("course-senaryo", "Senaryo Dersi", "SEN101", len(s))])]:
    p = f"{R}/courses/test-uni/{dept}.json"
    liste = json.load(open(p))
    liste = [c for c in liste if not c["id"].startswith("course-senaryo")]
    liste += [ders(i, dept, a, k, n) for i, a, k, n in dersler]
    json.dump(liste, open(p, "w"), ensure_ascii=False, indent=4)
print("yazildi", len(s), len(s2))
