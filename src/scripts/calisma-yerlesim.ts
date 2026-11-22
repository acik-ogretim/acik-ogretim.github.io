// Study room layout on wide screens (Zeki, 22 Nov 2026: "dökümde masaüstünde klasik videonun altında açılması lazım",
// "oradaki bölücü niye hareket ettirilemiyor", "video yoksa niye burası boş duruyor").
// - The transcript panel moves under the video in the left column on wide screens and back to the tabs on narrow ones.
// - The column divider is a split-grid gutter; the chosen ratio is kept per browser in localStorage.
// - A room without media has no left column at all (CSS: .co-videosuz), so nothing here runs for it.
import Split from "split-grid";

const GENIS = "(min-width: 1024px)";
const ANAHTAR = "calisma-bolme-orani";
const AYIRICI_PX = 9;

function oranOku(): number | null {
  try {
    const v = Number(localStorage.getItem(ANAHTAR));
    return Number.isFinite(v) && v > 0.15 && v < 0.85 ? v : null;
  } catch {
    return null;
  }
}

function oranYaz(v: number): void {
  try {
    localStorage.setItem(ANAHTAR, v.toFixed(3));
  } catch {
    /* private mode or full storage: the ratio is only a convenience */
  }
}

/** Writes the left share as fr values so the split follows window resizes instead of fixed pixels. */
function oranUygula(ana: HTMLElement, oran: number): void {
  ana.style.gridTemplateColumns = `${oran}fr ${AYIRICI_PX}px ${1 - oran}fr`;
}

export function calismaYerlesimBaslat(): void {
  const kok = document.getElementById("co");
  const ana = kok?.querySelector<HTMLElement>(".co-ana");
  const sol = kok?.querySelector<HTMLElement>(".co-sol");
  const ayirici = kok?.querySelector<HTMLElement>(".co-ayirici");
  const dokum = document.getElementById("co-p-dokum");
  const videoKab = document.getElementById("co-video-kab");
  if (!kok || !ana || !sol || !ayirici || kok.classList.contains("co-videosuz")) return;

  const sekmeler = document.getElementById("co-sekmeler");
  const dokumEvi = { ebeveyn: dokum?.parentElement ?? null, sonraki: dokum?.nextElementSibling ?? null };
  const mq = matchMedia(GENIS);

  const yerlestir = (): void => {
    if (!dokum) return;
    if (mq.matches) {
      if (dokum.parentElement !== sol) videoKab?.after(dokum);
      kok.setAttribute("data-dokum-solda", "");
      // the transcript is visible under the video, so a selected "Döküm" tab falls back to the topic flow
      if (sekmeler?.querySelector('[data-sekme="dokum"][aria-selected="true"]')) {
        sekmeler.querySelector<HTMLElement>('[data-sekme="akis"]')?.click();
      }
    } else {
      if (dokumEvi.ebeveyn && dokum.parentElement !== dokumEvi.ebeveyn) dokumEvi.ebeveyn.insertBefore(dokum, dokumEvi.sonraki);
      kok.removeAttribute("data-dokum-solda");
    }
  };

  const oran = oranOku();
  if (oran && mq.matches) oranUygula(ana, oran);

  Split({
    columnGutters: [{ track: 1, element: ayirici }],
    columnMinSizes: { 0: 320, 2: 420 },
    snapOffset: 0,
    onDragEnd: () => {
      const s = sol.getBoundingClientRect().width;
      const toplam = ana.getBoundingClientRect().width - AYIRICI_PX;
      if (toplam <= 0) return;
      const yeni = s / toplam;
      oranYaz(yeni);
      oranUygula(ana, yeni);
    },
  });

  // keyboard: the divider is a focusable separator, arrows move it by 4% of the width
  ayirici.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const toplam = ana.getBoundingClientRect().width - AYIRICI_PX;
    const simdiki = sol.getBoundingClientRect().width / toplam;
    const yeni = Math.min(0.75, Math.max(0.25, simdiki + (e.key === "ArrowRight" ? 0.04 : -0.04)));
    oranYaz(yeni);
    oranUygula(ana, yeni);
    ayirici.setAttribute("aria-valuenow", String(Math.round(yeni * 100)));
  });
  ayirici.addEventListener("dblclick", () => {
    try {
      localStorage.removeItem(ANAHTAR);
    } catch {
      /* ignore */
    }
    ana.style.removeProperty("grid-template-columns");
  });

  yerlestir();
  mq.addEventListener("change", () => {
    yerlestir();
    if (!mq.matches) ana.style.removeProperty("grid-template-columns");
    else {
      const o = oranOku();
      if (o) oranUygula(ana, o);
    }
  });
}
