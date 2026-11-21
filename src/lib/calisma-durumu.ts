// Study state kept per course in localStorage: where the learner left off ("kaldığın yer") and the answers
// given in solving mode. Both are keyed by a persistent question key (the question's data id), never by
// the card's DOM id, so a new order (Sırala), a filter or a data update cannot point them at another
// question. Everything here is validated with Zod on read; a broken record is dropped, never thrown.
// /yedek and the sync options carry these keys (see birlestir in yedek.ts).
import { z } from "zod";

// ---- Keys ----

/** "uni/ders" from a course path /uni/bolum/ders (the department is left out: shared courses have one page). */
export function dersAnahtari(yol: string): string | null {
  const m = /^\/([\w-]+)\/[\w-]+\/([\w-]+)\/?$/.exec(yol);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** "uni-ders": the suffix quiz-progress-<...> already uses. */
export const dersEki = (ders: string): string => ders.replace("/", "-");

/**
 * Persistent keys for the cards in page order: the data id, or "id#2", "id#3" for later cards that
 * share an id (one data file has duplicates).
 */
export function kaliciAnahtarlar(idler: readonly string[]): string[] {
  const sayac = new Map<string, number>();
  return idler.map((id) => {
    const n = (sayac.get(id) ?? 0) + 1;
    sayac.set(id, n);
    return n === 1 ? id : `${id}#${n}`;
  });
}

/** The DOM id format older records used ("question-<unit>-<index>"). */
export const ESKI_HEDEF = /^question-\d+-\d+$/;

// ---- Storage that never throws (full, blocked or private mode) ----

export function depoOku(anahtar: string): string | null {
  try {
    return localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

export function depoYaz(anahtar: string, deger: string | null): boolean {
  try {
    if (deger === null) localStorage.removeItem(anahtar);
    else localStorage.setItem(anahtar, deger);
    return true;
  } catch {
    return false;
  }
}

function json(ham: string | null): unknown {
  if (!ham) return null;
  try {
    return JSON.parse(ham);
  } catch {
    return null;
  }
}

// ---- Kaldığın yer ----

export const KALDIGIN_YER_ANAHTARI = "kaldigin-yer";
/** Version 1 was the single-course "son-calisma" record. */
export const KALDIGIN_YER_SURUM = 2;
export const ESKI_SON_CALISMA_ANAHTARI = "son-calisma";
/** Links that should resume land with this hash; the course page reads the record itself. */
export const DEVAM_HASH = "#kaldigin-yer";

const parca = /^[\w-]+$/;

export const YerSema = z
  .object({
    /** Course page path without query, e.g. /auzef/cocuk-gelisimi/anatomi. */
    yol: z.string().regex(/^\/[\w-]+\/[\w-]+\/[\w-]+$/),
    /** Department of a shared course (?bolum=), so the back link keeps working. */
    bolum: z.string().regex(parca).optional(),
    ad: z.string().min(1).max(300),
    /** Persistent question key; empty only for a migrated version 1 record (eskiHedef is set then). */
    soru: z.string().max(300),
    eskiHedef: z.string().regex(ESKI_HEDEF).optional(),
    unite: z.number().int().min(0),
    sira: z.number().int().min(0),
    uniteToplam: z.number().int().min(0),
    kip: z.enum(["okuma", "cozme"]).default("okuma"),
    zaman: z.number().finite(),
  })
  .refine((y) => y.soru.length > 0 || !!y.eskiHedef, { message: "soru gerekli" });

export type Yer = z.infer<typeof YerSema>;
export type KaldiginYer = { surum: typeof KALDIGIN_YER_SURUM; dersler: Record<string, Yer> };

/** Keeps every valid course entry; a broken entry is dropped on its own. */
function yerleriAyikla(v: unknown): Record<string, Yer> {
  const dersler: Record<string, Yer> = {};
  if (!v || typeof v !== "object") return dersler;
  for (const [ders, ham] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[\w-]+\/[\w-]+$/.test(ders)) continue;
    const r = YerSema.safeParse(ham);
    if (r.success) dersler[ders] = r.data;
  }
  return dersler;
}

/** Version 1 "son-calisma" -> one course entry of version 2. */
export function eskiKaydiTasi(ham: string | null): { ders: string; yer: Yer } | null {
  const v = json(ham) as Record<string, unknown> | null;
  if (!v || typeof v.yol !== "string") return null;
  const ders = dersAnahtari(v.yol);
  if (!ders) return null;
  const r = YerSema.safeParse({ ...v, soru: "", eskiHedef: v.hedef, kip: "okuma" });
  return r.success ? { ders, yer: r.data } : null;
}

/** Parses kaldigin-yer; with no such record, the old son-calisma is read instead. */
export function kaldiginYerAyristir(ham: string | null, eskiHam: string | null = null): KaldiginYer {
  const v = json(ham) as { surum?: unknown; dersler?: unknown } | null;
  if (v && v.surum === KALDIGIN_YER_SURUM) return { surum: KALDIGIN_YER_SURUM, dersler: yerleriAyikla(v.dersler) };
  const eski = eskiKaydiTasi(eskiHam);
  return { surum: KALDIGIN_YER_SURUM, dersler: eski ? { [eski.ders]: eski.yer } : {} };
}

/** Reads the record, moving an old son-calisma into the new key once. */
export function kaldiginYerOku(): KaldiginYer {
  const ham = depoOku(KALDIGIN_YER_ANAHTARI);
  const eskiHam = ham ? null : depoOku(ESKI_SON_CALISMA_ANAHTARI);
  const kayit = kaldiginYerAyristir(ham, eskiHam);
  if (!ham && eskiHam && Object.keys(kayit.dersler).length > 0) {
    if (depoYaz(KALDIGIN_YER_ANAHTARI, JSON.stringify(kayit))) depoYaz(ESKI_SON_CALISMA_ANAHTARI, null);
  }
  return kayit;
}

export function kaldiginYerYaz(ders: string, yer: Yer | null): boolean {
  const kayit = kaldiginYerOku();
  if (yer) kayit.dersler[ders] = yer;
  else delete kayit.dersler[ders];
  return depoYaz(KALDIGIN_YER_ANAHTARI, JSON.stringify(kayit));
}

/** Most recent course first. */
export const sonCalisilanlar = (k: KaldiginYer): [string, Yer][] =>
  Object.entries(k.dersler).sort((a, b) => b[1].zaman - a[1].zaman);

/** Link that opens the course and lands on the question. */
export const devamBaglantisi = (y: Yer): string =>
  `${y.yol}${y.bolum ? `?bolum=${encodeURIComponent(y.bolum)}` : ""}${DEVAM_HASH}`;

/** "Ünite 4 · Soru 12 / 40" ("Diğer sorular" for unit 0). */
export const yerMetni = (y: Pick<Yer, "unite" | "sira" | "uniteToplam">): string =>
  `${y.unite === 0 ? "Diğer sorular" : `Ünite ${y.unite}`} · Soru ${y.sira} / ${y.uniteToplam}`;

/** Merges two kaldigin-yer records (backup import): per course, the later position wins. */
export function yerleriBirlestir(yerelHam: string | null, gelenHam: string): string {
  const a = kaldiginYerAyristir(yerelHam);
  const b = kaldiginYerAyristir(gelenHam);
  for (const [ders, yer] of Object.entries(b.dersler)) {
    if (!a.dersler[ders] || a.dersler[ders].zaman < yer.zaman) a.dersler[ders] = yer;
  }
  return JSON.stringify(a);
}

// ---- Answers ----

export const CEVAPLAR_SURUM = 1;
export const cevaplarAnahtari = (ders: string): string => `cevaplar-${dersEki(ders)}`;

export const CevapSema = z.object({
  /** The option the learner chose; null when the answer was only revealed ("Cevabı göster"). */
  secim: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  dogru: z.boolean(),
  zaman: z.number().finite(),
});
export type Cevap = z.infer<typeof CevapSema>;
export type Cevaplar = Record<string, Cevap>;

export function cevaplarAyristir(ham: string | null): Cevaplar {
  const v = json(ham) as { surum?: unknown; cevaplar?: unknown } | null;
  const sonuc: Cevaplar = {};
  if (!v || v.surum !== CEVAPLAR_SURUM || !v.cevaplar || typeof v.cevaplar !== "object") return sonuc;
  for (const [k, c] of Object.entries(v.cevaplar as Record<string, unknown>)) {
    const r = CevapSema.safeParse(c);
    if (r.success) sonuc[k] = r.data;
  }
  return sonuc;
}

export const cevaplarMetni = (c: Cevaplar): string => JSON.stringify({ surum: CEVAPLAR_SURUM, cevaplar: c });

export const cevaplarOku = (ders: string): Cevaplar => cevaplarAyristir(depoOku(cevaplarAnahtari(ders)));
export const cevaplarYaz = (ders: string, c: Cevaplar): boolean =>
  depoYaz(cevaplarAnahtari(ders), Object.keys(c).length ? cevaplarMetni(c) : null);

export type Sayac = { dogru: number; yanlis: number; gosterilen: number; oran: number };

/** Counter of the solving bar: right, wrong, revealed and the share of right answers among the chosen ones. */
export function say(c: Cevaplar): Sayac {
  let dogru = 0;
  let yanlis = 0;
  let gosterilen = 0;
  for (const x of Object.values(c)) {
    if (x.secim === null) gosterilen++;
    else if (x.dogru) dogru++;
    else yanlis++;
  }
  const n = dogru + yanlis;
  return { dogru, yanlis, gosterilen, oran: n ? Math.round((dogru / n) * 100) : 0 };
}

/** Removes the answers of the given questions (all when null). Returns what stays and what was taken out (for undo). */
export function cevaplariAyir(c: Cevaplar, anahtarlar: ReadonlySet<string> | null): { kalan: Cevaplar; silinen: Cevaplar } {
  const kalan: Cevaplar = {};
  const silinen: Cevaplar = {};
  for (const [k, v] of Object.entries(c)) (anahtarlar === null || anahtarlar.has(k) ? silinen : kalan)[k] = v;
  return { kalan, silinen };
}

/** Merges answers from a backup: per question, the later answer wins. */
export function cevaplariBirlestir(yerelHam: string | null, gelenHam: string): string {
  const a = cevaplarAyristir(yerelHam);
  for (const [k, v] of Object.entries(cevaplarAyristir(gelenHam))) if (!a[k] || a[k].zaman < v.zaman) a[k] = v;
  return cevaplarMetni(a);
}

// ---- Old records written with DOM ids ----

/**
 * quiz-progress-<ders> used to be keyed by the card's DOM id ("question-4-11"). Moves those entries to
 * the persistent key. `eslesme` maps the old DOM id to the persistent key; unknown old ids stay as they are.
 */
export function ilerlemeyiTasi(
  ilerleme: Record<string, unknown>,
  eslesme: ReadonlyMap<string, string>,
): { veri: Record<string, boolean[]>; degisti: boolean } {
  const sonuclar = (x: unknown) => (Array.isArray(x) ? x.filter((b): b is boolean => typeof b === "boolean") : []);
  // Results under the old id are older than any under the new key: old ones first, then the newer ones
  const eski: Record<string, boolean[]> = {};
  const yeni: Record<string, boolean[]> = {};
  let degisti = false;
  for (const [k, v] of Object.entries(ilerleme)) {
    const hedef = ESKI_HEDEF.test(k) ? eslesme.get(k) : undefined;
    if (hedef) {
      degisti = true;
      eski[hedef] = [...(eski[hedef] ?? []), ...sonuclar(v)];
    } else yeni[k] = sonuclar(v);
  }
  const veri: Record<string, boolean[]> = {};
  for (const k of new Set([...Object.keys(yeni), ...Object.keys(eski)])) veri[k] = [...(eski[k] ?? []), ...(yeni[k] ?? [])].slice(-2);
  return { veri, degisti };
}
