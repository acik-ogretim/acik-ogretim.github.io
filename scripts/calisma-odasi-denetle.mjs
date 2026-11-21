// Çalışma odası denetimi: paket (src/data/calisma-odasi/<ders>.json) için döküm etiketleme ve çalışma malzemesi eksiklerini sayar.
// Sıfır hata hedeflenmez; amaç sayıların görünür olması. Çıktı: docs/denetim/calisma-odasi-<tarih>.md ve .json.
//   node scripts/calisma-odasi-denetle.mjs [ders ...]     (npm run calisma:denetle)
// Hakem uyuşması: data/calisma-odasi/hakem/<ders>-<video>.json varsa (scripts/calisma-odasi-hakem.mjs) raporlanır.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ATLA_RE } from "./lib/konu-esle.mjs";

const kok = resolve(import.meta.dirname, "..");
const paketDizin = process.env.CALISMA_PAKET ? resolve(process.env.CALISMA_PAKET) : join(kok, "src", "data", "calisma-odasi");
const tarih = new Date().toISOString().slice(0, 10);
const tr = (s) => s.toLocaleLowerCase("tr");
const secili = process.argv.slice(2);
const dersler = (secili.length ? secili : readdirSync(paketDizin).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5))).sort();

const akraba = (a, b) => a === b || a.startsWith(b + ".") || b.startsWith(a + ".");
const ESIK_DUSUK_G = 0.5;
const KISA_OZET = 40;
const MIN_METIN = 200; // etkinlik_uret.py ile aynı: bundan kısa konu için malzeme üretilmez

const rapor = [];
for (const ders of dersler) {
  const p = JSON.parse(readFileSync(join(paketDizin, `${ders}.json`), "utf8"));
  const idx = new Map(p.konular.map((k, i) => [k.no, i]));
  const uygun = (k) => !ATLA_RE.test(tr(k.baslik)) && (k.metin.length >= MIN_METIN || k.calisma);
  const uretilebilir = (k) => !ATLA_RE.test(tr(k.baslik)) && k.metin.length >= MIN_METIN;
  const r = { ders, konuSayisi: p.konular.length, uygunKonu: p.konular.filter(uygun).length, videolar: [] };

  for (const v of p.videolar) {
    const s = v.satirlar;
    const kapsanan = new Set(s.map((x) => x.konu));
    let gecis = 0;
    let geri = 0;
    let uniteGeri = 0;
    const siraBozuk = [];
    for (let i = 1; i < s.length; i++) {
      if (s[i].konu === s[i - 1].konu) continue;
      gecis++;
      if (idx.get(s[i].konu) < idx.get(s[i - 1].konu)) {
        geri++;
        const ua = p.konular[idx.get(s[i - 1].konu)].unite;
        const ub = p.konular[idx.get(s[i].konu)].unite;
        if (ub < ua) uniteGeri++;
        siraBozuk.push({ satir: i, kimden: s[i - 1].konu, kime: s[i].konu, tekrarKipi: !!s[i].t });
      }
    }
    const hakemYol = join(kok, "data", "calisma-odasi", "hakem", `${ders}-${v.kod}.json`);
    let hakem = null;
    if (existsSync(hakemYol) && s.length) {
      const h = JSON.parse(readFileSync(hakemYol, "utf8")).etiket;
      let tam = 0;
      let ak = 0;
      let say = 0;
      for (const x of s) {
        const e = h[String(x.i)];
        if (!e) continue;
        say++;
        if (e === x.konu) tam++;
        if (akraba(e, x.konu)) ak++;
      }
      hakem = { say, tam: say ? +(tam / say).toFixed(3) : null, akraba: say ? +(ak / say).toFixed(3) : null };
    }
    const uygunNolar = p.konular.filter(uygun).map((k) => k.no);
    r.videolar.push({
      kod: v.kod,
      satir: s.length,
      konusuz: s.filter((x) => !x.konu).length,
      konusuzBagli: s.filter((x) => x.y).length, // eşik altı, en yakın konuya bağlı
      dusukGuven: s.filter((x) => x.g < ESIK_DUSUK_G).length,
      geminiEtiketli: s.filter((x) => x.gm).length,
      tekrarKipiSatiri: s.filter((x) => x.t).length,
      gecis,
      geriGecis: geri,
      uniteGeriGecis: uniteGeri,
      siraBozukOrnek: siraBozuk.slice(0, 12),
      videodaGecmeyenKonu: uygunNolar.filter((n) => !kapsanan.has(n)),
      hakem,
    });
  }

  const eksik = p.konular.filter((k) => uretilebilir(k) && !k.calisma).map((k) => k.no);
  const ozetZayif = p.konular.filter((k) => k.calisma && (k.calisma.ozet ?? "").length < KISA_OZET).map((k) => k.no);
  const testsiz = p.konular.filter((k) => k.calisma && !(k.calisma.miniTest?.length) && uretilebilir(k)).map((k) => k.no);
  const kavramsiz = p.konular.filter((k) => k.calisma && !(k.calisma.kavramlar?.length) && k.metin.length >= 1500).map((k) => k.no);
  // Uzunluğa göre yetersiz: uzun konuda temel nokta ve mini test sayısı metnin genişliğini yansıtmıyor (eski sabit 5 ve 3)
  const yetersiz = p.konular
    .filter((k) => {
      const c = k.calisma;
      if (!c || k.metin.length < 3000) return false;
      const bekTn = Math.min(10, Math.ceil(k.metin.length / 1200));
      const bekMt = Math.min(8, Math.ceil(k.metin.length / 1500));
      return (c.temelNoktalar?.length ?? 0) < bekTn || (c.miniTest?.length ?? 0) < bekMt;
    })
    .map((k) => k.no);
  r.calisma = { eksik, ozetZayif, testsiz, kavramsiz, yetersiz };
  // Üretici betiğin okuyacağı istek: ünite -> konu numaraları (eksik + özeti zayıf + testsiz)
  const istek = {};
  for (const no of new Set([...eksik, ...ozetZayif, ...testsiz, ...yetersiz])) {
    const k = p.konular[idx.get(no)];
    if (uretilebilir(k)) (istek[k.unite] ??= []).push(no);
  }
  r.uretimIstegi = istek;
  rapor.push(r);
}

