// Splits a textbook unit (MDX with <Konu> sections) into topic files: sanitized HTML for the drawer,
// plain text for read-aloud, concepts and the links between topics (wiki-style graph data).
// Pure functions only; scripts/konu-parcala.mjs does the file work. Plain type syntax so Node can run it
// directly (type stripping) and Vitest can import it.
import { Marked } from "marked";
import type { Calisma } from "./calisma";

export type KonuRef = { no: string; baslik: string };

export type KonuDosyasi = {
  id: string; // <uni>/<course>/<no>, stable
  no: string;
  baslik: string;
  unite: number;
  sayfa: number;
  html: string;
  metin: string;
  kavramlar: string[];
  baglantilar: string[]; // ids of linked topics (prev, next and topics sharing a concept)
  calisma?: Calisma; // study material from kitap/etkinlik (merged by scripts/konu-parcala.mjs when present)
  onceki: KonuRef | null;
  sonraki: KonuRef | null;
};

export type HamKonu = { no: string; baslik: string; sayfa: number; govde: string };
export type HamUnite = { unite: number; baslik: string; konular: HamKonu[] };

export type DersIndeksi = {
  uniteler: { no: number; baslik: string; konular: { no: string; baslik: string; sayfa: number }[] }[];
};
export type Cizge = {
  dugumler: { id: string; no: string; baslik: string; unite: number }[];
  kenarlar: { kaynak: string; hedef: string; tur: "sira" | "kavram" }[];
};

const KONU_ETIKETI = /<Konu\s+id="[^"]*"\s+no="([^"]*)"\s+baslik=\{("(?:[^"\\]|\\.)*")\}\s+sayfa=\{(\d+)\}\s*>/g;

export function uniteOku(mdx: string): HamUnite {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(mdx);
  const baslik0 = fm ? /^baslik:\s*(.*)$/m.exec(fm[1])?.[1]?.trim() ?? "" : "";
  let baslik = baslik0;
  try {
    baslik = JSON.parse(baslik0);
  } catch {
    // unquoted title: keep as is
  }
  const unite = fm ? Number.parseInt(/^unite:\s*(\d+)/m.exec(fm[1])?.[1] ?? "0", 10) : 0;
  const metin = fm ? mdx.slice(fm[0].length) : mdx;

  const etiketler = [...metin.matchAll(KONU_ETIKETI)];
  const konular: HamKonu[] = [];
  etiketler.forEach((m, i) => {
    const bas = (m.index ?? 0) + m[0].length;
    const sonraki = etiketler[i + 1]?.index ?? metin.length;
    let govde = metin.slice(bas, sonraki);
    const kapan = govde.indexOf("</Konu>");
    if (kapan !== -1) govde = govde.slice(0, kapan);
    let adi = m[2];
    try {
      adi = JSON.parse(m[2]);
    } catch {
      adi = m[2].slice(1, -1);
    }
    konular.push({ no: m[1], baslik: adi, sayfa: Number.parseInt(m[3], 10), govde: govde.trim() });
  });
  return { unite, baslik, konular };
}

// ---- Markdown -> sanitized HTML ----

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    html: () => "", // raw HTML is dropped; only the three book components are mapped (before markdown)
    image: () => "",
    link({ tokens }) {
      return this.parser.parseInline(tokens); // links are dropped, their text stays
    },
    heading({ tokens, depth }) {
      const d = Math.max(3, Math.min(6, depth + 1));
      return `<h${d}>${this.parser.parseInline(tokens)}</h${d}>\n`;
    },
  },
});

