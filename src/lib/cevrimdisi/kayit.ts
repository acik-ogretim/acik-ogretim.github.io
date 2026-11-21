// Started on every page from Layout.astro: registers the service worker, shows "Yeni sürüm hazır" when a new
// version waits (it activates only after the learner taps "Yenile"), marks the page while offline, dims links
// that will not open offline, warms department pages in the background and runs the download housekeeping.
import { bildir } from "../bildirim";
import { anahtarUrl, dersKimligi, dersYolu } from "./anahtar";
import { CEVRIMDISI_OLAYI, bakim, destekVar, listele } from "./istemci";

const ISINMA_ANAHTARI = "cevrimdisi-bolumler";
const BAKIM_ANAHTARI = "cevrimdisi-son-bakim";
const BAKIM_ARALIGI = 30 * 60 * 1000;

const bosta = (is: () => void) =>
  typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(is, { timeout: 4000 }) : window.setTimeout(is, 1500);

// ---- "Yeni sürüm hazır" ----

let onayVerildi = false;

function surumBandi(bekleyen: ServiceWorker): void {
  if (document.getElementById("surum-bandi")) return;
  const bant = document.createElement("div");
  bant.id = "surum-bandi";
  bant.className = "surum-bandi print:hidden";
  bant.setAttribute("role", "status");
  const metin = document.createElement("span");
  metin.className = "min-w-0 flex-1 truncate";
  metin.textContent = "Yeni sürüm hazır";
  const yenile = document.createElement("button");
  yenile.type = "button";
  yenile.className = "surum-bandi-dugme";
  yenile.textContent = "Yenile";
  yenile.addEventListener("click", () => {
    onayVerildi = true;
    yenile.disabled = true;
    bekleyen.postMessage({ tur: "atla" });
  });
  const kapat = document.createElement("button");
  kapat.type = "button";
  kapat.className = "surum-bandi-kapat";
  kapat.setAttribute("aria-label", "Sonra");
  kapat.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  kapat.addEventListener("click", () => bant.remove());
  bant.append(metin, yenile, kapat);
  document.body.append(bant);
}

function guncellemeyiIzle(kayit: ServiceWorkerRegistration): void {
  const izle = (w: ServiceWorker | null) => {
    if (!w) return;
    const bak = () => {
      // An installed worker with a controller already present is an update, not the first install.
      if (w.state === "installed" && navigator.serviceWorker.controller) surumBandi(w);
    };
    bak();
    w.addEventListener("statechange", bak);
  };
  izle(kayit.waiting);
  izle(kayit.installing);
  kayit.addEventListener("updatefound", () => izle(kayit.installing));
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Only the learner's tap reloads the page; the first install takes control silently.
    if (onayVerildi) location.reload();
  });
  // Long open tabs (a study session) look for a new version when they come back to the front.
  let son = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine && Date.now() - son > 20 * 60 * 1000) {
      son = Date.now();
      void kayit.update().catch(() => undefined);
    }
  });
}

// ---- Offline marking ----

let indirilenler = new Set<string>();

async function indirilenleriOku(): Promise<void> {
  indirilenler = new Set((await listele()).map((m) => dersKimligi(m.uni, m.ders)));
}

/** True when the link's page has a stored copy (download, shell, department page, visited page). */
async function acilirMi(a: HTMLAnchorElement): Promise<boolean> {
  const d = dersYolu(a.pathname);
  if (d && indirilenler.has(dersKimligi(d.uni, d.ders))) return true;
  return !!(await caches.match(anahtarUrl(a.href)));
}

