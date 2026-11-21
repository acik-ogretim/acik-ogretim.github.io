// Çalışma odası paketi (docs/konu-anlatimi.md, "Çalışma odası prototipi").
// Ders kitabı (üniteler 1-7), kendi vize özet videomuzun zaman kodlu dökümü, konu başına çalışma malzemesi
// (kitap/etkinlik) ve çıkmış soru kimliklerini tek dosyada toplar: src/data/calisma-odasi/<ders>.json.
// CI bağımlılığı değildir: dosyalar commit'lenir, sayfa yalnız bunları okur. Yeniden üretmek için:
//   node scripts/calisma-odasi-paketle.mjs [ders ...]
// Ortam: KITAP_DIZINI (varsayılan ../ders-kitaplari), DOKUM_DIZINI (varsayılan ../auzeff-tui/data/ata-aof/yayin/dokum).
// Node 22.18 ve üstü gerekir (TypeScript modüllerini doğrudan çalıştırır).
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const kok = resolve(import.meta.dirname, "..");
const kitapKok = resolve(kok, process.env.KITAP_DIZINI ?? "../ders-kitaplari");
const dokumKok = resolve(kok, process.env.DOKUM_DIZINI ?? "../auzeff-tui/data/ata-aof/yayin/dokum");
const cikti = join(kok, "src", "data", "calisma-odasi");
const UNI = "ataturk-aof";
const DERSLER = [
  "hukukun-temel-kavramlari",
  "sosyolojiye-giris",
  "psikoloji",
  "istatistige-giris",
  "turk-kulturu-ve-medeniyeti-tarihi",
  "temel-bilgi-teknolojileri-i",
];
const SON_UNITE = 7;
const ESIK = Number(process.env.CALISMA_ESIK ?? 0.17); // altındaki satır konusuz kalır
const GECIS_CEZASI = Number(process.env.CALISMA_GECIS ?? 0.06); // konu değiştirmenin bedeli (titremeyi önler)

const parcala = await import("../src/lib/konu/parcala.ts");
const { calismaCoz } = await import("../src/lib/konu/calisma.ts");

const tr = (s) => s.toLocaleLowerCase("tr");
const KUTU_ADLARI = new Set(["not", "örnek", "dikkat", "tanım", "özet", "uyarı", "ipucu", "hatırlatma", "bilgi", "soru", "etkinlik"]);

// ---- Türkçe kaba gövdeleme: ilk 5 harf (ek farklarını yok sayar) ----
function jetonlar(metin) {
  const sonuc = [];
  for (const m of tr(metin).matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0];
    if (w.length < 3 || /^\d+$/.test(w)) continue;
    sonuc.push(w.slice(0, 5));
  }
  return sonuc;
}

function vektor(parcalar) {
  // parcalar: [metin, ağırlık][]
  const v = new Map();
  for (const [metin, agirlik] of parcalar) {
    for (const j of jetonlar(metin)) v.set(j, (v.get(j) ?? 0) + agirlik);
  }
  return v;
}

function cumleBul(metin, terim) {
  const t = tr(terim);
  for (const par of metin.split("\n")) {
    const kucuk = tr(par);
    const i = kucuk.indexOf(t);
    if (i < 0) continue;
    // terimi içeren cümle
    const bas = Math.max(par.lastIndexOf(". ", i) + 2, 0);
    let son = par.indexOf(". ", i + t.length);
    son = son < 0 ? par.length : son + 1;
    const c = par.slice(bas, son).trim();
    if (c.length >= 25) return c.length > 320 ? c.slice(0, 317).replace(/\s+\S*$/, "") + "..." : c;
  }
  return null;
}

function oku(yol) {
  return JSON.parse(readFileSync(yol, "utf8"));
}

