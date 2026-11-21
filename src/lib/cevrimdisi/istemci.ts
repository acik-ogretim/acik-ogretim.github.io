// Page side of course downloads: reads the version manifests, starts, resumes, updates and deletes downloads,
// and reports storage use. Every change fires CEVRIMDISI_OLAYI on window so lists and buttons redraw.
import { KOK_SURUM_YOLU, dersDosyalari, dersKimligi, uniSurumYolu } from "./anahtar";
import { dersIndir, dersSil, metaOku, metalariListele, metaYaz, type Ilerleme } from "./paket";
import { kokSurumSemasi, uniSurumSemasi, type DersHedefi, type DersMeta, type KokSurum, type UniSurum } from "./sema";

export const CEVRIMDISI_OLAYI = "cevrimdisi:degisti";
export const ILERLEME_OLAYI = "cevrimdisi:ilerleme";
/** "1" forces downloads to run in the page even where Background Fetch exists (tests, and after a failed one). */
export const ON_PLAN_ANAHTARI = "cevrimdisi-on-plan";
export const YILDIZLI_ANAHTARI = "cevrimdisi-yildizli";

export type IlerlemeOlayi = Ilerleme & { kimlik: string; arkaPlan: boolean };
export type DersDurumu = "yok" | "iniyor" | "yarim" | "hazir" | "guncelleme";

export const destekVar = (): boolean => typeof caches !== "undefined" && "serviceWorker" in navigator;

const yay = () => window.dispatchEvent(new CustomEvent(CEVRIMDISI_OLAYI));
const ilerlemeYay = (d: IlerlemeOlayi) => window.dispatchEvent(new CustomEvent<IlerlemeOlayi>(ILERLEME_OLAYI, { detail: d }));

