// Highlights ("Vurgula"): text-quote anchors stored in localStorage under vurgular-ataturk-aof-<ders>.
// An anchor is the selected text plus a few characters before and after it, so it survives small text changes
// and finds the right occurrence when the same words appear twice.
import { z } from "zod";

export const VurguSemasi = z.object({
  id: z.string().min(1),
  hedef: z.string().min(1), // "s12" = transcript line 12, "k1.3" = topic 1.3 text
  konu: z.string().nullable(),
  exact: z.string().min(1),
  prefix: z.string(),
  suffix: z.string(),
  sn: z.number().nullable(), // video second of the line, for jumping back
  zaman: z.number(),
  not: z.string().max(500).optional(), // "Not ekle" ile yazılan kısa not
});
export type Vurgu = z.infer<typeof VurguSemasi>;

export const VURGU_ONEKI = "vurgular-";
export const vurguAnahtari = (ders: string): string => `${VURGU_ONEKI}ataturk-aof-${ders}`;

const BAGLAM = 24;

export function vurgulariOku(ders: string, depo: Pick<Storage, "getItem"> = localStorage): Vurgu[] {
  try {
    const ham: unknown = JSON.parse(depo.getItem(vurguAnahtari(ders)) ?? "[]");
    if (!Array.isArray(ham)) return [];
    return ham.flatMap((x) => {
      const p = VurguSemasi.safeParse(x);
      return p.success ? [p.data] : [];
    });
  } catch {
    return [];
  }
}

export function vurgulariYaz(ders: string, liste: Vurgu[], depo: Pick<Storage, "setItem"> = localStorage): void {
  try {
    depo.setItem(vurguAnahtari(ders), JSON.stringify(liste));
  } catch {
    /* storage full or blocked: highlights stay in memory for this visit */
  }
}

export function demirle(tam: string, bas: number, son: number): Pick<Vurgu, "exact" | "prefix" | "suffix"> {
  return { exact: tam.slice(bas, son), prefix: tam.slice(Math.max(0, bas - BAGLAM), bas), suffix: tam.slice(son, son + BAGLAM) };
}

/** Finds the anchor in `tam`; returns [start, end) or null. With several occurrences the best context match wins. */
export function demirBul(tam: string, a: Pick<Vurgu, "exact" | "prefix" | "suffix">): [number, number] | null {
  let en: { i: number; puan: number } | null = null;
  let i = tam.indexOf(a.exact);
  while (i !== -1) {
    const once = tam.slice(Math.max(0, i - a.prefix.length), i);
    const sonra = tam.slice(i + a.exact.length, i + a.exact.length + a.suffix.length);
    let puan = 0;
    for (let k = 1; k <= Math.min(once.length, a.prefix.length); k++) if (once[once.length - k] === a.prefix[a.prefix.length - k]) puan++;
    else break;
    for (let k = 0; k < Math.min(sonra.length, a.suffix.length); k++) if (sonra[k] === a.suffix[k]) puan++;
    else break;
    if (!en || puan > en.puan) en = { i, puan };
    i = tam.indexOf(a.exact, i + 1);
  }
  return en ? [en.i, en.i + a.exact.length] : null;
}

/** Backup merge (yedek.ts): union by id, later one wins. */
export function vurgulariBirlestir(yerel: string, gelen: string): string {
  const oku = (s: string): Vurgu[] => {
    try {
      const h: unknown = JSON.parse(s);
      return Array.isArray(h) ? h.flatMap((x) => (VurguSemasi.safeParse(x).success ? [x as Vurgu] : [])) : [];
    } catch {
      return [];
    }
  };
  const m = new Map<string, Vurgu>();
  for (const v of [...oku(yerel), ...oku(gelen)]) if (!m.has(v.id) || (m.get(v.id)?.zaman ?? 0) < v.zaman) m.set(v.id, v);
  return JSON.stringify([...m.values()].sort((a, b) => a.zaman - b.zaman));
}
