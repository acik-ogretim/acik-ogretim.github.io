// Measures the share image renderer: time per image and bytes per format. Writes samples to the given folder.
//   node --experimental-strip-types scripts/og/olc.mts /tmp/og-olc
import fs from "node:fs";
import path from "node:path";
import { kartPng, kodla, type OgKarti } from "../../src/lib/og/cizim.ts";

const cikti = process.argv[2] ?? "/tmp/og-olc";
fs.mkdirSync(cikti, { recursive: true });
const sat = ["2016-2017 ile 2024-2025 arası sınavlar · 9 yıl", "Vize, Final, Bütünleme · 2.430 soru · 8 ünite · açıklamalı"];
const kartlar: Record<string, OgKarti> = {
  kisa: { baslik: "Psikoloji", etiket: "ATA-AÖF", renk: "#b91c1c", baglam: "Psikoloji (Lisans)", buyuk: { sayi: "1.240", etiket: "çıkmış soru" }, satirlar: sat },
  uzun: { baslik: "Çalışma Alanlarında İş Sağlığı ve Güvenliği II ( Fiziksel+ Biyolojik+ Kimyasal Risk Etmenleri)", etiket: "AUZEF", renk: "#7c3aed", baglam: "İş Sağlığı ve Güvenliği", buyuk: { sayi: "1.240", etiket: "çıkmış soru" }, satirlar: sat },
  orta: { baslik: "Principles of Atatürk and the History of Turkish Revolution II (ENG)", etiket: "Anadolu AÖF", renk: "#1d4ed8", baglam: "Ortak ders · 12 bölüm", buyuk: { sayi: "312", etiket: "alıştırma sorusu" }, satirlar: ["8 ünite"] },
  turkce: { baslik: "ÇĞİÖŞÜ çğıöşü İstanbul Öğretim Üyeleri", etiket: "AUZEF", renk: "#7c3aed", baglam: "Şişli" },
};
for (const [ad, k] of Object.entries(kartlar)) {
  let t = performance.now();
  const png = await kartPng(k);
  const ms = performance.now() - t;
  const satir = [`${ad}: render ${ms.toFixed(0)} ms`];
  for (const b of ["jpg", "png", "webp"] as const) {
    t = performance.now();
    const buf = await kodla(png, b);
    fs.writeFileSync(path.join(cikti, `${ad}.${b}`), buf);
    satir.push(`${b} ${(buf.length / 1024).toFixed(1)} KB (${(performance.now() - t).toFixed(0)} ms)`);
  }
  fs.writeFileSync(path.join(cikti, `${ad}.ham.png`), png);
  satir.push(`ham png ${(png.length / 1024).toFixed(0)} KB`);
  console.log(satir.join(" | "));
}
