// Tanıtım rakamlarını depodaki veriden sayar: node docs/tanitim/sayim.mjs
// Kaynak: data/universities.json, data/courses/<uni>/<bölüm>.json, data/questions/<uni>/<ders>.json
// "test-uni" sınama verisi olduğu için sayıma girmez.
import fs from "node:fs";
import path from "node:path";

const veri = path.resolve(import.meta.dirname, "../../data");
const unis = JSON.parse(fs.readFileSync(path.join(veri, "universities.json"), "utf8")).filter((u) => u.id !== "test-uni");
const sonuc = { universite: unis.length, bolum: 0, dersKaydi: 0, tekilDers: 0, soruDosyasi: 0, soru: 0, aciklamali: 0, cikmis: 0, uniler: {} };
const tekil = new Set();
for (const u of unis) {
  const s = { bolum: (u.departments ?? []).length, dersKaydi: 0, soru: 0 };
  const cd = path.join(veri, "courses", u.id);
  for (const f of fs.existsSync(cd) ? fs.readdirSync(cd) : []) {
    const dersler = JSON.parse(fs.readFileSync(path.join(cd, f), "utf8"));
    s.dersKaydi += dersler.length;
    for (const d of dersler) tekil.add(`${u.id}/${d.id}`);
  }
  const qd = path.join(veri, "questions", u.id);
  for (const f of fs.existsSync(qd) ? fs.readdirSync(qd) : []) {
    const q = JSON.parse(fs.readFileSync(path.join(qd, f), "utf8"));
    sonuc.soruDosyasi++;
    s.soru += q.length;
    for (const x of q) {
      if (x.explanation?.trim() || x.aiExplanation?.trim()) sonuc.aciklamali++;
      if (x.source === "cikmis-soru") sonuc.cikmis++;
    }
  }
  sonuc.bolum += s.bolum; sonuc.dersKaydi += s.dersKaydi; sonuc.soru += s.soru;
  sonuc.uniler[u.id] = s;
}
sonuc.tekilDers = tekil.size;
console.log(JSON.stringify(sonuc, null, 2));
