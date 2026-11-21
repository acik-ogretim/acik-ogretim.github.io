// Moves a learner's browser records between devices without a server: everything the site keeps in localStorage
// (solved questions, wrong answers, favorites, settings, chat history) goes into one JSON file; importing it on another
// device merges it into what is already there. API keys and device-only sync state are never exported.
import { VURGU_ONEKI, vurgulariBirlestir } from "./calisma-odasi/vurgu";
import { KALDIGIN_YER_ANAHTARI, cevaplariBirlestir, yerleriBirlestir } from "./calisma-durumu";

export type Yedek = { surum: 1; tarih: string; kayitlar: Record<string, string> };

// Provider keys stay on the device they were typed on; whether Google sync is on and when it last ran
// belong to this device too (google-esitle.ts)
const ANAHTAR_DISI = /-api-key$|^google-esitleme-/;

export function topla(depo: Storage = localStorage): Yedek {
  const kayitlar: Record<string, string> = {};
  for (let i = 0; i < depo.length; i++) {
    const k = depo.key(i);
    if (!k || ANAHTAR_DISI.test(k)) continue;
    const v = depo.getItem(k);
    if (v !== null) kayitlar[k] = v;
  }
  return { surum: 1, tarih: new Date().toISOString(), kayitlar };
}

function json<T>(s: string | null, d: T): T {
  try {
    return s === null ? d : (JSON.parse(s) as T);
  } catch {
    return d;
  }
}

/** Merges one key: progress and favorites are combined, chat lists joined, everything else taken from the file. */
export function birlestir(k: string, yerel: string | null, gelen: string): string {
  if (yerel === null) return gelen;
  if (k.startsWith("quiz-progress-")) {
    const a = json<Record<string, boolean[]>>(yerel, {});
    const b = json<Record<string, boolean[]>>(gelen, {});
    for (const [s, v] of Object.entries(b)) a[s] = [...(a[s] ?? []), ...(Array.isArray(v) ? v : [])].slice(-2);
    return JSON.stringify(a);
  }
  if (k.startsWith("favorite-")) {
    const a = json<unknown[]>(yerel, []);
    const b = json<unknown[]>(gelen, []);
    return JSON.stringify([...new Set([...a, ...b].map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x)));
  }
  if (k === "sohbet-gecmis") {
    const a = json<Record<string, { id: string; guncel: number }[]>>(yerel, {});
    const b = json<Record<string, { id: string; guncel: number }[]>>(gelen, {});
    for (const [ders, liste] of Object.entries(b)) {
      const m = new Map((a[ders] ?? []).map((x) => [x.id, x]));
      for (const x of liste) if (!m.has(x.id) || (m.get(x.id)?.guncel ?? 0) < x.guncel) m.set(x.id, x);
      a[ders] = [...m.values()];
    }
    return JSON.stringify(a);
  }
  if (k.startsWith("tanstack-ai:")) return gelen.length >= yerel.length ? gelen : yerel; // keep the longer conversation
  // Study state (calisma-durumu.ts): the later position per course and the later answer per question win
  if (k === KALDIGIN_YER_ANAHTARI) return yerleriBirlestir(yerel, gelen);
  if (k.startsWith("cevaplar-")) return cevaplariBirlestir(yerel, gelen);
  if (k.startsWith(VURGU_ONEKI)) return vurgulariBirlestir(yerel, gelen); // Çalışma odası vurguları
  if (k === "soru-siralama") return JSON.stringify({ ...json(yerel, {}), ...json(gelen, {}) });
  if (k.startsWith("quiz-ai-explanations-")) return JSON.stringify({ ...json(gelen, {}), ...json(yerel, {}) });
  return gelen;
}

export function yukle(y: Yedek, depo: Storage = localStorage): number {
  if (!y || y.surum !== 1 || typeof y.kayitlar !== "object") throw new Error("Bu dosya bir yedek değil.");
  let n = 0;
  for (const [k, v] of Object.entries(y.kayitlar)) {
    if (ANAHTAR_DISI.test(k) || typeof v !== "string") continue;
    depo.setItem(k, birlestir(k, depo.getItem(k), v));
    n++;
  }
  return n;
}
