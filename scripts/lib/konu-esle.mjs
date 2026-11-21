// Döküm satırı -> konu eşleştirmesi (çalışma odası). docs/konu-anlatimi.md, "Konu eşleştirme (v2)".
//
// Varsayım: podcast kitabı sırayla anlatır (üniteler ve ünite içindeki konular artan sırada), bazı konuları
// atlar, nadiren geri döner. Bu yüzden eşleştirme sıralı hizalamadır: gizli durumlar kitabın konuları (belge
// sırasıyla), gözlem her satırın konu belgeleriyle sözcük benzerliği. Ileri atlama ucuz, geri dönüş pahalı,
// ünite atlamak orta bedelli. Ileri-geri algoritmayla her satırın seçilen konuya ait sonsal olasılığı
// (güven puanı) hesaplanır; Viterbi yolu etiketi verir. Hiçbir satır konusuz kalmaz.
//
// Sözcük benzerliği: Türkçe küçük harf, durak sözcük ayıklama, ilk 5 harf gövdeleme, ardışık sözcük çiftleri
// (iki sözcüklü kavramlar), kavram terimleri için ek ağırlık, TF-IDF kosinüs; komşu satırlarla pencere.
// Belirsiz satırlar (güven < ESIK_BELIRSIZ) için isteğe bağlı Gemini sınıflandırması: sonuç depoda saklanan
// önbellek dosyasından okunur (data/calisma-odasi/etiket/), böylece paketleme tekrarlanabilir kalır.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const tr = (s) => s.toLocaleLowerCase("tr");

export const ATLA_RE = /kaynak|kaynakça|değerlendirme soruları|okuma önerileri|bibliyografya|sözlükçe|yararlanılan/i;

const DURAK = new Set(
  `ve bir bu şu o için ile gibi daha çok en da de ki mi mı mu mü ama fakat ancak çünkü yani ise olan olarak olduğu olur oldu olması
  var yok her hem ya veya ne nasıl peki evet tabii tabi kesinlikle aynen tam doğru güzel harika işte şimdi bunu bunun buna bunlar bunları
  onlar kendi bütün tüm arasında sonra önce kadar göre diye üzere bile sadece yalnızca ayrıca hatta örneğin mesela bunlardan can ayşe
  merhaba herkese selamlar bugün hemen çok iyi evet gerçekten özellikle bence şöyle böyle öyle daha artık yine zaten bazen genellikle
  sizce biz siz ben sen onun onu ona bunda şunu şuna olarak olan olanlar edilir edilen edilmesi yapılır yapılan yapan etmek eder
  ederek sayesinde birlikte üzerinde içinde aynı başka diğer başlıca gerek gerekir gerekiyor mümkün hangi hepsi bazı birçok biraz
  kısaca kısacası bakalım bakarsak bakıyoruz söylersek diyebiliriz diyoruz denir denilir değil değildir mıdır midir`
    .split(/\s+/),
);

export function jetonlar(metin) {
  const sonuc = [];
  for (const m of tr(String(metin ?? "")).matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0];
    if (w.length < 3 || /^\d+$/.test(w) || DURAK.has(w)) continue;
    sonuc.push(w.slice(0, 5));
  }
  return sonuc;
}

// Ağırlıklı özellik vektörü: tek sözcükler (ağırlık a) ve ardışık çiftler (ağırlık a * CIFT)
const CIFT = 0.6;
function vektor(parcalar, v = new Map()) {
  for (const [metin, a] of parcalar) {
    if (!metin || !a) continue;
    const j = jetonlar(metin);
    for (let i = 0; i < j.length; i++) {
      v.set(j[i], (v.get(j[i]) ?? 0) + a);
      if (i + 1 < j.length) {
        const c = `${j[i]}_${j[i + 1]}`;
        v.set(c, (v.get(c) ?? 0) + a * CIFT);
      }
    }
  }
  return v;
}

const logTopla = (a, b) => (a > b ? a + Math.log1p(Math.exp(b - a)) : b + Math.log1p(Math.exp(a - b)));

export function uygunKonular(konular) {
  // Atlanan: kaynakça/değerlendirme başlıkları, çok kısa ve malzemesiz parçalar (başlık kırıntıları)
  return konular.map((k) => !ATLA_RE.test(tr(k.baslik)) && ((k.metin?.length ?? 0) >= 120 || k.calisma));
}

