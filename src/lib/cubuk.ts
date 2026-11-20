// Player bar renderer: shows the user's selected actions in order, creates buttons for actions the markup
// does not ship, and drops the last ones into the menu when the row runs out of room.
import { createElement } from "lucide";
import {
  CUBUK_OLAYI,
  EYLEM_HARITASI,
  cubukOku,
  kisayollariBagla,
  type Eylem,
} from "./eylemler";

const GIZLI = "data-cubuk-gizli";

function uret(e: Eylem): HTMLElement {
  const dugme = document.createElement("button");
  dugme.type = "button";
  dugme.className = "player-btn-icon";
  dugme.dataset.cubuk = e.id;
  dugme.title = e.etiket;
  dugme.setAttribute("aria-label", e.etiket);
  dugme.append(createElement(e.simge, { width: 18, height: 18, "aria-hidden": "true" }));
  dugme.addEventListener("click", () => e.calistir());
  return dugme;
}

export function cubuguBaslat(): void {
  const satir = document.getElementById("player-cubuk");
  if (!satir || satir.dataset.hazir) return;
  satir.dataset.hazir = "1";

  // Native buttons are tagged once so they can be found by action id.
  const dugmeler = new Map<string, HTMLElement>();
  for (const e of EYLEM_HARITASI.values()) {
    const yerel = e.yerel ? document.getElementById(e.yerel) : null;
    if (yerel) {
      yerel.dataset.cubuk = e.id;
      dugmeler.set(e.id, yerel);
    }
  }

  let secim = cubukOku();
  let bekliyor = false;

  const ciz = () => {
    bekliyor = false;
    const dar = matchMedia("(max-width: 767px)").matches;
    const gorunecek: HTMLElement[] = [];
    const secili = new Set<string>();
    for (const id of secim) {
      const e = EYLEM_HARITASI.get(id);
      if (!e || (e.genisBar && dar)) continue;
      let d = dugmeler.get(id);
      if (!d) {
        d = uret(e);
        dugmeler.set(id, d);
      }
      secili.add(id);
      gorunecek.push(d);
    }
    // Reorder (append moves existing nodes, keeping their handlers) and hide the rest.
    for (const d of gorunecek) {
      d.removeAttribute(GIZLI);
      satir.append(d);
    }
    for (const [id, d] of dugmeler) if (!secili.has(id)) d.setAttribute(GIZLI, "");

    // Auto-drop: keep the longest prefix that fits the row.
    const bosluk = parseFloat(getComputedStyle(satir).columnGap) || 0;
    const sigan = satir.clientWidth;
    let toplam = 0;
    gorunecek.forEach((d, i) => {
      toplam += d.getBoundingClientRect().width + (i ? bosluk : 0);
      if (toplam > sigan + 0.5) d.setAttribute(GIZLI, "");
    });
  };

  const planla = () => {
    if (bekliyor) return;
    bekliyor = true;
    requestAnimationFrame(ciz);
  };

  window.addEventListener(CUBUK_OLAYI, (olay) => {
    secim = (olay as CustomEvent<string[]>).detail;
    planla();
  });
  new ResizeObserver(planla).observe(satir);
  matchMedia("(max-width: 767px)").addEventListener("change", planla);

  document.getElementById("btn-mobil-menu")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("mobil-menu:ac", { detail: { gorunum: "ana" } }));
  });
  kisayollariBagla();
  planla();
}
