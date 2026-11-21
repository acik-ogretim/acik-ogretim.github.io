/// <reference lib="webworker" />
// Service worker of the portal. Built by src/integrations/cevrimdisi.ts with esbuild into dist/sw.js; the
// constants below are filled in at build time from the files actually in dist/. Strategy, cache names and the
// update flow are described in docs/cevrimdisi.md.
//
//   navigation      network first with a 3 s wait, then shell, downloaded course, department page, visited page,
//                   then /offline/
//   /_astro/*       cache first (content addressed)
//   /_img/*, /veri  downloaded course, else network, else runtime copy
//   fonts, KaTeX    stale while revalidate
import {
  AG_BEKLEME_MS,
  AG_SON_BEKLEME_MS,
  ESKI_ONBELLEKLER,
  KABUK_ONEKI,
  KOK_SURUM_YOLU,
  META_ONEKI,
  OFFLINE_YOLU,
  ONBELLEK,
  ONEK,
  SAYFA_SINIRI,
  SURUM_BASLIGI,
  dersYolu,
  kabukAdi,
  yolNormalle,
} from "../lib/cevrimdisi/anahtar";
import { dersIndir, metaOku, metalariListele, metaYaz } from "../lib/cevrimdisi/paket";
import type { DersHedefi } from "../lib/cevrimdisi/sema";

type KabukGirdisi = { u: string; r: string };
type IsinmaGirdisi = { u: string; r: string; uni: string };

declare const __AO_SURUM__: string;
declare const __AO_KABUK__: KabukGirdisi[];
declare const __AO_ISINMA__: IsinmaGirdisi[];
declare const __AO_UNILER__: string[];

declare const self: ServiceWorkerGlobalScope;

// Each build constant is read once: esbuild inlines a define at every use.
const SURUM = __AO_SURUM__;
const KABUK_LISTE: KabukGirdisi[] = __AO_KABUK__;
const ISINMA_LISTE: IsinmaGirdisi[] = __AO_ISINMA__;
const KABUK = kabukAdi(SURUM);
const UNILER = new Set(__AO_UNILER__);
const KABUK_HARITA = new Map(KABUK_LISTE.map((g) => [g.u, g.r]));
const ISINMA_HARITA = new Map(ISINMA_LISTE.map((g) => [g.u, g]));
const DIS_KAYNAK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

const sureliBekle = (ms: number) => new Promise<"sure">((coz) => setTimeout(() => coz("sure"), ms));

/** Cached copy with the redirect flag cleared: a navigation served with a redirected response fails in Chrome. */
async function temizKopya(r: Response, surum?: string): Promise<Response> {
  const basliklar = new Headers(r.headers);
  if (surum !== undefined) basliklar.set(SURUM_BASLIGI, surum);
  return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: basliklar });
}

async function sinirliKoy(ad: string, anahtar: string, r: Response, sinir: number, sec?: (yol: string) => boolean) {
  const c = await caches.open(ad);
  await c.delete(anahtar);
  await c.put(anahtar, await temizKopya(r));
  const anahtarlar = (await c.keys()).filter((k) => !sec || sec(new URL(k.url).pathname));
  // keys() keeps insertion order: the oldest entries go first.
  for (const k of anahtarlar.slice(0, Math.max(0, anahtarlar.length - sinir))) await c.delete(k);
}

// ---------------------------------------------------------------------------------------------- install