// BM25: satır (pencere) sorgu, konu belgesi doküman. Uzun konular uzunluk normalleştirmesiyle cezalandırılır.
const K1 = 1.4;
const B = 0.6;
function konuBelgeleri(konular, uygun) {
  const df = new Map();
  const belgeler = konular.map((k, t) => {
    if (!uygun[t]) return new Map();
    const c = k.calisma;
    const v = vektor([
      [k.baslik, 4],
      [k.metin, 1],
      [(k.kitapKavramlari ?? []).join(" "), 3],
      [(c?.kavramlar ?? []).map((x) => x.terim).join(" "), 4],
      [(c?.kavramlar ?? []).map((x) => x.tanim).join(" "), 1.5],
      [(c?.temelNoktalar ?? []).join(" "), 2.5],
      [c?.ozet ?? "", 2.5],
    ]);
    for (const j of v.keys()) df.set(j, (df.get(j) ?? 0) + 1);
    return v;
  });
  const N = uygun.filter(Boolean).length || 1;
  const uzun = belgeler.map((v) => [...v.values()].reduce((a, b) => a + b, 0));
  const ort = uzun.filter((u, t) => uygun[t]).reduce((a, b) => a + b, 0) / N || 1;
  const idf = (j) => Math.log(1 + (N - (df.get(j) ?? 0) + 0.5) / ((df.get(j) ?? 0) + 0.5));
  // Kosinüs (TF-IDF) karşılaştırması için normalleştirilmiş belge vektörleri
  const normV = (v) => {
    const o = new Map();
    let n = 0;
    for (const [j, w] of v) {
      const x = Math.log(1 + w) * idf(j);
      if (x <= 0) continue;
      o.set(j, x);
      n += x * x;
    }
    n = Math.sqrt(n) || 1;
    for (const [j, x] of o) o.set(j, x / n);
    return o;
  };
  const belgeVek = belgeler.map(normV);
  const kos = (q, t) => {
    if (!uygun[t]) return NaN;
    const nq = normV(q);
    let s = 0;
    for (const [j, x] of nq) s += x * (belgeVek[t].get(j) ?? 0);
    return s;
  };
  const skor = process.env.CALISMA_SKOR === "cos" ? kos : (q, t) => {
    if (!uygun[t]) return NaN;
    let s = 0;
    const d = belgeler[t];
    const ln = 1 - B + (B * uzun[t]) / ort;
    for (const [j, w] of q) {
      const tf = d.get(j);
      if (!tf) continue;
      s += w * idf(j) * ((tf * (K1 + 1)) / (tf + K1 * ln));
    }
    return s;
  };
  return { skor };
}

// Gizli durumlar: (kip, konu). Kip 0 = sıralı anlatım, kip 1 = serbest tekrar (özet sonundaki pekiştirme turu:
// konular sırasız gelir). 0 -> 1 geçişi tek yönlüdür. Matris günlük olasılık, (S x S), S = 2 * T.
function gecisMatrisi(konular, uygun, p) {
  const T = konular.length;
  const S = 2 * T;
  const idx = konular.map((_, t) => t).filter((t) => uygun[t]);
  const sira = new Map(idx.map((t, i) => [t, i]));
  const M = new Float64Array(S * S).fill(-Infinity);
  const n = idx.length;
  for (const a of idx) {
    // kip 0 -> kip 0
    const ham = new Map();
    let toplam = 0;
    for (const b of idx) {
      let w;
      const j = Math.abs(sira.get(b) - sira.get(a));
      const ayniUnite = konular[a].unite === konular[b].unite;
      if (a === b) w = p.kal;
      else if (b > a) w = p.ileri * Math.pow(1 + j, -p.ileriUs) * (ayniUnite ? 1 : p.uniteCarpani);
      else w = p.geri * Math.pow(1 + j, -p.ileriUs) * (ayniUnite ? 1 : p.uniteGeriCarpani);
      ham.set(b, w);
      toplam += w;
    }
    for (const [b, w] of ham) M[a * S + b] = Math.log((w / toplam) * (1 - p.anahtarGecis));
    // kip 0 -> kip 1 (serbest)
    for (const b of idx) M[a * S + T + b] = Math.log(p.anahtarGecis / n);
    // kip 1 -> kip 1
    for (const b of idx) M[(T + a) * S + T + b] = Math.log(a === b ? p.tekrarKal : (1 - p.tekrarKal) / (n - 1));
  }
  return { M, S, T, idx };
}

