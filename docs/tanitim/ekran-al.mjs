// Canlı siteden tanıtım ekran görüntülerini alır (mobil 390x844, masaüstü 1440x900).
// Çalıştır: node docs/tanitim/ekran-al.mjs [özellik-adı ...]   (ad verilmezse hepsi)
// Çıktı: docs/tanitim/ekranlar/<özellik>-<mobil|masaustu>.jpg (JPEG kalite 80, masaüstü en çok 300 KB)
// Gereken: Playwright (npm i -D playwright ya da genel kurulum) ve bir Chromium. SITE ortam değişkeniyle adres değişir.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const kokler = [process.cwd() + "/", "/opt/npm-tools/"];
let chromium;
for (const k of kokler) {
  try { ({ chromium } = createRequire(k)("playwright")); break; } catch {}
}
if (!chromium) throw new Error("playwright bulunamadı");

const SITE = process.env.SITE ?? "https://acik-ogretim.github.io";
const CIKTI = path.resolve(import.meta.dirname, "ekranlar");
const DERS = "/ataturk-aof/cocuk-gelisimi-lisans/psikoloji";
const ODA = "/anadolu-aof/gorsel-iletisim/gorsel-sistem-tasarimlari";
const GORUNUMLER = [
  { ad: "mobil", w: 390, h: 844, olcek: 2 },
  { ad: "masaustu", w: 1440, h: 900, olcek: 1 },
];
const bekle = (p, ms = 800) => p.waitForTimeout(ms);
const tikla = async (p, secici, i = 0) => { const el = p.locator(secici).nth(i); await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click({ timeout: 8000 }); await bekle(p, 700); };
const kartaGit = async (p, i) => { await p.evaluate((n) => { const k = document.querySelectorAll(".question-card")[n]; window.scrollTo(0, k.getBoundingClientRect().top + scrollY - 90); }, i); await bekle(p, 600); };
const menuAc = async (p) => { await tikla(p, "#btn-mobil-menu"); await bekle(p, 600); };
const menuOgesi = async (p, ad) => { await p.getByText(ad, { exact: true }).last().click(); };
const sekme = async (p, ad) => { await p.locator(`[data-sekme="${ad}"]`).click(); await bekle(p, 1200); };
/** Örnek çözüm kayıtları: yalnız tanıtım görüntüsü içindir, tarayıcıda oluşturulur, gerçek kullanıcı verisi değildir. */
const ornekKayitlar = () => {
  localStorage.setItem("favorite-courses", JSON.stringify([
    { id: "psikoloji", name: "Psikoloji", uniId: "ataturk-aof", deptId: "cocuk-gelisimi-lisans" },
    { id: "tipografi", name: "Tipografi", uniId: "ataturk-aof", deptId: "grafik-sanatlar" },
    { id: "gorsel-sistem-tasarimlari", name: "Görsel Sistem Tasarımları", uniId: "anadolu-aof", deptId: "gorsel-iletisim" },
  ]));
  const kayit = (n, dogru) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(1000 + i), [i % dogru !== 0]]));
  localStorage.setItem("quiz-progress-ataturk-aof-psikoloji", JSON.stringify(kayit(120, 4)));
  localStorage.setItem("quiz-progress-ataturk-aof-tipografi", JSON.stringify(kayit(60, 3)));
  localStorage.setItem("quiz-progress-anadolu-aof-gorsel-sistem-tasarimlari", JSON.stringify(kayit(40, 5)));
};
const sorular = async (p) => { await p.waitForSelector(".question-card", { timeout: 30000 }); await bekle(p, 1200); };