function mdHtml(kaynak: string): string {
  if (!kaynak.trim()) return "";
  const h = md.parse(kaynak, { async: false }) as string;
  return h.replace(/<table>/g, '<div class="konu-tablo"><table>').replace(/<\/table>/g, "</table></div>");
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function htmlMetne(html: string): string {
  return html
    .replace(/<\/(p|li|h[1-6]|tr|blockquote|div|aside|table)>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(td|th)>/g, ". ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, k: string) => {
      if (k[0] === "#") {
        const n = k[1].toLowerCase() === "x" ? Number.parseInt(k.slice(2), 16) : Number.parseInt(k.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENT[k.toLowerCase()] ?? m;
    })
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ---- Concepts ----

export function kavramAyikla(markdown: string): string[] {
  const bulunan = new Map<string, string>();
  for (const m of markdown.matchAll(/\*\*([^*\n]{2,80}?)\*\*/g)) {
    const t = m[1].trim().replace(/[\s.,:;]+$/u, "");
    if (t.length < 3 || /^\d/.test(t)) continue;
    const anahtar = t.toLocaleLowerCase("tr");
    if (!bulunan.has(anahtar)) bulunan.set(anahtar, t);
  }
  return [...bulunan.values()];
}

/** One topic body (markdown with the book components) -> html, read-aloud text, concepts. */
export function konuGovdesi(govde: string, baslik: string, no: string, ilkSayfa: number) {
  // The first heading repeats the topic number and title (shown in the drawer header)
  const temiz = govde.replace(/^#{1,6}[ \t]+\d+(?:\.\d+)*[ \t][^\n]*\n?/, "");
  const jeton =
    /<Gorsel\s+sayfa=\{(\d+)\}\s*\/>|<Altyazi>([\s\S]*?)<\/Altyazi>|<Kutu\s+tur="([^"]*)"(?:\s+sayfa=\{(\d+)\})?\s*>|<\/Kutu>/g;

  const kavramlar = new Map<string, string>();
  const ekle = (k: string) => {
    const a = k.toLocaleLowerCase("tr");
    if (!kavramlar.has(a)) kavramlar.set(a, k);
  };
  const html: string[] = [];
  const metin: string[] = [];
  let kutu: { tur: string; html: string[]; metin: string[] } | null = null;
  let tampon = "";
  let sonSayfa = ilkSayfa;

  const hedefHtml = () => (kutu ? kutu.html : html);
  const hedefMetin = () => (kutu ? kutu.metin : metin);
  const bosalt = () => {
    if (!tampon.trim()) {
      tampon = "";
      return;
    }
    for (const k of kavramAyikla(tampon)) ekle(k);
    const h = mdHtml(tampon);
    hedefHtml().push(h);
    hedefMetin().push(htmlMetne(h));
    tampon = "";
  };
  const kutuKapat = () => {
    if (!kutu) return;
    const k = kutu;
    kutu = null;
    ekle(k.tur);
    html.push(`<aside class="konu-kutu" data-tur="${esc(k.tur)}"><p class="konu-kutu-ad">${esc(k.tur)}</p>${k.html.join("")}</aside>`);
    metin.push([k.tur + ".", ...k.metin].join("\n"));
  };

  let son = 0;
  for (const m of temiz.matchAll(jeton)) {
    tampon += temiz.slice(son, m.index);
    son = (m.index ?? 0) + m[0].length;
    if (m[0].startsWith("<Gorsel")) {
      const s = Number.parseInt(m[1], 10);
      if (!kutu && s !== sonSayfa) {
        bosalt();
        html.push(`<p class="konu-sayfa">Kitap s. ${s}</p>`);
        sonSayfa = s;
      }
    } else if (m[0].startsWith("<Altyazi")) {
      bosalt();
      const ic = mdHtml(m[2].trim()).replace(/^<p>|<\/p>\s*$/g, "");
      hedefHtml().push(`<blockquote class="konu-alinti">${ic}</blockquote>`); // pull quote: not read aloud, it repeats the text
    } else if (m[0].startsWith("<Kutu")) {
      bosalt();
      kutuKapat();
      kutu = { tur: m[3].trim() || "Not", html: [], metin: [] };
    } else {
      bosalt();
      kutuKapat();
    }
  }
  tampon += temiz.slice(son);
  bosalt();
  kutuKapat();
  void baslik;
  void no;
  return { html: html.join("\n"), metin: metin.join("\n"), kavramlar: [...kavramlar.values()] };
}

// ---- Course ----

const SINIR_KONU_SAYISI = 6; // a concept in more topics than this is too generic to link them
const SINIR_BAGLANTI = 8;

export function dersiParcala(
  uniteler: HamUnite[],
  uni: string,
  ders: string,
): { konular: KonuDosyasi[]; indeks: DersIndeksi; cizge: Cizge } {
  const sirali = [...uniteler].sort((a, b) => a.unite - b.unite);
  const gorulen = new Set<string>();
  const taslak: { unite: number; ham: HamKonu; sonuc: ReturnType<typeof konuGovdesi> }[] = [];
  for (const u of sirali) {
    for (const k of u.konular) {
      if (gorulen.has(k.no)) continue; // a repeated number would overwrite the earlier topic's file
      gorulen.add(k.no);
      taslak.push({ unite: u.unite, ham: k, sonuc: konuGovdesi(k.govde, k.baslik, k.no, k.sayfa) });
    }
  }
  const id = (no: string) => `${uni}/${ders}/${no}`;

  // concept -> topic indexes
  const kavramKonu = new Map<string, number[]>();
  taslak.forEach((t, i) => {
    for (const k of t.sonuc.kavramlar) {
      const a = k.toLocaleLowerCase("tr");
      const l = kavramKonu.get(a) ?? [];
      l.push(i);
      kavramKonu.set(a, l);
    }
  });
  const ortak = new Map<string, number>(); // "i|j" -> shared concept count
  for (const liste of kavramKonu.values()) {
    if (liste.length < 2 || liste.length > SINIR_KONU_SAYISI) continue;
    for (let a = 0; a < liste.length; a++)
      for (let b = a + 1; b < liste.length; b++) {
        const anahtar = `${liste[a]}|${liste[b]}`;
        ortak.set(anahtar, (ortak.get(anahtar) ?? 0) + 1);
      }
  }

  const komsu: Map<number, { j: number; n: number }[]> = new Map();
  for (const [anahtar, n] of ortak) {
    const [i, j] = anahtar.split("|").map(Number);
    komsu.set(i, [...(komsu.get(i) ?? []), { j, n }]);
    komsu.set(j, [...(komsu.get(j) ?? []), { j: i, n }]);
  }

  const konular: KonuDosyasi[] = taslak.map((t, i) => {
    const onceki = taslak[i - 1];
    const sonraki = taslak[i + 1];
    const baglar = new Set<string>();
    if (onceki) baglar.add(id(onceki.ham.no));
    if (sonraki) baglar.add(id(sonraki.ham.no));
    const en = (komsu.get(i) ?? []).sort((a, b) => b.n - a.n || a.j - b.j).slice(0, SINIR_BAGLANTI);
    for (const { j } of en) baglar.add(id(taslak[j].ham.no));
    return {
      id: id(t.ham.no),
      no: t.ham.no,
      baslik: t.ham.baslik,
      unite: t.unite,
      sayfa: t.ham.sayfa,
      html: t.sonuc.html,
      metin: t.sonuc.metin,
      kavramlar: t.sonuc.kavramlar,
      baglantilar: [...baglar],
      onceki: onceki ? { no: onceki.ham.no, baslik: onceki.ham.baslik } : null,
      sonraki: sonraki ? { no: sonraki.ham.no, baslik: sonraki.ham.baslik } : null,
    };
  });

  const indeks: DersIndeksi = {
    uniteler: sirali.map((u) => ({
      no: u.unite,
      baslik: u.baslik,
      konular: konular.filter((k) => k.unite === u.unite).map((k) => ({ no: k.no, baslik: k.baslik, sayfa: k.sayfa })),
    })),
  };

  const kenarlar: Cizge["kenarlar"] = [];
  for (let i = 0; i + 1 < konular.length; i++) kenarlar.push({ kaynak: konular[i].id, hedef: konular[i + 1].id, tur: "sira" });
  const kavramKenari = new Set<string>();
  for (const [anahtar] of ortak) {
    const [i, j] = anahtar.split("|").map(Number);
    if (!konular[i].baglantilar.includes(konular[j].id) && !konular[j].baglantilar.includes(konular[i].id)) continue;
    if (kavramKenari.has(anahtar)) continue;
    kavramKenari.add(anahtar);
    kenarlar.push({ kaynak: konular[i].id, hedef: konular[j].id, tur: "kavram" });
  }

  return {
    konular,
    indeks,
    cizge: {
      dugumler: konular.map((k) => ({ id: k.id, no: k.no, baslik: k.baslik, unite: k.unite })),
      kenarlar,
    },
  };
}