function depoOku(anahtar: string): string | null {
  try {
    return localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

// ---- Version manifests (always from the network; the worker never stores them) ----

let kokSozu: Promise<KokSurum | null> | null = null;
const uniSozleri = new Map<string, Promise<UniSurum | null>>();

async function jsonGetir<T>(yol: string, coz: (v: unknown) => T | null): Promise<T | null> {
  if (!navigator.onLine) return null;
  try {
    const r = await fetch(yol, { cache: "no-cache" });
    return r.ok ? coz(await r.json()) : null;
  } catch {
    return null;
  }
}

export function kokSurum(): Promise<KokSurum | null> {
  kokSozu ??= jsonGetir(KOK_SURUM_YOLU, (v) => {
    const s = kokSurumSemasi.safeParse(v);
    return s.success ? s.data : null;
  });
  return kokSozu;
}

export function uniSurum(uni: string): Promise<UniSurum | null> {
  let s = uniSozleri.get(uni);
  if (!s) {
    s = jsonGetir(uniSurumYolu(uni), (v) => {
      const p = uniSurumSemasi.safeParse(v);
      return p.success ? p.data : null;
    });
    uniSozleri.set(uni, s);
  }
  return s;
}

/** Forgets the fetched manifests (tests and the "Güncellemeleri denetle" button). */
export function surumleriUnut(): void {
  kokSozu = null;
  uniSozleri.clear();
}

export async function hedefBul(uni: string, ders: string, ad?: string): Promise<DersHedefi | null> {
  const [kok, u] = await Promise.all([kokSurum(), uniSurum(uni)]);
  const satir = u?.dersler[ders];
  if (!kok || !satir) return null;
  return { uni, ders, yol: satir[0], hash: satir[1], boyut: satir[2], kabuk: kok.kabuk, ad, uniAd: kok.uniler[uni]?.ad };
}

// ---- Downloads ----

const suren = new Map<string, Promise<DersMeta | null>>();

export const indiriliyorMu = (uni: string, ders: string): boolean => suren.has(dersKimligi(uni, ders));

type BgKayit = EventTarget & { id: string; downloaded: number; abort(): Promise<boolean> };
type BgYonetici = {
  fetch(id: string, istekler: string[], s: { title: string; icons?: { src: string; sizes: string; type: string }[] }): Promise<BgKayit>;
  get(id: string): Promise<BgKayit | undefined>;
};

async function arkaPlanYoneticisi(): Promise<BgYonetici | null> {
  if (depoOku(ON_PLAN_ANAHTARI) === "1" || !("serviceWorker" in navigator)) return null;
  const kayit = (await navigator.serviceWorker.getRegistration()) as (ServiceWorkerRegistration & { backgroundFetch?: BgYonetici }) | undefined;
  return kayit?.active && kayit.backgroundFetch ? kayit.backgroundFetch : null;
}

/** Waits for the worker to report the end of a Background Fetch. */
function arkaPlanBekle(uni: string, ders: string): Promise<boolean> {
  return new Promise((coz) => {
    const dinle = (e: MessageEvent) => {
      const m = e.data as { tur?: string; uni?: string; ders?: string } | null;
      if (m?.uni !== uni || m.ders !== ders) return;
      if (m.tur === "indirme-bitti" || m.tur === "indirme-kesildi") {
        navigator.serviceWorker.removeEventListener("message", dinle);
        coz(m.tur === "indirme-bitti");
      }
    };
    navigator.serviceWorker.addEventListener("message", dinle);
  });
}

async function arkaPlandaIndir(h: DersHedefi, bg: BgYonetici): Promise<DersMeta | null> {
  const kimlik = dersKimligi(h.uni, h.ders);
  const onceki = await metaOku(h.uni, h.ders);
  // The worker reads the target from this record when the files arrive.
  await metaYaz({
    v: 1,
    uni: h.uni,
    ders: h.ders,
    ad: h.ad ?? onceki?.ad ?? h.ders,
    uniAd: h.uniAd ?? onceki?.uniAd,
    yol: h.yol,
    hash: h.hash,
    kabuk: h.kabuk,
    boyut: h.boyut,
    tarih: new Date().toISOString(),
    durum: "yarim",
    dosyalar: onceki?.dosyalar ?? [],
    varliklar: onceki?.varliklar ?? [],
  });
  const d = dersDosyalari(h.yol, h.uni, h.ders);
  const id = `ders:${kimlik}`;
  const bitis = arkaPlanBekle(h.uni, h.ders);
  const kayit =
    (await bg.get(id)) ??
    (await bg.fetch(id, [d.sayfa, d.veri, d.materyal, d.paket], {
      title: `${h.ad ?? h.ders} indiriliyor`,
      icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
    }));
  kayit.addEventListener("progress", () => ilerlemeYay({ kimlik, alinan: Math.min(kayit.downloaded, h.boyut), toplam: h.boyut, arkaPlan: true }));
  // Some browsers accept a Background Fetch but never start it (no permission, no download UI).
  // If nothing arrives within the grace period, cancel it so the caller downloads in the page instead.
  const takildi = new Promise<never>((_, reddet) => {
    const t = setTimeout(() => {
      if (kayit.downloaded > 0) return;
      void kayit.abort?.();
      reddet(new Error("arka-plan-baslamadi"));
    }, ARKA_PLAN_BEKLEME_MS);
    void bitis.finally(() => clearTimeout(t));
  });
  return (await Promise.race([bitis, takildi])) ? metaOku(h.uni, h.ders) : null;
}

/** Background Fetch only pays off for big packages; small ones finish faster in the page. */
const ARKA_PLAN_ESIGI = 20 * 1024 * 1024;
const ARKA_PLAN_BEKLEME_MS = 10_000;

/**
 * Downloads a course (or resumes / updates it). Uses Background Fetch where the browser has it, so the
 * download survives closing the page; otherwise downloads in the page and resumes on the next call.
 */
export function indir(uni: string, ders: string, ad?: string): Promise<DersMeta | null> {
  const kimlik = dersKimligi(uni, ders);
  const var_ = suren.get(kimlik);
  if (var_) return var_;
  const is = (async () => {
    const h = await hedefBul(uni, ders, ad);
    if (!h) throw new Error("Bu ders şu an indirilemiyor. Bağlantını denetleyip yeniden dene.");
    ilerlemeYay({ kimlik, alinan: 0, toplam: h.boyut, arkaPlan: false });
    const bg = h.boyut >= ARKA_PLAN_ESIGI ? await arkaPlanYoneticisi().catch(() => null) : null;
    if (bg) {
      try {
        const m = await arkaPlandaIndir(h, bg);
        if (m?.durum === "tamam") return m;
      } catch {
        // Background Fetch refused (quota, permission): continue in the page below
      }
    }
    return dersIndir(h, { ilerleme: (i) => ilerlemeYay({ kimlik, ...i, arkaPlan: false }) });
  })();
  const izle = is.finally(() => {
    suren.delete(kimlik);
    yay();
    // Assets of older builds that no download needs any more can go now.
    navigator.serviceWorker?.controller?.postMessage({ tur: "buda" });
  });
  suren.set(kimlik, izle);
  yay();
  return izle;
}

export async function sil(uni: string, ders: string): Promise<void> {
  await dersSil(uni, ders);
  navigator.serviceWorker?.controller?.postMessage({ tur: "buda" });
  yay();
}

export async function hepsiniSil(): Promise<void> {
  for (const m of await metalariListele()) await dersSil(m.uni, m.ders);
  navigator.serviceWorker?.controller?.postMessage({ tur: "buda" });
  yay();
}

export const listele = async (): Promise<DersMeta[]> =>
  destekVar() ? (await metalariListele()).sort((a, b) => a.ad.localeCompare(b.ad, "tr")) : [];

/** State of one stored course against the current manifest ("guncelleme" needs the network). */
export async function durum(m: DersMeta | null, uni: string, ders: string): Promise<DersDurumu> {
  if (indiriliyorMu(uni, ders)) return "iniyor";
  if (!m) return "yok";
  if (m.durum === "yarim") return "yarim";
  const u = await uniSurum(uni);
  const satir = u?.dersler[ders];
  return satir && satir[1] !== m.hash ? "guncelleme" : "hazir";
}

/** Stored courses whose content changed on the site. */
export async function guncellemeler(): Promise<Set<string>> {
  const sonuc = new Set<string>();
  for (const m of await listele()) if ((await durum(m, m.uni, m.ders)) === "guncelleme") sonuc.add(dersKimligi(m.uni, m.ders));
  return sonuc;
}

/**
 * Housekeeping while online: resumes unfinished downloads, quietly refreshes courses whose content is the
 * same but whose scripts belong to an older build, and keeps starred courses stored when the learner asked for it.
 */
export async function bakim(): Promise<void> {
  if (!destekVar() || !navigator.onLine) return;
  const kok = await kokSurum();
  if (!kok) return;
  for (const m of await listele()) {
    const satir = (await uniSurum(m.uni))?.dersler[m.ders];
    if (!satir) continue;
    const ayni = satir[1] === m.hash;
    if (m.durum === "yarim" || (ayni && m.kabuk !== kok.kabuk)) await indir(m.uni, m.ders, m.ad).catch(() => null);
  }
  if (depoOku(YILDIZLI_ANAHTARI) === "1") await yildizlilariTut().catch(() => null);
}

type Favori = { id?: unknown; uniId?: unknown; name?: unknown };

/** Downloads every starred course that is missing, unfinished or changed. */
export async function yildizlilariTut(): Promise<number> {
  let favoriler: Favori[] = [];
  try {
    const v = JSON.parse(depoOku("favorite-courses") ?? "[]") as unknown;
    favoriler = Array.isArray(v) ? (v as Favori[]) : [];
  } catch {
    favoriler = [];
  }
  let sayi = 0;
  for (const f of favoriler) {
    if (typeof f.id !== "string" || typeof f.uniId !== "string") continue;
    const m = await metaOku(f.uniId, f.id);
    const d = await durum(m, f.uniId, f.id);
    if (d === "yok" || d === "yarim" || d === "guncelleme") {
      const sonuc = await indir(f.uniId, f.id, typeof f.name === "string" ? f.name : undefined).catch(() => null);
      if (sonuc) sayi++;
    }
  }
  return sayi;
}

// ---- Storage ----

export type Alan = { kullanilan: number; kota: number; kalici: boolean | null };

export async function alan(): Promise<Alan> {
  const st = navigator.storage;
  const tahmin = st?.estimate ? await st.estimate().catch(() => ({}) as StorageEstimate) : ({} as StorageEstimate);
  const kalici = st?.persisted ? await st.persisted().catch(() => null) : null;
  return { kullanilan: tahmin.usage ?? 0, kota: tahmin.quota ?? 0, kalici };
}

/** Asks the browser to keep this site's storage under pressure. Chrome decides without a prompt; Safari by heuristics. */
export async function kaliciIste(): Promise<boolean> {
  return navigator.storage?.persist ? navigator.storage.persist().catch(() => false) : false;
}
