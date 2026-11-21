// Renders sample cards (both layouts) and measures time and bytes per format.
//   node --experimental-strip-types scripts/og/olc.mts /tmp/og-olc
import fs from "node:fs";
import path from "node:path";
import { kartPng, kodla, type OgKarti } from "../../src/lib/og/cizim.ts";

const cikti = process.argv[2] ?? "/tmp/og-olc";
fs.mkdirSync(cikti, { recursive: true });
const dersKutu = [
  { baslik: "Vize, Final, Bütünleme, Üç ders", etiket: "sınav türleri", kucuk: true },
  { baslik: "2.430", etiket: "soru" },
  { baslik: "8", etiket: "ünite" },
  { baslik: "Açıklamalı", etiket: "çözümler", kucuk: true },
];
const yil = ["2016-2017 ile 2024-2025", "arası sınavlar · 9 yıl"];
const buyuk = { sayi: "1.240", etiket: "çıkmış soru" };
export const kartlar: Record<string, OgKarti> = {
  home: { baslik: "Çıkmış sorular ve açıklamalı çözümler", sol: { liste: ["Anadolu AÖF", "ATA-AÖF", "AUZEF", "ANKUZEF"] }, buyuk: { sayi: "9.581", etiket: "çıkmış soru" }, yil: ["2017-2018 ile 2026-2027", "arası sınavlar · 10 yıl"], kutular: [{ baslik: "4", etiket: "üniversite" }, { baslik: "119", etiket: "ders" }, { baslik: "53.334", etiket: "soru" }] },
  uni: { baslik: "İstanbul Üniversitesi", sol: { etiket: "AUZEF", renk: "#7c3aed", ana: "Açık ve Uzaktan Eğitim Fakültesi" }, buyuk: { sayi: "4.913", etiket: "çıkmış soru" }, yil, kutular: [{ baslik: "58", etiket: "bölüm" }, { baslik: "412", etiket: "ders" }, { baslik: "8.259", etiket: "soru" }] },
  dept: { baslik: "Halkla İlişkiler ve Tanıtım", sol: { etiket: "Anadolu AÖF", renk: "#1d4ed8", ana: "Anadolu Üniversitesi", alt: "Ön Lisans" }, buyuk: { sayi: "3.073", etiket: "çıkmış soru" }, yil, kutular: [{ baslik: "28", etiket: "ders" }, { baslik: "4", etiket: "dönem" }, { baslik: "9.628", etiket: "soru" }] },
  kisa: { baslik: "Psikoloji", sol: { etiket: "ATA-AÖF", renk: "#b91c1c", ana: "Psikoloji", alt: "Lisans" }, buyuk, yil, kutular: dersKutu },
  uzun: { baslik: "Çalışma Alanlarında İş Sağlığı ve Güvenliği II ( Fiziksel+ Biyolojik+ Kimyasal Risk Etmenleri)", sol: { etiket: "AUZEF", renk: "#7c3aed", ana: "İş Sağlığı ve Güvenliği", alt: "Ön Lisans" }, buyuk: { sayi: "112", etiket: "çıkmış soru" }, yil: ["2022-2023 ile 2025-2026", "arası sınavlar · 4 yıl"], kutular: dersKutu },
  sifir: { baslik: "Principles of Atatürk and the History of Turkish Revolution II (ENG)", sol: { etiket: "Anadolu AÖF", renk: "#1d4ed8", ana: "Ortak ders", alt: "12 bölümde okutulur" }, buyuk: { sayi: "439", etiket: "alıştırma sorusu" }, kutular: [{ baslik: "8", etiket: "ünite" }, { baslik: "Açıklamalı", etiket: "çözümler", kucuk: true }] },
  statik: { baslik: "Derse sor: yapay zekâ sohbeti", sol: { ana: "Kendi anahtarınla, tarayıcında" } },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [ad, k] of Object.entries(kartlar)) {
    const satir = [ad];
    for (const duzen of ["genis", "kare"] as const) {
      let t = performance.now();
      const png = await kartPng(k, duzen);
      const ms = performance.now() - t;
      t = performance.now();
      const buf = await kodla(png, "png");
      fs.writeFileSync(path.join(cikti, `${ad}-${duzen}.png`), buf);
      satir.push(`${duzen}: render ${ms.toFixed(0)} ms, png ${(buf.length / 1024).toFixed(1)} KB (${(performance.now() - t).toFixed(0)} ms)`);
    }
    console.log(satir.join(" | "));
  }
}