mkdirSync(join(kok, "docs", "denetim"), { recursive: true });
const jsonYol = join(kok, "docs", "denetim", `calisma-odasi-${tarih}.json`);
writeFileSync(jsonYol, JSON.stringify({ tarih, esikler: { dusukGuven: ESIK_DUSUK_G, kisaOzet: KISA_OZET, minMetin: MIN_METIN }, dersler: rapor }, null, 1) + "\n");

const liste = (a, n = 12) => (a.length ? a.slice(0, n).join(", ") + (a.length > n ? `, ... (+${a.length - n})` : "") : "yok");
let md = `# Çalışma odası denetimi (${tarih})\n\nSayılar hata listesi değil, durum göstergesidir. Konusuz satır: konu atanamayan; bağlı: güven çok düşük olduğu için en yakın konuya bağlanan; düşük güven: güven puanı < ${ESIK_DUSUK_G}; hakem: bağımsız Gemini etiketiyle uyuşma (tam, kavram akrabası dahil).\n\n`;
md += `## Özet\n\n`;
for (const r of rapor) {
  const v = r.videolar[0];
  md += `**${r.ders}**: ${r.konuSayisi} konu, ${v?.satir ?? 0} satır; konusuz ${v?.konusuz ?? 0}, bağlı ${v?.konusuzBagli ?? 0}, düşük güven ${v?.dusukGuven ?? 0}, geri geçiş ${v?.geriGecis ?? 0}; hakem uyuşma ${v?.hakem ? `${Math.round(v.hakem.tam * 100)}% (akraba dahil ${Math.round(v.hakem.akraba * 100)}%)` : "yok"}; malzemesiz ${r.calisma.eksik.length}, zayıf özet ${r.calisma.ozetZayif.length}, uzunluğa göre yetersiz ${r.calisma.yetersiz.length}, testsiz ${r.calisma.testsiz.length}, kavramsız ${r.calisma.kavramsiz.length}.\n\n`;
}
for (const r of rapor) {
  md += `\n## ${r.ders}\n\nKonu ${r.konuSayisi} (uygun ${r.uygunKonu}).\n`;
  for (const v of r.videolar) {
    md += `\n**Video ${v.kod}**: ${v.satir} satır, ${v.gecis} konu geçişi (${v.geriGecis} geri, ${v.uniteGeriGecis} ünite geri), Gemini etiketli ${v.geminiEtiketli}, tekrar kipinde ${v.tekrarKipiSatiri}.\n`;
    md += `\n- Videoda hiç geçmeyen konu: ${v.videodaGecmeyenKonu.length} (${liste(v.videodaGecmeyenKonu)})\n`;
    if (v.siraBozukOrnek.length) md += `- Sırası bozuk geçişler (ilk ${v.siraBozukOrnek.length}): ${v.siraBozukOrnek.map((x) => `${x.kimden}→${x.kime}@${x.satir}${x.tekrarKipi ? "*" : ""}`).join(", ")}  (* tekrar kipi)\n`;
  }
  md += `\n**Çalışma malzemesi**\n\n- Malzemesi olmayan konu: ${r.calisma.eksik.length} (${liste(r.calisma.eksik)})\n- Boş ya da çok kısa özet: ${r.calisma.ozetZayif.length} (${liste(r.calisma.ozetZayif)})\n- Uzunluğa göre yetersiz (uzun konuda az temel nokta ya da mini test): ${r.calisma.yetersiz.length} (${liste(r.calisma.yetersiz)})\n- Mini testi olmayan: ${r.calisma.testsiz.length} (${liste(r.calisma.testsiz)})\n- Kavramı olmayan (uzun konu): ${r.calisma.kavramsiz.length} (${liste(r.calisma.kavramsiz)})\n`;
}
writeFileSync(jsonYol.replace(/\.json$/, ".md"), md);
console.log(md.split("\n## ")[1]);
console.log(`yazıldı: docs/denetim/calisma-odasi-${tarih}.{md,json}`);