async function kabukKur(): Promise<void> {
  const yeni = await caches.open(KABUK);
  const varlik = await caches.open(ONBELLEK.varlik);
  const eskiler = (await caches.keys()).filter((a) => a.startsWith(KABUK_ONEKI) && a !== KABUK);
  const sira = [...KABUK_LISTE];
  const isci = async () => {
    for (let g = sira.shift(); g; g = sira.shift()) {
      if (!g.r) {
        // Hashed asset: the name is the content.
        if (await varlik.match(g.u)) continue;
        const r = await fetch(g.u, { cache: "no-cache" });
        if (!r.ok) throw new Error(`${g.u}: ${r.status}`);
        await varlik.put(g.u, r);
        continue;
      }
      // Page or file with a revision: reuse an older shell's copy when the revision matches.
      let kopya: Response | undefined;
      for (const ad of eskiler) {
        const eski = await (await caches.open(ad)).match(g.u);
        if (eski && eski.headers.get(SURUM_BASLIGI) === g.r) {
          kopya = eski;
          break;
        }
      }
      if (!kopya) {
        const r = await fetch(g.u, { cache: "no-cache" });
        if (!r.ok) throw new Error(`${g.u}: ${r.status}`);
        kopya = await temizKopya(r, g.r);
      }
      await yeni.put(g.u, kopya);
    }
  };
  // A failed file fails the install: the previous worker keeps serving and the browser retries later.
  await Promise.all(Array.from({ length: 6 }, isci));
}

self.addEventListener("install", (e) => {
  e.waitUntil(kabukKur());
  // No skipWaiting here: an update waits until the learner taps "Yenile" (message "atla").
});

// --------------------------------------------------------------------------------------------- activate

/** Drops hashed assets no shell entry and no downloaded course needs any more. */
async function varliklariBuda(): Promise<void> {
  const gerekli = new Set<string>();
  for (const [u, r] of KABUK_HARITA) if (!r) gerekli.add(u);
  for (const m of await metalariListele()) for (const v of m.varliklar) gerekli.add(v);
  const c = await caches.open(ONBELLEK.varlik);
  for (const k of await c.keys()) if (!gerekli.has(new URL(k.url).pathname)) await c.delete(k);
}

/** Department pages that were removed from the site or rebuilt since they were stored. */
async function bolumleriBuda(): Promise<void> {
  const c = await caches.open(ONBELLEK.bolum);
  for (const k of await c.keys()) {
    const g = ISINMA_HARITA.get(new URL(k.url).pathname);
    if (!g) {
      await c.delete(k);
      continue;
    }
    const r = await c.match(k);
    if (r?.headers.get(SURUM_BASLIGI) !== g.r) await c.delete(k);
  }
}

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const ad of await caches.keys()) {
        const eskiKabuk = ad.startsWith(KABUK_ONEKI) && ad !== KABUK;
        if (eskiKabuk || (ESKI_ONBELLEKLER as readonly string[]).includes(ad)) await caches.delete(ad);
        // Unknown caches of ours (renamed in a later version) go too; learner records live in localStorage, never here.
        else if (ad.startsWith(ONEK) && !ad.startsWith(KABUK_ONEKI) && !Object.values(ONBELLEK).includes(ad as never)) await caches.delete(ad);
      }
      await bolumleriBuda();
      await varliklariBuda();
      await self.clients.claim();
      for (const istemci of await self.clients.matchAll({ type: "window" })) istemci.postMessage({ tur: "etkin", surum: SURUM });
    })(),
  );
});

// ------------------------------------------------------------------------------------------------ fetch

async function kabuktan(yol: string): Promise<Response | undefined> {
  return (await caches.open(KABUK)).match(yol);
}

/** A downloaded course for /uni/<any department>/ders/: shared courses live under one canonical department. */
async function indirilmisDers(yol: string): Promise<Response | undefined> {
  const d = dersYolu(yol, UNILER);
  if (!d) return undefined;
  const meta = await metaOku(d.uni, d.ders);
  if (!meta) return undefined;
  return (await caches.open(ONBELLEK.ders)).match(meta.yol);
}

async function saklananSayfa(yol: string): Promise<Response | undefined> {
  return (
    (await kabuktan(yol)) ??
    (await indirilmisDers(yol)) ??
    (await (await caches.open(ONBELLEK.ders)).match(yol)) ??
    (await (await caches.open(ONBELLEK.bolum)).match(yol)) ??
    (await (await caches.open(ONBELLEK.sayfa)).match(yol))
  );
}