export const VARSAYILAN = {
  beta: Number(process.env.CALISMA_BETA ?? 1.8), // emisyon keskinliği (z-puanı ölçeği)
  kal: 0.3,
  ileri: 0.6,
  geri: 0.08,
  ileriUs: 1.15,
  uniteCarpani: 0.8,
  uniteGeriCarpani: 0.6,
  anahtarGecis: Number(process.env.CALISMA_TEKRAR ?? 0.012), // sıralı kipten "serbest tekrar" kipine geçiş (podcast sonundaki pekiştirme)
  tekrarKal: 0.3,
  ESIK_BELIRSIZ: Number(process.env.CALISMA_BELIRSIZ ?? 0.85),
  ESIK_DUSUK: Number(process.env.CALISMA_DUSUK ?? 0.3), // altı: y=1 ("önceki konuyu sürdürür" bayrağı)
};

/** Emisyon günlük olabilirlikleri E[l][t]; kanıt: { l: t } Gemini etiketleri (güçlü artış). */
function emisyon(satirlar, konular, uygun, p, kanit) {
  const { skor } = konuBelgeleri(konular, uygun);
  const L = satirlar.length;
  const T = konular.length;
  const ham = satirlar.map((s, i) => {
    const v = vektor([
      [s.m, 1],
      [satirlar[i - 1]?.m ?? "", 0.45],
      [satirlar[i + 1]?.m ?? "", 0.45],
      [satirlar[i - 2]?.m ?? "", 0.15],
      [satirlar[i + 2]?.m ?? "", 0.15],
    ]);
    return konular.map((_, t) => skor(v, t));
  });
  const E = Array.from({ length: L }, () => new Float64Array(T).fill(-Infinity));
  for (let l = 0; l < L; l++) {
    const deg = ham[l].filter((x) => !Number.isNaN(x));
    const ort = deg.reduce((a, b) => a + b, 0) / (deg.length || 1);
    const sd = Math.sqrt(deg.reduce((a, b) => a + (b - ort) ** 2, 0) / (deg.length || 1)) || 1e-6;
    for (let t = 0; t < T; t++) {
      if (Number.isNaN(ham[l][t])) continue;
      const z = (ham[l][t] - ort) / Math.max(sd, 0.01);
      E[l][t] = p.beta * z;
      if (kanit?.has(l)) E[l][t] += kanit.get(l) === t ? 5 : 0;
    }
  }
  return { E, ham };
}

/** Viterbi yolu + ileri-geri sonsal olasılıkları (konu başına, iki kip toplanarak). */
function hizala(E, G, idx, L) {
  const { M, S, T } = G;
  const gecerli = [];
  for (const t of idx) (gecerli.push(t), gecerli.push(T + t));
  const em = (l, s) => E[l][s >= T ? s - T : s];
  const bas = Math.log(1 / idx.length);
  const alfa = Array.from({ length: L }, () => new Float64Array(S).fill(-Infinity));
  const vit = Array.from({ length: L }, () => new Float64Array(S).fill(-Infinity));
  const ref = Array.from({ length: L }, () => new Int32Array(S).fill(-1));
  for (const t of idx) {
    alfa[0][t] = vit[0][t] = bas + em(0, t); // yalnız sıralı kipten başla
  }
  for (let l = 1; l < L; l++) {
    for (const b of gecerli) {
      let top = -Infinity;
      let enIyi = -Infinity;
      let enIyiA = -1;
      for (const a of gecerli) {
        const g = M[a * S + b];
        if (g === -Infinity) continue;
        top = logTopla(top, alfa[l - 1][a] + g);
        const vv = vit[l - 1][a] + g;
        if (vv > enIyi) ((enIyi = vv), (enIyiA = a));
      }
      alfa[l][b] = top + em(l, b);
      vit[l][b] = enIyi + em(l, b);
      ref[l][b] = enIyiA;
    }
  }
  const beta = Array.from({ length: L }, () => new Float64Array(S).fill(-Infinity));
  for (const a of gecerli) beta[L - 1][a] = 0;
  for (let l = L - 2; l >= 0; l--) {
    for (const a of gecerli) {
      let top = -Infinity;
      for (const b of gecerli) {
        const g = M[a * S + b];
        if (g === -Infinity) continue;
        top = logTopla(top, g + em(l + 1, b) + beta[l + 1][b]);
      }
      beta[l][a] = top;
    }
  }
  let son = gecerli[0];
  for (const s of gecerli) if (vit[L - 1][s] > vit[L - 1][son]) son = s;
  const durum = new Array(L);
  let s = son;
  for (let l = L - 1; l >= 0; l--) {
    durum[l] = s;
    if (l > 0) s = ref[l][s];
  }
  const yol = durum.map((d) => (d >= T ? d - T : d));
  const kip = durum.map((d) => (d >= T ? 1 : 0));
  const guven = yol.map((t, l) => {
    let z = -Infinity;
    for (const b of gecerli) z = logTopla(z, alfa[l][b] + beta[l][b]);
    const pay = logTopla(alfa[l][t] + beta[l][t], alfa[l][T + t] + beta[l][T + t]);
    return Math.exp(pay - z);
  });
  return { yol, guven, kip };
}

