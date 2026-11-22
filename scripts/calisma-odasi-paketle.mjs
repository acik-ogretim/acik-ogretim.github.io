// Çalışma odası paketi (docs/konu-anlatimi.md, "Çalışma odası prototipi").
// Ders kitabı (üniteler 1-7), kendi vize özet videomuzun zaman kodlu dökümü, konu başına çalışma malzemesi
// (kitap/etkinlik) ve çıkmış soru kimliklerini tek dosyada toplar: src/data/calisma-odasi/<ders>.json.
// CI bağımlılığı değildir: dosyalar commit'lenir, sayfa yalnız bunları okur. Yeniden üretmek için:
//   node scripts/calisma-odasi-paketle.mjs [ders ...]
// Ortam: KITAP_DIZINI (varsayılan ../ders-kitaplari), DOKUM_DIZINI (varsayılan ../auzeff-tui/data/ata-aof/yayin/dokum).
// Node 22.18 ve üstü gerekir (TypeScript modüllerini doğrudan çalıştırır).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { konuyaEsle as hizalaKonu } from "./lib/konu-esle.mjs";

const kok = resolve(import.meta.dirname, "..");
const kitapKok = resolve(kok, process.env.KITAP_DIZINI ?? "../ders-kitaplari");
const dokumKok = resolve(kok, process.env.DOKUM_DIZINI ?? "../auzeff-tui/data/ata-aof/yayin/dokum");
const cikti = process.env.CALISMA_CIKTI ? resolve(kok, process.env.CALISMA_CIKTI) : join(kok, "src", "data", "calisma-odasi");
// Üniversite: varsayılan ATA AÖF; başka üniversite için CALISMA_UNI=anadolu-aof node scripts/calisma-odasi-paketle.mjs <ders>
const UNI = process.env.CALISMA_UNI ?? "ataturk-aof";
// Vize dersleri: kendi YouTube videosu olan Atatürk AÖF dersleri (src/data/youtube-videolar.json) ve döküm dosyası olanlar.
const videoKaydi = JSON.parse(readFileSync(join(kok, "src", "data", "youtube-videolar.json"), "utf8")).dersler ?? {};
const videolu = Object.keys(videoKaydi).filter((k) => k.startsWith(`${UNI}/`)).map((k) => k.split("/")[1]);
const DERSLER = [...new Set(videolu)];
const TUR_ADLARI = { "kisa-ozet": "Kısa özet", "uzun-anlatim": "Uzun anlatım", "soru-cozum": "Soru çözümü", diger: "Video" };
const turBul = (baslik, ad = "") => (/soru/i.test(baslik + ad) ? "soru-cozum" : /uzun/i.test(baslik + ad) ? "uzun-anlatim" : /özet|ozet|vize|kisa/i.test(baslik + ad) ? "kisa-ozet" : "diger");
const SON_UNITE = 7;

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


// ---- Soru çözüm videoları: döküm satırını çıkmış soruyla eşleştirir ----
const htmlMetin = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function soruHazirla(yol) {
  if (!existsSync(yol)) return [];
  return JSON.parse(readFileSync(yol, "utf8"))
    .filter((q) => q.unitNumber >= 1 && q.unitNumber <= SON_UNITE)
    .map((q) => ({ q, metin: htmlMetin(q.text) + " " + Object.values(q.options ?? {}).map(htmlMetin).join(" ") }));
}
function soruyaBagla(satirlar, sorular) {
  if (!sorular.length || !satirlar.length) return;
  const df = new Map();
  const vek = sorular.map((s) => {
    const v = vektor([[s.metin, 1]]);
    for (const j of v.keys()) df.set(j, (df.get(j) ?? 0) + 1);
    return v;
  });
  const N = sorular.length;
  const norm = (v) => {
    const o = new Map();
    let t = 0;
    for (const [j, w] of v) {
      const x = Math.log(1 + w) * Math.log((N + 1) / ((df.get(j) ?? 0) + 0.5));
      if (x > 0) (o.set(j, x), (t += x * x));
    }
    t = Math.sqrt(t) || 1;
    for (const [j, x] of o) o.set(j, x / t);
    return o;
  };
  const sv = vek.map(norm);
  for (const s of satirlar) {
    const lv = norm(vektor([[s.m, 1]]));
    let en = 0;
    let enI = -1;
    sv.forEach((d, i) => {
      let c = 0;
      for (const [j, x] of lv) c += x * (d.get(j) ?? 0);
      if (c > en) ((en = c), (enI = i));
    });
    if (enI >= 0 && en >= 0.3) {
      const q = sorular[enI].q;
      s.q = String(q.id);
      s.u = q.unitNumber;
    }
  }
}