/** ad: dosya adı; yol: sayfa; tema: dark|light|sepia; hazirla(p, gorunum): etkileşim. */
const KARELER = [
  { ad: "anasayfa", yol: "/" },
  { ad: "universite-bolumler", yol: "/ataturk-aof/" },
  { ad: "bolum-dersler", yol: "/ataturk-aof/grafik-sanatlar/" },
  { ad: "ders-sayfasi", yol: DERS + "/", hazirla: sorular },
  { ad: "soru-bankasi", yol: DERS + "/", hazirla: async (p) => { await sorular(p); await kartaGit(p, 0); } },
  { ad: "cozme-kipi", yol: DERS + "/", hazirla: async (p) => {
    await sorular(p);
    await p.getByRole("button", { name: "Çözme", exact: true }).first().click().catch(() => {});
    await bekle(p, 800);
    await kartaGit(p, 0);
    await p.locator(".question-card").first().locator(".option-item:not(.correct-option)").first().click();
    await bekle(p, 1000);
  } },
  { ad: "suzgec", yol: DERS + "/", hazirla: async (p) => { await sorular(p); await tikla(p, "#suzgec-ac"); } },
  { ad: "tam-menu", yol: DERS + "/", hazirla: async (p) => { await sorular(p); await menuAc(p); } },
  { ad: "ayarlar-penceresi", yol: DERS + "/", hazirla: async (p) => { await sorular(p); await menuAc(p); await menuOgesi(p, "Ayarlar"); await bekle(p, 900); } },
  { ad: "icindekiler", yol: DERS + "/", hazirla: async (p) => { await sorular(p); await menuAc(p); await menuOgesi(p, "İçindekiler"); await bekle(p, 900); } },
  { ad: "calisma-dizini", yol: "/calisma/" },
  { ad: "calisma-odasi", yol: DERS + "/calisma/", hazirla: async (p) => { await bekle(p, 3500); } },
  { ad: "calisma-dokum", yol: DERS + "/calisma/", hazirla: async (p) => { await bekle(p, 3000); await sekme(p, "dokum"); } },
  { ad: "calisma-konular", yol: DERS + "/calisma/", hazirla: async (p) => { await bekle(p, 3000); await sekme(p, "icindekiler"); } },
  { ad: "calisma-sinav", yol: DERS + "/calisma/", hazirla: async (p) => { await bekle(p, 3000); await sekme(p, "sinav"); await p.locator("#co-p-sinav .co-secenek").nth(1).click().catch(() => {}); await bekle(p, 700); } },
  { ad: "calisma-kavram", yol: DERS + "/calisma/", hazirla: async (p) => { await bekle(p, 3000); const kv = p.locator(".co-kavram:visible").first(); await kv.scrollIntoViewIfNeeded(); await kv.click(); await bekle(p, 800); } },
  { ad: "sohbet-asistani", yol: "/sohbet/" },
  { ad: "arama", yol: "/ara/?q=" + encodeURIComponent("tasarım"), hazirla: async (p) => { await bekle(p, 3000); } },
  { ad: "derslerim", yol: "/derslerim/", tohum: ornekKayitlar, hazirla: async (p) => { await bekle(p, 1500); } },
  { ad: "ilerleme", yol: "/ilerleme/", tohum: ornekKayitlar, hazirla: async (p) => { await bekle(p, 2000); } },
  { ad: "kayit-tasima", yol: "/yedek/" },
  { ad: "cevrimdisi", yol: "/cevrimdisi/" },
  { ad: "ayarlar-sayfasi", yol: "/ayarlar/" },
  { ad: "rehber", yol: "/rehber/" },
  { ad: "tema-aydinlik", yol: DERS + "/", tema: "light", hazirla: async (p) => { await sorular(p); await kartaGit(p, 0); } },
  { ad: "tema-sepya", yol: DERS + "/", tema: "sepia", hazirla: async (p) => { await sorular(p); await kartaGit(p, 0); } },
];

const secili = process.argv.slice(2);
fs.mkdirSync(CIKTI, { recursive: true });
const tarayici = await chromium.launch();
for (const k of KARELER) {
  if (secili.length && !secili.includes(k.ad)) continue;
  for (const g of GORUNUMLER) {
    if (k.sadece && k.sadece !== g.ad) continue;
    const ctx = await tarayici.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: g.olcek, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
    await ctx.addInitScript(({ tema, tohum }) => {
      localStorage.setItem("uyari-kapali", "1");
      localStorage.setItem("tur-goruldu", "1");
      if (tema) localStorage.setItem("theme", tema);
      if (tohum) new Function("return " + tohum)()();
    }, { tema: k.tema ?? null, tohum: k.tohum ? k.tohum.toString() : null });
    const p = await ctx.newPage();
    try {
      await p.goto(SITE + k.yol, { waitUntil: "networkidle", timeout: 60000 });
      await bekle(p, 1500);
      if (k.hazirla) await k.hazirla(p, g);
      const dosya = path.join(CIKTI, `${k.ad}-${g.ad}.jpg`);
      let kalite = 80;
      await p.screenshot({ path: dosya, type: "jpeg", quality: kalite });
      while (g.ad === "masaustu" && fs.statSync(dosya).size > 300 * 1024 && kalite > 40) {
        kalite -= 8;
        await p.screenshot({ path: dosya, type: "jpeg", quality: kalite });
      }
      console.log("tamam", path.basename(dosya), Math.round(fs.statSync(dosya).size / 1024) + " KB", kalite);
    } catch (e) {
      console.log("HATA", k.ad, g.ad, e.message.split("\n")[0]);
    }
    await ctx.close();
  }
}
await tarayici.close();