// ---- Gemini: belirsiz satırların sınıflandırılması (önbellekli) ----
const ozetle = (k) => {
  const c = k.calisma;
  const o = c?.ozet ?? k.metin?.slice(0, 220) ?? "";
  return o.replace(/\s+/g, " ").slice(0, 200);
};
const karma = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);

function geminiSor(istem, sistem, model) {
  const anahtar = process.env.GEMINI_API_KEY ?? (existsSync(`${process.env.HOME}/.secrets/gemini`) ? readFileSync(`${process.env.HOME}/.secrets/gemini`, "utf8").trim() : "");
  for (let d = 0; d < 3; d++) {
    const r = spawnSync("gapi", ["generate", "--model", model, "--stream=false", "--system", sistem, "--stdin"], {
      input: istem,
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, GEMINI_API_KEY: anahtar },
    });
    if (r.status === 0) {
      const m = /\{[\s\S]*\}/.exec(r.stdout.replace(/```(?:json)?/g, ""));
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          /* yeniden dene */
        }
      }
    }
  }
  return null;
}

const SISTEM = `Sen bir ders podcastı editörüsün. Bir podcast dökümünün belirsiz satırlarını ders kitabının konularına yerleştireceksin.
Podcast kitabı sırayla anlatır: konu numaraları artan sırada ilerler, geri dönüş nadirdir. Her belirsiz satır için verilen konu listesinden
EN UYGUN TEK konu numarasını seç. Seçimin satırın komşuları arasındaki sıraya uymalı. Satır giriş ya da kapanış sohbetiyse (selamlama, "yayına hoş geldiniz",
"bir sonraki bölümde") en yakın konuyu seç. Yalnız şu JSON nesnesini döndür: {"<satır no>": "<konu no>", ...}`;

function geminiEtiketle(satirlar, konular, uygun, yol, guven, p, onbellekYolu, model) {
  let onbellek = {};
  if (onbellekYolu && existsSync(onbellekYolu)) onbellek = JSON.parse(readFileSync(onbellekYolu, "utf8"));
  const belirsiz = [];
  satirlar.forEach((s, l) => {
    if (guven[l] < p.ESIK_BELIRSIZ) belirsiz.push(l);
  });
  const eksik = belirsiz.filter((l) => onbellek[l]?.h !== karma(satirlar[l].m));
  if (eksik.length && process.env.CALISMA_GEMINI === "1") {
    // Tek istek: kapsanan konu aralığı + belirsiz satırlar (bağlam: komşu satır metinleri ve mevcut atamalar)
    const alt = Math.min(...belirsiz.map((l) => yol[l]));
    const ust = Math.max(...belirsiz.map((l) => yol[l]));
    const lo = Math.max(0, alt - 6);
    const hi = Math.min(konular.length - 1, ust + 6);
    const liste = [];
    for (let t = lo; t <= hi; t++) if (uygun[t]) liste.push(`${konular[t].no} | ${konular[t].baslik} | ${ozetle(konular[t])}`);
    const blok = eksik.map((l) => {
      const onc = satirlar[l - 1] ? `(önceki satır, konu ${konular[yol[l - 1]].no}) ${satirlar[l - 1].m.slice(0, 220)}` : "";
      const son = satirlar[l + 1] ? `(sonraki satır, konu ${konular[yol[l + 1]].no}) ${satirlar[l + 1].m.slice(0, 220)}` : "";
      return `SATIR ${l}\n${onc}\n>>> ${satirlar[l].m}\n${son}`;
    });
    // Büyük istekleri parçala (en çok 25 belirsiz satır)
    for (let i = 0; i < blok.length; i += 25) {
      const grup = eksik.slice(i, i + 25);
      const istem = `KONU LİSTESİ (no | başlık | özet):\n${liste.join("\n")}\n\nBELİRSİZ SATIRLAR:\n${blok.slice(i, i + 25).join("\n\n")}`;
      const sonuc = geminiSor(istem, SISTEM, model);
      if (!sonuc) continue;
      for (const l of grup) {
        const no = String(sonuc[l] ?? "").trim();
        if (konular.some((k, t) => k.no === no && uygun[t])) onbellek[l] = { konu: no, h: karma(satirlar[l].m) };
      }
    }
    if (onbellekYolu) {
      mkdirSync(dirname(onbellekYolu), { recursive: true });
      writeFileSync(onbellekYolu, JSON.stringify(onbellek, null, 1) + "\n");
    }
  }
  const kanit = new Map();
  for (const l of belirsiz) {
    const c = onbellek[l];
    if (c && c.h === karma(satirlar[l].m)) {
      const t = konular.findIndex((k, i) => k.no === c.konu && uygun[i]);
      if (t >= 0) kanit.set(l, t);
    }
  }
  return kanit;
}

/**
 * satirlar: [{ m, ... }] (yerinde güncellenir: konu, g, y, gm), konular: paketleyicinin konu listesi (belge sırası).
 * secenek: { onbellekYolu, model }. Döner: { belirsiz, gemini }.
 */
export function konuyaEsle(satirlar, konular, secenek = {}) {
  const p = { ...VARSAYILAN, ...JSON.parse(process.env.CALISMA_P ?? "{}"), ...(secenek.p ?? {}) };
  const L = satirlar.length;
  const T = konular.length;
  if (!L || !T) return { belirsiz: 0, gemini: 0 };
  const uygun = uygunKonular(konular);
  const G = gecisMatrisi(konular, uygun, p);
  const idx = G.idx;
  let { E } = emisyon(satirlar, konular, uygun, p, null);
  let { yol, guven, kip } = hizala(E, G, idx, L);
  let gemini = 0;
  if (secenek.onbellekYolu || process.env.CALISMA_GEMINI === "1") {
    const kanit = geminiEtiketle(satirlar, konular, uygun, yol, guven, p, secenek.onbellekYolu, secenek.model ?? "gemini-3.8-flash");
    if (kanit.size) {
      ({ E } = emisyon(satirlar, konular, uygun, p, kanit));
      const yeni = hizala(E, G, idx, L);
      yol = yeni.yol;
      guven = yeni.guven;
      kip = yeni.kip;
      for (const l of kanit.keys()) if (yol[l] === kanit.get(l)) ((satirlar[l].gm = 1), gemini++);
    }
  }
  // Kapanış cümleleri (son 3 satır) içerikten bağımsızdır: son içerik satırının konusuna bağlanır
  const KAPANIS = /görüşmek üzere|iyi çalışmalar|diliyoruz|başarılar|hoşça kal|kendinize (çok )?iyi bak|dinlediğiniz için|teşekkür/i;
  for (let l = L - 1; l >= Math.max(0, L - 3); l--) {
    if (!KAPANIS.test(satirlar[l].m)) continue;
    let k = l - 1;
    while (k >= 0 && KAPANIS.test(satirlar[k].m)) k--;
    if (k >= 0) {
      yol[l] = yol[k];
      guven[l] = Math.min(guven[l], p.ESIK_DUSUK - 0.01);
    }
  }
  let belirsiz = 0;
  satirlar.forEach((s, l) => {
    s.konu = konular[yol[l]].no;
    s.g = Math.round(guven[l] * 100) / 100;
    delete s.y;
    if (kip[l]) s.t = 1; else delete s.t;
    if (s.g < p.ESIK_DUSUK && !s.gm) s.y = 1;
    if (guven[l] < p.ESIK_BELIRSIZ) belirsiz++;
  });
  return { belirsiz, gemini };
}

/** Hata ayıklama: bir satırın en yüksek ham benzerlik taşıyan konuları. */
export function __debug(satirlar, konular) {
  const p = { ...VARSAYILAN };
  const uygun = uygunKonular(konular);
  const { E, ham } = emisyon(satirlar, konular, uygun, p, null);
  return { top: (l) => ham[l].map((c, t) => [konular[t].no, c, E[l][t] / p.beta]).filter((x) => !Number.isNaN(x[1])).sort((a, b) => b[1] - a[1]).slice(0, 5) };
}

/**
 * Ders paketi döküm satırı (src/lib/ders-paketi/sema.ts, DokumSatiriSemasi):
 * {bas, bit, konusmaci, metin, konu, guven, soru?}. Konu yalnız giriş ve kapanışta null olabilir;
 * eşleştirici her satıra bir konu verdiği için null üretmez, güven puanı belirsizliği taşır.
 */
export function dokumSatiriSemaya(s) {
  const o = { bas: s.bas, bit: s.bit, konusmaci: s.k ?? "", metin: s.m ?? "", konu: s.konu ?? null, guven: Math.min(1, Math.max(0, s.g ?? 0)) };
  if (s.soru) o.soru = s.soru;
  return o;
}