async function gezinme(e: FetchEvent): Promise<Response> {
  const url = new URL(e.request.url);
  const yol = yolNormalle(decodeURIComponent(url.pathname));
  const ag = fetch(e.request).then(
    (r) => r,
    () => null,
  );
  // Store what came from the network for later visits (not the shell: that is versioned).
  e.waitUntil(
    ag.then(async (r) => {
      if (!r || !r.ok || !(r.headers.get("content-type") ?? "").includes("text/html")) return;
      if (KABUK_HARITA.has(yol) || ISINMA_HARITA.has(yol)) return;
      const ders = dersYolu(yol, UNILER);
      if (ders && (await metaOku(ders.uni, ders.ders))) return; // a download changes only through "Güncelle"
      await sinirliKoy(ONBELLEK.sayfa, yol, r.clone(), ders ? SAYFA_SINIRI.ders : SAYFA_SINIRI.diger, (p) => !!dersYolu(p, UNILER) === !!ders);
    }),
  );
  const ilk = await Promise.race([ag, sureliBekle(AG_BEKLEME_MS)]);
  if (ilk && ilk !== "sure") return ilk;
  const saklanan = await saklananSayfa(yol);
  if (saklanan) return saklanan;
  // Nothing stored: a slow network still gets its chance before the offline page.
  if (ilk === "sure") {
    const son = await Promise.race([ag, sureliBekle(AG_SON_BEKLEME_MS - AG_BEKLEME_MS)]);
    if (son && son !== "sure") return son;
  }
  const yedek = await kabuktan(OFFLINE_YOLU);
  return yedek ?? new Response("Bağlantı yok", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function varlikIstegi(istek: Request, yol: string): Promise<Response> {
  const c = await caches.open(ONBELLEK.varlik);
  const saklanan = await c.match(yol);
  if (saklanan) return saklanan;
  const r = await fetch(istek);
  if (r.ok) await c.put(yol, r.clone());
  return r;
}

async function digerIstek(e: FetchEvent, yol: string): Promise<Response> {
  const saklanan = (await kabuktan(yol)) ?? (await (await caches.open(ONBELLEK.ders)).match(yol));
  if (saklanan) return saklanan;
  try {
    const r = await fetch(e.request);
    if (r.ok && (yol.startsWith("/_img/") || /\.(png|svg|webp|jpe?g|gif|ico|woff2?)$/i.test(yol))) e.waitUntil(sinirliKoy(ONBELLEK.dis, yol, r.clone(), 300));
    return r;
  } catch (hata) {
    const dis = await (await caches.open(ONBELLEK.dis)).match(yol);
    if (dis) return dis;
    throw hata;
  }
}

async function disKaynak(e: FetchEvent): Promise<Response> {
  const c = await caches.open(ONBELLEK.dis);
  const saklanan = await c.match(e.request);
  const ag = fetch(e.request).then(
    async (r) => {
      if (r.ok || r.type === "opaque") await c.put(e.request, r.clone());
      return r;
    },
    () => null,
  );
  if (saklanan) {
    e.waitUntil(ag);
    return saklanan;
  }
  return (await ag) ?? Response.error();
}

self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) {
    if (DIS_KAYNAK.test(istek.url)) e.respondWith(disKaynak(e));
    return;
  }
  const yol = yolNormalle(decodeURIComponent(url.pathname));
  // Version manifests and the worker itself always come from the network.
  if (yol === "/sw.js" || yol === KOK_SURUM_YOLU || yol.startsWith("/cevrimdisi-surum/")) return;
  if (yol.startsWith(META_ONEKI)) return;
  if (istek.mode === "navigate") {
    e.respondWith(gezinme(e));
    return;
  }
  if (yol.startsWith("/_astro/")) {
    e.respondWith(varlikIstegi(istek, yol));
    return;
  }
  e.respondWith(digerIstek(e, yol));
});

// -------------------------------------------------------------------------------- background warming

