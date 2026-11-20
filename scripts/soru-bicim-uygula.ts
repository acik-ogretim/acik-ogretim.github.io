// Applies readability rules to question files and writes an audit report.
//   npx tsx scripts/soru-bicim-uygula.ts            -> dry run, report only
//   npx tsx scripts/soru-bicim-uygula.ts --yaz      -> also writes the files
// cleanHtml is deliberately not used here: on k1/k2 texts it joined \n-separated premises, dropped
// "[5]" from code ("int A[5]") and soft hyphens; see the audit report of 20 Nov 2026.
import fs from "node:fs";
import path from "node:path";
import { kucukturKacir, onculSatirlari, satirSonlari, secenekHarfleriniSil } from "./utils/soru-bicim.ts";

const YAZ = process.argv.includes("--yaz");
const KOK = path.resolve("data/questions");
const RAPOR = path.resolve(process.argv.find((a) => a.startsWith("--rapor="))?.slice(8) ?? "soru-bicim-raporu.md");
const unis = ["auzef", "anadolu-aof", "ataturk-aof", "ankuzef"];

type Soru = { id: string; text?: string; options?: Record<string, string> | unknown; explanation?: string };
const sayac: Record<string, number> = {};
const ornek: Record<string, string[]> = {};
const ekle = (kural: string, uni: string, dosya: string, once: string, sonra: string) => {
  const k = `${uni}:${kural}`;
  sayac[k] = (sayac[k] ?? 0) + 1;
  (ornek[kural] ??= []);
  // reservoir-ish: keep every 25th change up to 40 samples so samples span all files
  if (ornek[kural].length < 40 && sayac[k] % 25 === 1) ornek[kural].push(`- **${uni}/${dosya}**\n  - önce: \`${once.slice(0, 300)}\`\n  - sonra: \`${sonra.slice(0, 300)}\``);
};

for (const uni of unis) {
  const klasor = path.join(KOK, uni);
  for (const ad of fs.readdirSync(klasor).filter((f) => f.endsWith(".json"))) {
    const yol = path.join(klasor, ad);
    let sorular: Soru[];
    try {
      sorular = JSON.parse(fs.readFileSync(yol, "utf8"));
    } catch {
      continue;
    }
    let degisti = false;
    for (const q of sorular) {
      // Older questions were cleaned when they were imported; only the coded k1/k2 imports ("s-…") are touched.
      if (!String(q.id).startsWith("s-")) continue;
      if (typeof q.text === "string") {
        let t = q.text;
        const k = kucukturKacir(t);
        if (k !== t) { ekle("kucuktur-kacis", uni, ad, t, k); t = k; }
        const s = satirSonlari(t);
        if (s !== t) { ekle("satir-sonu", uni, ad, t, s); t = s; }
        const o = onculSatirlari(t);
        if (o !== t) { ekle("oncul-satir", uni, ad, t, o); t = o; }
        if (t !== q.text) { q.text = t; degisti = true; }
      }
      if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
        let sec = q.options as Record<string, string>;
        const kc = Object.fromEntries(Object.entries(sec).map(([a, v]) => [a, typeof v === "string" ? kucukturKacir(v) : v]));
        if (JSON.stringify(kc) !== JSON.stringify(sec)) { ekle("kucuktur-kacis-sik", uni, ad, JSON.stringify(sec), JSON.stringify(kc)); sec = kc; }
        const h = secenekHarfleriniSil(sec);
        if (JSON.stringify(h) !== JSON.stringify(sec)) { ekle("sik-harfi", uni, ad, JSON.stringify(sec), JSON.stringify(h)); sec = h; }
        if (JSON.stringify(sec) !== JSON.stringify(q.options)) { q.options = sec; degisti = true; }
      }
    }
    if (degisti && YAZ) fs.writeFileSync(yol, JSON.stringify(sorular, null, 2) + "\n");
  }
}

const satir = ["# Soru biçim denetimi", "", YAZ ? "Dosyalara yazıldı." : "Kuru çalıştırma: dosyalar değişmedi.", "", "## Sayılar", ""];
for (const [k, v] of Object.entries(sayac).sort()) satir.push(`- ${k}: ${v}`);
for (const [kural, liste] of Object.entries(ornek)) satir.push("", `## Örnekler: ${kural}`, "", ...liste);
fs.writeFileSync(RAPOR, satir.join("\n") + "\n");
console.log(Object.entries(sayac).sort().map(([k, v]) => `${k}=${v}`).join("\n"));
