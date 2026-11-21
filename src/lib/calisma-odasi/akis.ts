// "Konu konu" akışı için saf mantık: anlatım HTML'i, kitaptan dayanak paragrafı, zayıf konular, arama, yazdırma.
// DOM bağlama: src/scripts/calisma-odasi.ts. Testler: calisma-odasi.test.ts.
import type { CalismaKavrami, CalismaKonu } from "./sema";

export type AkisSoru = {
  id: string;
  no: number;
  text: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  sinav?: string;
  sinavlar?: string;
  konu?: string;
};
export type CevapKaydi = Record<string, { secim: string | null; dogru: boolean }>;

export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tr = (s: string): string => s.toLocaleLowerCase("tr");
const govdeler = (s: string): Set<string> => new Set((tr(s).match(/[\p{L}\p{N}]{4,}/gu) ?? []).map((w) => w.slice(0, 5)));

/** Çalışma malzemesi: özet, temel noktalar, sebep-sonuç, örnekler, benzetmeler. Boş bölüm hiç yazılmaz. "Üzerine düşün" ayrı basılır. */
export function anlatimHtml(k: CalismaKonu): string {
  const c = k.calisma;
  if (!c) return "";
  const liste = (baslik: string, x: string[] | undefined): string =>
    x?.length ? `<h4 class="co-alt-baslik">${baslik}</h4><ul class="co-noktalar">${x.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "";
  const sebep = c.sebepSonuclar?.length
    ? `<h4 class="co-alt-baslik">Sebep ve sonuç</h4><ul class="co-noktalar">${c.sebepSonuclar.map((x) => `<li><b>Sebep:</b> ${esc(x.sebep)} <b>Sonuç:</b> ${esc(x.sonuc)}</li>`).join("")}</ul>`
    : "";
  return (c.ozet ? `<p class="co-ozet">${esc(c.ozet)}</p>` : "") + liste("Temel noktalar", c.temelNoktalar) + sebep + liste("Örnekler", c.ornekler) + liste("Benzetmeler", c.benzetmeler);
}
export const dusunHtml = (k: CalismaKonu): string =>
  k.calisma?.tartismaSorulari?.length
    ? `<h4 class="co-alt-baslik">Üzerine düşün</h4><ul class="co-noktalar">${k.calisma.tartismaSorulari.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : "";

/** Kitap metninden soruya en çok dayanak olan paragraf (ortak gövde sayısı en az 3); yoksa null. */
export function kitaptaParagraf(metin: string, soru: Pick<AkisSoru, "text" | "options" | "answer">): string | null {
  const sorgu = govdeler(`${soru.text} ${soru.options[soru.answer] ?? ""}`);
  if (sorgu.size < 3) return null;
  let en: string | null = null;
  let puan = 2;
  for (const par of metin.split("\n")) {
    const p = par.trim();
    if (p.length < 40) continue;
    const g = govdeler(p);
    let n = 0;
    for (const s of sorgu) if (g.has(s)) n++;
    if (n > puan) {
      puan = n;
      en = p;
    }
  }
  if (!en) return null;
  return en.length > 700 ? `${en.slice(0, 697).replace(/\s+\S*$/, "")}...` : en;
}

/** Soru kimliklerini konuya göre toplar. Bölüm tam konu numarası ya da alt bölümüdür (1.3.9 -> 1.3). */
export function sorulariKonuyaDagit(sorular: AkisSoru[], konuNolari: string[]): Map<string, AkisSoru[]> {
  const harita = new Map<string, AkisSoru[]>(konuNolari.map((n) => [n, []]));
  for (const q of sorular) {
    let b = q.konu ?? "";
    while (b) {
      const l = harita.get(b);
      if (l) {
        l.push(q);
        break;
      }
      b = b.includes(".") ? b.slice(0, b.lastIndexOf(".")) : "";
    }
  }
  return harita;
}

export type KonuDurumu = { no: string; toplam: number; cozulen: number; dogru: number; yanlis: number };
export function konuDurumu(no: string, sorular: AkisSoru[], cevaplar: CevapKaydi): KonuDurumu {
  let cozulen = 0;
  let dogru = 0;
  for (const q of sorular) {
    const c = cevaplar[q.id];
    if (!c) continue;
    cozulen++;
    if (c.dogru) dogru++;
  }
  return { no, toplam: sorular.length, cozulen, dogru, yanlis: cozulen - dogru };
}

/** Yanlış yapılan ya da hiç çözülmeyen konular: önce yanlışı çok olan, sonra sorusu çok olan. */
export function zayifKonular(durumlar: KonuDurumu[]): KonuDurumu[] {
  return durumlar
    .filter((d) => d.toplam > 0 && (d.yanlis > 0 || d.cozulen === 0))
    .sort((a, b) => b.yanlis - a.yanlis || b.toplam - a.toplam || a.no.localeCompare(b.no, "tr", { numeric: true }));
}

export type AramaSonucu = { tur: "konu" | "kavram" | "soru"; konu: string; metin: string; id?: string };
export function aramaYap(konular: CalismaKonu[], kavramlar: CalismaKavrami[], sorular: AkisSoru[], sorgu: string, sinir = 40): AramaSonucu[] {
  const q = tr(sorgu.trim());
  if (q.length < 2) return [];
  const sonuc: AramaSonucu[] = [];
  const ekle = (r: AramaSonucu): void => void (sonuc.length < sinir && sonuc.push(r));
  for (const k of konular) if (tr(`${k.no} ${k.baslik}`).includes(q)) ekle({ tur: "konu", konu: k.no, metin: k.baslik });
  for (const v of kavramlar) if (tr(v.terim).includes(q)) ekle({ tur: "kavram", konu: v.konu, metin: v.terim });
  for (const s of sorular) {
    if (!s.konu || !tr(s.text).includes(q)) continue;
    ekle({ tur: "soru", konu: s.konu, metin: s.text.length > 110 ? `${s.text.slice(0, 107)}...` : s.text, id: s.id });
  }
  return sonuc;
}

/** Ünite çalışma kâğıdı: konu konu anlatım, kavramlar, sorular; cevap anahtarı sonda. */
export function uniteBaskiHtml(unite: number, baslik: string, konular: CalismaKonu[], kavramlar: CalismaKavrami[], sorular: Map<string, AkisSoru[]>): string {
  let sayac = 0;
  const anahtar: { n: number; cevap: string; aciklama: string }[] = [];
  const govde = konular
    .map((k) => {
      const kav = kavramlar.filter((v) => v.konu === k.no);
      const sor = sorular.get(k.no) ?? [];
      const kitap = k.calisma ? "" : k.metin.split("\n").filter((x) => x.trim()).slice(0, 6).map((x) => `<p>${esc(x)}</p>`).join("");
      return (
        `<section class="co-baski-konu"><h2><span>${esc(k.no)}</span> ${esc(k.baslik)}</h2>` +
        anlatimHtml(k) +
        kitap +
        (kav.length ? `<h4 class="co-alt-baslik">Kavramlar</h4><dl class="co-tanimlar">${kav.map((v) => `<div><dt>${esc(v.terim)}</dt><dd>${esc(v.tanim)}</dd></div>`).join("")}</dl>` : "") +
        (sor.length
          ? `<h4 class="co-alt-baslik">Çıkmış sorular</h4>` +
            sor
              .map((q) => {
                const n = ++sayac;
                anahtar.push({ n, cevap: q.answer, aciklama: q.explanation });
                return `<div class="co-baski-soru"><p><b>${n}.</b> ${esc(q.text)}</p><ol type="A">${Object.values(q.options).map((o) => `<li>${esc(o)}</li>`).join("")}</ol></div>`;
              })
              .join("")
          : "") +
        `</section>`
      );
    })
    .join("");
  const anahtarHtml = anahtar.length
    ? `<section class="co-baski-anahtar"><h2>Cevap anahtarı</h2><ol>${anahtar.map((a) => `<li value="${a.n}"><b>${esc(a.cevap)}</b>${a.aciklama ? ` ${esc(a.aciklama)}` : ""}</li>`).join("")}</ol></section>`
    : "";
  return `<h1>Ünite ${unite}${baslik ? `: ${esc(baslik)}` : ""}</h1>${govde}${anahtarHtml}`;
}