/** Fetches up to `adet` missing department pages, the learner's own university first. */
async function bolumleriIsit(oncelik: string | undefined, adet: number): Promise<{ kalan: number; toplam: number }> {
  const c = await caches.open(ONBELLEK.bolum);
  const var_ = new Set((await c.keys()).map((k) => new URL(k.url).pathname));
  const eksik = ISINMA_LISTE.filter((g) => !var_.has(g.u)).sort((a, b) => Number(b.uni === oncelik) - Number(a.uni === oncelik));
  for (const g of eksik.slice(0, adet)) {
    try {
      const r = await fetch(g.u, { cache: "no-cache", priority: "low" } as RequestInit);
      if (r.ok) await c.put(g.u, await temizKopya(r, g.r));
      else break;
    } catch {
      break; // offline again: the page asks later
    }
  }
  const kalan = ISINMA_LISTE.length - (await c.keys()).length;
  return { kalan: Math.max(0, kalan), toplam: ISINMA_LISTE.length };
}

type Mesaj =
  | { tur: "atla" }
  | { tur: "surum" }
  | { tur: "isit"; oncelik?: string; adet?: number }
  | { tur: "buda" };

self.addEventListener("message", (e) => {
  const m = e.data as Mesaj | null;
  const cevap = (veri: unknown) => (e.source as Client | null)?.postMessage(veri);
  if (!m || typeof m !== "object") return;
  if (m.tur === "atla") void self.skipWaiting();
  else if (m.tur === "surum") cevap({ tur: "surum", surum: SURUM, bolum: ISINMA_LISTE.length });
  else if (m.tur === "isit") e.waitUntil(bolumleriIsit(m.oncelik, Math.min(60, m.adet ?? 25)).then((d) => cevap({ tur: "isinma", ...d })));
  else if (m.tur === "buda") e.waitUntil(varliklariBuda());
});

// ---------------------------------------------------------------------------- Background Fetch (Chromium)

interface BgKayit {
  request: Request;
  responseReady: Promise<Response>;
}
interface BgKayitDizisi {
  id: string;
  matchAll(): Promise<BgKayit[]>;
}
interface BgOlay extends ExtendableEvent {
  registration: BgKayitDizisi;
  updateUI?(o: { title?: string }): Promise<void>;
}

const BG_ONEKI = "ders:";

self.addEventListener("backgroundfetchsuccess" as never, (olay: Event) => {
  const e = olay as BgOlay;
  e.waitUntil(
    (async () => {
      const [uni, ders] = e.registration.id.slice(BG_ONEKI.length).split("/") as [string, string];
      const onceki = await metaOku(uni, ders);
      if (!onceki) return; // deleted while it was downloading
      const hazir = new Map<string, Response>();
      for (const k of await e.registration.matchAll()) hazir.set(yolNormalle(new URL(k.request.url).pathname), await k.responseReady);
      const hedef: DersHedefi = { uni, ders, yol: onceki.yol, hash: onceki.hash, boyut: onceki.boyut, kabuk: onceki.kabuk, ad: onceki.ad, uniAd: onceki.uniAd };
      try {
        await dersIndir(hedef, { hazir });
        await e.updateUI?.({ title: `${onceki.ad} çevrimdışı hazır` });
      } catch {
        await metaYaz({ ...onceki, durum: "yarim" });
      }
      for (const istemci of await self.clients.matchAll({ type: "window" })) istemci.postMessage({ tur: "indirme-bitti", uni, ders });
    })(),
  );
});

for (const ad of ["backgroundfetchfail", "backgroundfetchabort"]) {
  self.addEventListener(ad as never, (olay: Event) => {
    const e = olay as BgOlay;
    e.waitUntil(
      (async () => {
        const [uni, ders] = e.registration.id.slice(BG_ONEKI.length).split("/") as [string, string];
        for (const istemci of await self.clients.matchAll({ type: "window" })) istemci.postMessage({ tur: "indirme-kesildi", uni, ders });
      })(),
    );
  });
}