async function baglantilariIsaretle(): Promise<void> {
  const cevrimdisi = !navigator.onLine;
  const baglantilar = [...document.querySelectorAll<HTMLAnchorElement>("a[href^='/']")].filter((a) => a.origin === location.origin);
  if (!cevrimdisi) {
    for (const a of document.querySelectorAll<HTMLAnchorElement>("a[data-cevrimdisi-yok]")) {
      a.removeAttribute("data-cevrimdisi-yok");
      if (a.dataset.cevrimdisiBaslik === "1") {
        a.removeAttribute("title");
        delete a.dataset.cevrimdisiBaslik;
      }
    }
    return;
  }
  await indirilenleriOku();
  const sonuc = new Map<string, boolean>();
  for (const a of baglantilar) {
    if (/\.[a-z0-9]{1,8}$/i.test(a.pathname) || a.pathname.startsWith("/__")) continue;
    const anahtar = anahtarUrl(a.href);
    let acilir = sonuc.get(anahtar);
    if (acilir === undefined) {
      acilir = await acilirMi(a);
      sonuc.set(anahtar, acilir);
    }
    if (acilir) a.removeAttribute("data-cevrimdisi-yok");
    else {
      a.setAttribute("data-cevrimdisi-yok", "");
      if (!a.title) {
        a.title = "Bağlantı gelince açılır";
        a.dataset.cevrimdisiBaslik = "1";
      }
    }
  }
}

let ilkCevrimdisi = true;

function baglantiDurumu(): void {
  const cevrimdisi = !navigator.onLine;
  document.documentElement.toggleAttribute("data-cevrimdisi", cevrimdisi);
  if (cevrimdisi && ilkCevrimdisi) {
    ilkCevrimdisi = false;
    bildir({ metin: "Çevrimdışısın. İndirdiğin dersler çalışır, sohbet ve eşitleme bağlantı gelince sürer.", sure: 6000 });
  }
  void baglantilariIsaretle().catch(() => undefined);
}

// ---- Background work while online ----

/** Department pages: the learner's own university first, a batch per message, low network priority. */
function bolumleriIsit(kayit: ServiceWorkerRegistration): void {
  if (localStorage.getItem(ISINMA_ANAHTARI) === "kapali") return;
  const baglanti = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (baglanti?.saveData) return;
  // A department or course page names the learner's university: remember it for the next warming order.
  const parca = location.pathname.split("/").filter(Boolean);
  if (parca.length >= 2 && parca[0]) localStorage.setItem("cevrimdisi-son-uni", parca[0]);
  const istek = () => kayit.active?.postMessage({ tur: "isit", oncelik: localStorage.getItem("cevrimdisi-son-uni") ?? undefined, adet: 25 });
  navigator.serviceWorker.addEventListener("message", (e) => {
    const m = e.data as { tur?: string; kalan?: number; toplam?: number } | null;
    if (m?.tur !== "isinma") return;
    window.dispatchEvent(new CustomEvent("cevrimdisi:isinma", { detail: m }));
    if ((m.kalan ?? 0) > 0 && navigator.onLine && document.visibilityState === "visible") window.setTimeout(() => bosta(istek), 2000);
  });
  bosta(istek);
}

function bakimZamani(): boolean {
  const son = Number(localStorage.getItem(BAKIM_ANAHTARI) ?? 0);
  return Date.now() - son > BAKIM_ARALIGI;
}

export async function cevrimdisiBaslat({ kaydet = true }: { kaydet?: boolean } = {}): Promise<void> {
  baglantiDurumu();
  addEventListener("online", baglantiDurumu);
  addEventListener("offline", baglantiDurumu);
  window.addEventListener(CEVRIMDISI_OLAYI, () => !navigator.onLine && void baglantilariIsaretle());
  if (!kaydet || !destekVar()) return;
  let kayit: ServiceWorkerRegistration;
  try {
    kayit = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  } catch {
    return;
  }
  guncellemeyiIzle(kayit);
  await navigator.serviceWorker.ready;
  if (!navigator.onLine) return;
  bolumleriIsit(kayit);
  if (bakimZamani()) {
    localStorage.setItem(BAKIM_ANAHTARI, String(Date.now()));
    bosta(() => void bakim().catch(() => undefined));
  }
}
