// Bağımsız hakem: Gemini her döküm satırını konu listesine kendisi yerleştirir (algoritmadan habersiz).
// Sonuç data/calisma-odasi/hakem/<ders>-<video>.json içinde saklanır; scripts/calisma-odasi-denetle.mjs
// algoritmanın bu hakemle uyuşma oranını raporlar. Kullanım: node scripts/calisma-odasi-hakem.mjs [ders ...]
// Anahtar: ~/.secrets/gemini. Komut: gapi generate (kayıtlı sarmalayıcı) (satır içi kod yok, istem stdin'den gider).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { ATLA_RE } from "./lib/konu-esle.mjs";

const kok = resolve(import.meta.dirname, "..");
const paket = process.env.CALISMA_PAKET ? resolve(process.env.CALISMA_PAKET) : join(kok, "src", "data", "calisma-odasi");
const hedef = join(kok, "data", "calisma-odasi", "hakem");
const model = process.env.HAKEM_MODEL ?? "gemini-3.8-flash";
const anahtar = process.env.GEMINI_API_KEY ?? readFileSync(`${process.env.HOME}/.secrets/gemini`, "utf8").trim();
const SISTEM = `Sen titiz bir ders editörüsün. Bir ders podcastının satır satır dökümü ve ders kitabının konu listesi verilecek.
Her satırın anlattığı içeriğin kitapta hangi konuda geçtiğini bul ve TEK konu numarası ver. Satırın içeriğini konu özetleriyle karşılaştır; en özgül (en alt düzey) konuyu seç.
Giriş, kapanış ve geçiş cümleleri (selamlama, "bir sonraki bölüm") komşu satırların konusuna yazılır. Podcast kitabı kabaca sırayla anlatır, ama kesin sıra zorunlu değildir; içerik neyi gösteriyorsa onu seç.
Yalnız şu JSON nesnesini döndür: {"0": "1.2", "1": "1.2", ...} (anahtar satır numarası, değer konu numarası). Bütün satırlar yer almalı.`;

const dersler = process.argv.slice(2);
mkdirSync(hedef, { recursive: true });
for (const d of dersler) {
  const p = JSON.parse(readFileSync(join(paket, `${d}.json`), "utf8"));
  for (const v of p.videolar) {
    const yol = join(hedef, `${d}-${v.kod}.json`);
    if (existsSync(yol) && !process.env.YENIDEN) continue;
    const konular = p.konular.filter((k) => !ATLA_RE.test(k.baslik.toLocaleLowerCase("tr")) && (k.metin.length >= 120 || k.calisma));
    const liste = konular.map((k) => `${k.no} | ${k.baslik} | ${(k.calisma?.ozet ?? k.metin).replace(/\s+/g, " ").slice(0, 170)}`).join("\n");
    const satirlar = v.satirlar.map((s) => `${s.i}: ${s.m}`).join("\n");
    const istem = `KONU LİSTESİ (no | başlık | özet):\n${liste}\n\nDÖKÜM SATIRLARI:\n${satirlar}`;
    let sonuc = null;
    for (let t = 0; t < 3 && !sonuc; t++) {
      const r = spawnSync("gapi", ["generate", "--model", model, "--stream=false", "--system", SISTEM, "--stdin"], {
        input: istem, encoding: "utf8", timeout: 600000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GEMINI_API_KEY: anahtar },
      });
      const m = r.status === 0 ? /\{[\s\S]*\}/.exec(r.stdout.replace(/```(?:json)?/g, "")) : null;
      try { sonuc = m ? JSON.parse(m[0]) : null; } catch { sonuc = null; }
    }
    if (!sonuc) { console.warn(`${d}/${v.kod}: hakem başarısız`); continue; }
    writeFileSync(yol, JSON.stringify({ model, uretim: new Date().toISOString().slice(0, 10), etiket: sonuc }, null, 1) + "\n");
    console.log(`${d}/${v.kod}: ${Object.keys(sonuc).length}/${v.satirlar.length} satır`);
  }
}