function paketle(ders) {
  const kitap = join(kitapKok, UNI, ders, "kitap");
  const dokumYolu = join(dokumKok, `${ders}-kisa-vize.json`);
  if (!existsSync(kitap)) return console.warn(`[calisma-odasi] ${ders}: kitap yok, atlandı`);
  const uniteler = [];
  for (let n = 1; n <= SON_UNITE; n++) {
    const f = join(kitap, `unite-${String(n).padStart(2, "0")}.mdx`);
    if (!existsSync(f)) continue;
    const u = parcala.uniteOku(readFileSync(f, "utf8"));
    if (u.konular.length) uniteler.push(u);
  }
  const { konular } = parcala.dersiParcala(uniteler, UNI, ders);

  // Çalışma malzemesi
  const calisma = new Map();
  let etkinlikDosya = 0;
  for (const u of uniteler) {
    const f = join(kitap, "etkinlik", `unite-${String(u.unite).padStart(2, "0")}.json`);
    if (!existsSync(f)) continue;
    try {
      for (const [no, c] of calismaCoz(oku(f))) calisma.set(no, c);
      etkinlikDosya++;
    } catch {
      /* geçersiz dosya atlanır */
    }
  }

  // Sorular
  const soruDosyasi = join(kok, "data", "questions", UNI, `${ders}.json`);
  const sorular = {};
  if (existsSync(soruDosyasi)) {
    for (const q of oku(soruDosyasi)) {
      if (q.unitNumber >= 1 && q.unitNumber <= SON_UNITE) (sorular[q.unitNumber] ??= []).push(String(q.id));
    }
  }

  // Konular (yalnız gerekli alanlar)
  const konuListesi = konular.map((k) => {
    const c = calisma.get(k.no);
    return {
      no: k.no,
      baslik: k.baslik,
      unite: k.unite,
      sayfa: k.sayfa,
      html: k.html,
      metin: k.metin,
      kitapKavramlari: k.kavramlar,
      ...(c ? { calisma: c } : {}),
    };
  });

  // Kavram dizini: önce çalışma malzemesindeki terimler (tanımlı), sonra kitapta koyu geçen terimler
  const kavramlar = new Map();
  const ekle = (terim, tanim, no, kaynak) => {
    const a = tr(terim.trim());
    if (!tanim || kavramlar.has(a)) return;
    kavramlar.set(a, { terim: terim.trim(), tanim, konu: no, kaynak });
  };
  for (const k of konuListesi) for (const c of k.calisma?.kavramlar ?? []) ekle(c.terim, c.tanim, k.no, "etkinlik");
  for (const k of konuListesi) {
    for (const t of k.kitapKavramlari) {
      const kelime = t.split(/\s+/).length;
      if (t.length < 4 || t.length > 60 || kelime > 6 || KUTU_ADLARI.has(tr(t))) continue;
      const c = cumleBul(k.metin, t);
      if (c) ekle(t, c, k.no, "kitap");
    }
  }

  // Dökümü konuya eşle
  const dokum = existsSync(dokumYolu) ? oku(dokumYolu) : null;
  const satirlar = (dokum?.bolumler ?? []).map((b, i) => ({ i, bas: b.bas, bit: b.bit, k: b.konusmaci, m: b.metin, konu: null, g: 0 }));
  if (satirlar.length) {
    const df = new Map();
    const belgeler = konuListesi.map((k) => {
      const c = k.calisma;
      const v = vektor([
        [k.baslik, 4],
        [k.metin, 1],
        [k.kitapKavramlari.join(" "), 3],
        [(c?.kavramlar ?? []).map((x) => x.terim).join(" "), 4],
        [(c?.kavramlar ?? []).map((x) => x.tanim).join(" "), 1.5],
        [(c?.temelNoktalar ?? []).join(" "), 2.5],
        [c?.ozet ?? "", 2.5],
      ]);
      for (const j of v.keys()) df.set(j, (df.get(j) ?? 0) + 1);
      return v;
    });
    const N = belgeler.length;
    const idf = (j) => Math.log((N + 1) / ((df.get(j) ?? 0) + 0.5));
    const tfidf = (v) => {
      const o = new Map();
      let norm = 0;
      for (const [j, w] of v) {
        const x = Math.log(1 + w) * idf(j);
        if (x <= 0) continue;
        o.set(j, x);
        norm += x * x;
      }
      norm = Math.sqrt(norm) || 1;
      for (const [j, x] of o) o.set(j, x / norm);
      return o;
    };
    const belgeVek = belgeler.map(tfidf);
    const kosinus = (a, b) => {
      let s = 0;
      const [kucuk, buyuk] = a.size < b.size ? [a, b] : [b, a];
      for (const [j, x] of kucuk) {
        const y = buyuk.get(j);
        if (y) s += x * y;
      }
      return s;
    };
    const pencere = (i) =>
      vektor([
        [satirlar[i].m, 1],
        [satirlar[i - 1]?.m ?? "", 0.5],
        [satirlar[i + 1]?.m ?? "", 0.5],
      ]);
    const e = satirlar.map((_, i) => {
      const v = tfidf(pencere(i));
      return belgeVek.map((d) => kosinus(v, d));
    });
    // Dinamik programlama: durumlar = konular + boş; geçiş bedeli titremeyi önler
    const T = konuListesi.length;
    const BOS = T;
    const puan = (l, t) => (t === BOS ? ESIK : e[l][t]);
    let onceki = Array.from({ length: T + 1 }, (_, t) => puan(0, t));
    const geri = [];
    for (let l = 1; l < satirlar.length; l++) {
      let enIyi = -Infinity;
      let enIyiT = 0;
      onceki.forEach((p, t) => {
        if (p > enIyi) ((enIyi = p), (enIyiT = t));
      });
      const yeni = new Array(T + 1);
      const ref = new Array(T + 1);
      for (let t = 0; t <= T; t++) {
        const kal = onceki[t];
        const gec = enIyi - GECIS_CEZASI;
        if (kal >= gec) ((yeni[t] = kal + puan(l, t)), (ref[t] = t));
        else ((yeni[t] = gec + puan(l, t)), (ref[t] = enIyiT));
      }
      geri.push(ref);
      onceki = yeni;
    }
    let t = onceki.indexOf(Math.max(...onceki));
    const yol = new Array(satirlar.length);
    for (let l = satirlar.length - 1; l >= 0; l--) {
      yol[l] = t;
      if (l > 0) t = geri[l - 1][t];
    }
    satirlar.forEach((s, l) => {
      if (yol[l] === BOS) return;
      s.konu = konuListesi[yol[l]].no;
      s.g = Math.round(e[l][yol[l]] * 100) / 100;
      if (s.g < ESIK) s.konu = null;
    });
  }

  // Videonun kapsadığı konular
  for (const k of konuListesi) {
    const ilgili = satirlar.filter((s) => s.konu === k.no);
    k.video = ilgili.length ? { ilk: ilgili[0].i, say: ilgili.length } : null;
  }

  const videoUrl = dokum?.video ?? null;
  const videoId = videoUrl ? (/(?:youtu\.be\/|v=)([\w-]{11})/.exec(videoUrl)?.[1] ?? null) : null;
  const veri = {
    ders,
    uni: UNI,
    uretim: new Date().toISOString().slice(0, 10),
    video: videoId ? { id: videoId, url: videoUrl, sure: dokum.sure } : null,
    uniteler: uniteler.map((u) => ({ no: u.unite, baslik: u.baslik, konular: konuListesi.filter((k) => k.unite === u.unite).map((k) => k.no) })),
    konular: konuListesi.map(({ kitapKavramlari, ...k }) => {
      void kitapKavramlari;
      return k;
    }),
    satirlar,
    kavramlar: [...kavramlar.values()],
    sorular,
  };
  mkdirSync(cikti, { recursive: true });
  const yol = join(cikti, `${ders}.json`);
  writeFileSync(yol, JSON.stringify(veri));
  const kb = Math.round(statSync(yol).size / 1024);
  const eslesen = satirlar.filter((s) => s.konu).length;
  const calismali = veri.konular.filter((k) => k.calisma).length;
  console.log(
    `[calisma-odasi] ${ders}: ${veri.konular.length} konu (${calismali} çalışma malzemeli, ${etkinlikDosya} etkinlik dosyası), ${satirlar.length} satır (${eslesen} eşleşti), ${veri.kavramlar.length} kavram, ${kb} KB`,
  );
}

const secili = process.argv.slice(2);
for (const d of secili.length ? secili : DERSLER) paketle(d);