function oku(yol) {
  return JSON.parse(readFileSync(yol, "utf8"));
}

function paketle(ders) {
  const kitap = join(kitapKok, UNI, ders, "kitap");
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

  // Videolar: youtube-videolar.json kaydı + varsa döküm dosyaları (<ders>-<ad>.json; kisa-vize kısa özettir)
  const videolar = [];
  const kayitlar = videoKaydi[`${UNI}/${ders}`] ?? [];
  const dokumAdlari = existsSync(dokumKok) ? readdirSync(dokumKok).filter((f) => f.startsWith(`${ders}-`) && f.endsWith(".json")) : [];
  const idAl = (url) => /(?:youtu\.be\/|v=)([\w-]{11})/.exec(url ?? "")?.[1] ?? null;
  const kullanilan = new Set();
  for (const k of kayitlar) {
    const yt = idAl(k.url);
    if (yt) videolar.push({ yt, url: k.url, baslik: k.baslik, tur: turBul(k.baslik), sure: null, dokum: null });
  }
  for (const f of dokumAdlari) {
    const d = oku(join(dokumKok, f));
    const yt = idAl(d.video);
    let v = videolar.find((x) => x.yt === yt);
    if (!v) {
      const ad = f.slice(ders.length + 1, -5);
      const tur = ad === "kisa-vize" ? "kisa-ozet" : turBul("", ad);
      v = { yt, url: d.video, baslik: d.title ?? TUR_ADLARI[tur], tur, sure: null, dokum: null };
      if (yt) videolar.push(v);
      else continue;
    }
    v.dokum = d;
    v.sure = d.sure ?? null;
  }
  const soruVektorleri = soruHazirla(soruDosyasi);
  for (const v of videolar) {
    let kod = v.tur;
    for (let n = 2; kullanilan.has(kod); n++) kod = `${v.tur}-${n}`;
    kullanilan.add(kod);
    v.kod = kod;
    v.satirlar = (v.dokum?.bolumler ?? []).map((b, i) => ({ i, bas: b.bas, bit: b.bit, k: b.konusmaci, m: b.metin, konu: null, g: 0 }));
    hizalaKonu(v.satirlar, konuListesi, { onbellekYolu: join(kok, "data", "calisma-odasi", "etiket", `${ders}-${v.kod}.json`) });
    if (v.tur === "soru-cozum") soruyaBagla(v.satirlar, soruVektorleri);
  }
  // Sesler: medya ajanının sözleşmesi (data/calisma-odasi-medya/<ders>.json, dökümler <ders>/ klasöründe)
  const medyaKok = join(kok, "data", "calisma-odasi-medya");
  const sozlesme = join(medyaKok, `${ders}.json`);
  if (existsSync(sozlesme)) {
    const kayitlarM = oku(sozlesme).medyalar ?? [];
    // A YouTube entry with "parcalar" is one video made by joining those audio parts end to end (the long narration
    // video, Zeki 21 Nov 2026: "ses yerine video ekle"); it replaces them and takes their transcripts, shifted by the
    // running sum of the part lengths.
    const videoParcasi = new Set(kayitlarM.filter((x) => x.tur === "youtube").flatMap((x) => x.parcalar ?? []));
    const sesSatirlari = new Map();
    for (const x of kayitlarM) {
      if (x.tur !== "ses" || !x.kaynak) continue;
      const dokumYolu = join(medyaKok, ders, basename(x.dokum ?? ""));
      const d = x.dokum && existsSync(dokumYolu) ? oku(dokumYolu) : null;
      const satirlar = (d?.satirlar ?? []).map((b, i) => ({ i, bas: b.bas, bit: b.bit, k: b.konusmaci ?? "", m: b.metin, konu: b.konu ?? null, g: b.guven ?? 0 }));
      // Konu etiketi yoksa ünitenin konularına sıralı hizalama (Gemini ve önbellek kullanılmaz)
      if (satirlar.some((s) => !s.konu)) hizalaKonu(satirlar, x.unite ? konuListesi.filter((k) => k.unite === x.unite) : konuListesi, {});
      sesSatirlari.set(x.id, { sure: x.sure ?? 0, satirlar });
      if (videoParcasi.has(x.id)) continue;
      videolar.push({ kod: x.id, ortam: "ses", tur: x.cesit ?? "uzun-anlatim", baslik: x.baslik, yt: x.kaynak, url: x.kaynak, sure: x.sure ?? null, unite: x.unite, kapak: x.kapak, satirlar });
    }
    for (const x of kayitlarM) {
      if (x.tur !== "youtube" || !x.kaynak) continue;
      const satirlar = [];
      let kayma = 0;
      for (const id of x.parcalar ?? []) {
        const p = sesSatirlari.get(id);
        if (!p) continue;
        for (const s of p.satirlar) satirlar.push({ ...s, i: satirlar.length, bas: s.bas + kayma, bit: s.bit + kayma });
        kayma += p.sure;
      }
      // the same video may also be listed in youtube-videolar.json (course page); keep one entry
      const onceki = videolar.findIndex((v) => v.yt === x.kaynak);
      if (onceki >= 0) {
        kullanilan.delete(videolar[onceki].kod);
        videolar.splice(onceki, 1);
      }
      videolar.push({ kod: x.id, tur: x.cesit ?? "uzun-anlatim", baslik: x.baslik, yt: x.kaynak, url: `https://youtu.be/${x.kaynak}`, sure: x.sure ?? kayma, satirlar });
    }
  }
  // Book headings split over two lines become two topics ("1.2 ... VE" + "1.3 ANLAMAK"); empty "Özet (devamı)" topics carry nothing.
  // Merge the heading into the next topic and drop the empty ones. Ids stay as they are (questions, transcripts and records
  // are keyed by them); only the printed number (goster) is renumbered so the list has no gaps.
  const bosluk = (s) => (s ?? "").replace(/\s+/g, " ").trim();
  const takma = new Map();
  for (let i = 0; i < konuListesi.length; i++) {
    const a = konuListesi[i];
    const b = konuListesi[i + 1];
    const govde = bosluk(a.metin);
    if (a.calisma) continue;
    if (b && b.unite === a.unite && govde && govde === bosluk(`${a.baslik} ${b.baslik}`)) {
      b.baslik = govde;
      takma.set(a.no, b.no);
    } else if (!govde && /^özet \(devamı\)$/i.test(bosluk(a.baslik))) {
      takma.set(a.no, konuListesi[i - 1]?.no ?? a.no);
    }
  }
  for (let i = konuListesi.length - 1; i >= 0; i--) if (takma.has(konuListesi[i].no)) konuListesi.splice(i, 1);
  for (const v of kavramlar.values()) if (takma.has(v.konu)) v.konu = takma.get(v.konu);
  for (const v of videolar) for (const s of v.satirlar) if (s.konu && takma.has(s.konu)) s.konu = takma.get(s.konu);
  const sayac = new Map();
  for (const k of konuListesi) {
    k.baslik = k.baslik.replace(/^\d+\.\d+(?:\.\d+)*\.?\s+(?=\S)/, "");
    const derinlik = k.no.split(".").length;
    const say = sayac.get(k.unite) ?? [];
    say.length = Math.max(say.length, derinlik);
    say[derinlik - 1] = (say[derinlik - 1] ?? 0) + 1;
    for (let d = derinlik; d < say.length; d++) say[d] = 0;
    sayac.set(k.unite, say);
    k.goster = [k.unite, ...Array.from(say.slice(1, derinlik), (n) => n || 1)].join("."); // Array.from fills holes left by skipped levels
  }
  // Written topic explanations: data/calisma-odasi/anlatim/<ders>.json ({no: markdown}) from scripts/konu-anlatimi-uret.py.
  const anlatimYolu = join(kok, "data", "calisma-odasi", "anlatim", `${ders}.json`);
  if (existsSync(anlatimYolu)) {
    const anlatimlar = oku(anlatimYolu);
    for (const k of konuListesi) if (typeof anlatimlar[k.no] === "string") k.anlatim = anlatimlar[k.no];
    console.log(`[calisma-odasi] ${ders}: ${konuListesi.filter((k) => k.anlatim).length} konuda yazılı konu anlatımı`);
  }
  // Topic drawings: data/calisma-odasi/gorsel/<ders>.json ({no: url}) written with the image files by auzeff-tui's
  // scripts/konu-gorseli-aktar.py into public/calisma/<ders>/gorsel/.
  const gorselYolu = join(kok, "data", "calisma-odasi", "gorsel", `${ders}.json`);
  if (existsSync(gorselYolu)) {
    const gorseller = oku(gorselYolu);
    for (const k of konuListesi) if (typeof gorseller[k.no] === "string") k.gorsel = gorseller[k.no];
    console.log(`[calisma-odasi] ${ders}: ${konuListesi.filter((k) => k.gorsel).length} konuda görsel`);
  }
  if (takma.size) console.log(`[calisma-odasi] ${ders}: ${takma.size} bölünmüş başlık ya da boş konu birleştirildi (${[...takma.keys()].join(", ")})`);
  // Proper names (people, civilizations, places, events, works...): data/calisma-odasi/adlar/<ders>.json from scripts/adlar-uret.py.
  // They become underlined terms like concepts, with tur set so the page can list them apart.
  const adlarYolu = join(kok, "data", "calisma-odasi", "adlar", `${ders}.json`);
  if (existsSync(adlarYolu)) {
    const konuVar = new Set(konuListesi.map((k) => k.no));
    let adSayisi = 0;
    const adKaydi = oku(adlarYolu);
    // book text first, then names the written explanations add (first source that names a person wins)
    for (const liste of [...Object.values(adKaydi.uniteler ?? {}), ...Object.values(adKaydi.anlatimUniteler ?? {}), ...Object.values(adKaydi.ekUniteler ?? {})]) {
      for (const x of liste) {
        const terim = (x.terim ?? "").trim();
        const anahtar = tr(terim);
        if (terim.length < 3 || !x.tanim) continue;
        const konular = (x.konular ?? []).map((n) => takma.get(n) ?? n).filter((n) => konuVar.has(n));
        if (!konular.length) continue;
        const onceki = kavramlar.get(anahtar);
        if (onceki?.tur) continue; // first unit that names it wins
        const baslik = [x.ad && x.ad !== terim ? x.ad : null, x.yasam ? `(${x.yasam})` : null].filter(Boolean).join(" ");
        // other ways the text writes the same name: full name, initial + surname ("M. Weber")
        const digerYazim = new Set();
        const tam = (x.ad ?? "").trim();
        if (tam && tr(tam) !== anahtar) digerYazim.add(tam);
        const kelimeler = tam.split(/\s+/).filter(Boolean);
        if ((x.tur ?? "kisi") === "kisi" && kelimeler.length >= 2) digerYazim.add(`${kelimeler[0][0]}. ${kelimeler.slice(1).join(" ")}`);
        for (const t of digerYazim) if (kavramlar.has(tr(t)) && !kavramlar.get(tr(t)).tur) kavramlar.delete(tr(t));
        kavramlar.set(anahtar, { terim, tanim: baslik ? `${baslik}. ${x.tanim}` : x.tanim, konu: konular[0], kaynak: "ad", tur: x.tur ?? "kisi", ...(digerYazim.size ? { takma: [...digerYazim] } : {}) });
        adSayisi++;
      }
    }
    console.log(`[calisma-odasi] ${ders}: ${adSayisi} özel ad (kişi, topluluk, yer, olay...)`);
  }
  const medyalar = videolar.map((v) => {
    const konuAraliklari = {};
    for (const k of konuListesi) {
      const ilgili = v.satirlar.filter((s) => s.konu === k.no && !s.y);
      if (ilgili.length) konuAraliklari[k.no] = { ilk: ilgili[0].i, say: ilgili.length };
    }
    return {
      id: v.kod,
      tur: v.ortam ?? "youtube",
      cesit: v.tur,
      baslik: v.baslik,
      kaynak: v.yt,
      sure: v.sure,
      ...(v.unite ? { unite: v.unite } : {}),
      ...(v.kapak ? { kapak: v.kapak } : {}),
      satirlar: v.satirlar,
      konuAraliklari,
    };
  });
  const veri = {
    ders,
    uni: UNI,
    uretim: new Date().toISOString().slice(0, 10),
    medyalar,
    uniteler: uniteler.map((u) => ({ no: u.unite, baslik: u.baslik, konular: konuListesi.filter((k) => k.unite === u.unite).map((k) => k.no) })),
    konular: konuListesi.map(({ kitapKavramlari, ...k }) => {
      void kitapKavramlari;
      return k;
    }),
    kavramlar: [...kavramlar.values()],
    sorular,
  };
  if (!veri.konular.length) {
    console.log(`[calisma-odasi] ${ders}: konu anlatımı yok, paket yazılmadı`);
    return;
  }
  mkdirSync(cikti, { recursive: true });
  // aynı ders kimliği başka üniversitelerde de var: ATA dışındaki paketler üniversite önekli adlanır
  const yol = join(cikti, UNI === "ataturk-aof" ? `${ders}.json` : `${UNI}--${ders}.json`);
  writeFileSync(yol, JSON.stringify(veri));
  const kb = Math.round(statSync(yol).size / 1024);
  const satirSayisi = videolar.reduce((t, v) => t + v.satirlar.length, 0);
  const calismali = veri.konular.filter((k) => k.calisma).length;
  console.log(
    `[calisma-odasi] ${ders}: ${veri.konular.length} konu (${calismali} çalışma malzemeli, ${etkinlikDosya} etkinlik dosyası), ${videolar.length} medya, ${satirSayisi} satır, ${veri.kavramlar.length} kavram, ${kb} KB`,
  );
}

const secili = process.argv.slice(2);
for (const d of secili.length ? secili : DERSLER) paketle(d);
