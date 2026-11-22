// Moves a learner's browser records between devices without a server: everything the site keeps in localStorage
// (solved questions, wrong answers, favorites, settings, chat history) goes into one JSON file; importing it on another
// device merges it into what is already there. API keys and device-only sync state are never exported.
import { VURGU_ONEKI, vurgulariBirlestir } from "./calisma-odasi/vurgu";
import { YILDIZ_ONEKI, yildizlariBirlestir } from "./calisma-odasi/yildiz";
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
  if (k.startsWith(YILDIZ_ONEKI)) return yildizlariBirlestir(yerel, gelen); // Çalışma odası yıldızlı kavramları
  if (k === "soru-siralama") return JSON.stringify({ ...json(yerel, {}), ...json(gelen, {}) });
  if (k.startsWith("quiz-ai-explanations-")) return JSON.stringify({ ...json(gelen, {}), ...json(yerel, {}) });
  return gelen;
}

/**
 * Three-way merge of one JSON value against the last synced state (`taban`): a side equal to the base did not
 * change, so the other side wins, deletions included. Only when both sides changed does the key's own merge rule
 * (`birlestir`) run, and for plain objects and arrays it runs per entry so an entry removed on one device stays
 * removed. Without this, every sync re-added what another device had deleted (Zeki, 23 Nov 2026).
 */
function ucYollu(k: string, taban: string | null, yerel: string | null, gelen: string | null): string | null {
  if (yerel === gelen) return yerel;
  if (yerel === taban) return gelen; // only the other device changed (or deleted) it
  if (gelen === taban) return yerel; // only this device changed (or deleted) it
  if (yerel === null || gelen === null) return yerel ?? gelen; // edited on one side, deleted on the other: keep the edit
  const [t, a, b] = [json<unknown>(taban, null), json<unknown>(yerel, null), json<unknown>(gelen, null)];
  if (Array.isArray(a) && Array.isArray(b)) {
    const ta = new Set((Array.isArray(t) ? t : []).map((x) => JSON.stringify(x)));
    const [sa, sb] = [new Set(a.map((x) => JSON.stringify(x))), new Set(b.map((x) => JSON.stringify(x)))];
    const silinen = new Set([...ta].filter((x) => !sa.has(x) || !sb.has(x)));
    return JSON.stringify([...new Set([...sa, ...sb])].filter((x) => !silinen.has(x)).map((x) => JSON.parse(x)));
  }
  const nesne = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
  if (nesne(a) && nesne(b)) {
    const tn = nesne(t) ? t : {};
    const sonuc: Record<string, unknown> = {};
    for (const alt of new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(tn)])) {
      const s = (o: Record<string, unknown>) => (alt in o ? JSON.stringify(o[alt]) : null);
      const v = ucYollu(`${k}#alt`, s(tn), s(a), s(b));
      if (v === null) continue;
      // both sides changed this entry: the key's own rule decides on the single-entry objects
      const parca = s(a) !== null && s(b) !== null && s(a) !== s(b) && s(a) !== s(tn) && s(b) !== s(tn)
        ? json<Record<string, unknown>>(birlestir(k, JSON.stringify({ [alt]: a[alt] }), JSON.stringify({ [alt]: b[alt] })), {})[alt]
        : JSON.parse(v);
      if (parca !== undefined) sonuc[alt] = parca;
    }
    return JSON.stringify(sonuc);
  }
  return birlestir(k, yerel, gelen);
}

/**
 * Merges a backup into this device. With `taban` (the state this device last uploaded to the same place), the merge
 * is three-way and deletions survive; without it (a file picked by hand, first sync) records are only added.
 */
export function yukle(y: Yedek, depo: Storage = localStorage, taban?: Yedek | null): number {
  if (!y || y.surum !== 1 || typeof y.kayitlar !== "object") throw new Error("Bu dosya bir yedek değil.");
  let n = 0;
  if (taban?.kayitlar) {
    const anahtarlar = new Set([...Object.keys(y.kayitlar), ...Object.keys(taban.kayitlar), ...Object.keys(topla(depo).kayitlar)]);
    for (const k of anahtarlar) {
      if (ANAHTAR_DISI.test(k)) continue;
      const yerel = depo.getItem(k);
      const gelen = typeof y.kayitlar[k] === "string" ? y.kayitlar[k] : null;
      const v = ucYollu(k, taban.kayitlar[k] ?? null, yerel, gelen);
      if (v === yerel) continue;
      if (v === null) depo.removeItem(k);
      else depo.setItem(k, v);
      n++;
    }
    return n;
  }
  for (const [k, v] of Object.entries(y.kayitlar)) {
    if (ANAHTAR_DISI.test(k) || typeof v !== "string") continue;
    depo.setItem(k, birlestir(k, depo.getItem(k), v));
    n++;
  }
  return n;
}

// ---- Last synced state per destination, kept outside localStorage (it is as large as the records) ----

const TABAN_DB = "acik-ogretim-esitleme";

function tabanDb(): Promise<IDBDatabase> {
  return new Promise((ok, hata) => {
    const r = indexedDB.open(TABAN_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("taban");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => hata(r.error);
  });
}

/** The snapshot last uploaded to `hedef` ("google", "rs", "bulut", "p2p:<eş>"); null when never synced or unavailable. */
export async function tabanOku(hedef: string): Promise<Yedek | null> {
  try {
    const db = await tabanDb();
    return await new Promise((ok) => {
      const r = db.transaction("taban").objectStore("taban").get(hedef);
      r.onsuccess = () => ok((r.result as Yedek | undefined) ?? null);
      r.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}

export async function tabanYaz(hedef: string, y: Yedek): Promise<void> {
  try {
    const db = await tabanDb();
    await new Promise<void>((ok) => {
      const tx = db.transaction("taban", "readwrite");
      tx.objectStore("taban").put(y, hedef);
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
    });
  } catch {
    // no IndexedDB (private mode): syncs stay additive
  }
}
