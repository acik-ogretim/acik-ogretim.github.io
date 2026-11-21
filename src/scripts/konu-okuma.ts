// Read-aloud for the topic drawer: Web Speech API (tr-TR), one sentence per utterance, the sentence being
// read is highlighted (CSS Custom Highlight, whole block as fallback) and scrolled into view.
// Speed and voice come from the player's own record (quiz-settings: playbackRate, voiceURI): no second setting.
import { depoOku } from "../lib/calisma-durumu";
import { cumleleriBol, okunacakMetin } from "../lib/konu/cumle";

type Parca = { blok: HTMLElement; metin: string; aralik: () => Range | null };

const BLOK = "p, li, h3, h4, h5, h6, th, td";
const ATLA = ".konu-alinti, .konu-sayfa";
const VARSAYILAN_HIZ = 1.2;

function ayar(): { hiz: number; ses: string } {
  try {
    const v = JSON.parse(depoOku("quiz-settings") ?? "{}") as { playbackRate?: unknown; voiceURI?: unknown };
    const hiz = typeof v.playbackRate === "number" && v.playbackRate >= 0.5 && v.playbackRate <= 3 ? v.playbackRate : VARSAYILAN_HIZ;
    return { hiz, ses: typeof v.voiceURI === "string" ? v.voiceURI : "" };
  } catch {
    return { hiz: VARSAYILAN_HIZ, ses: "" };
  }
}

export const sesDestekli = (): boolean => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** Sentences of the rendered topic text, each tied to a live Range for highlighting. */
export function parcalaYap(kok: HTMLElement): Parca[] {
  const bloklar = [...kok.querySelectorAll<HTMLElement>(`${BLOK}, .konu-kutu-ad`)].filter(
    (el) => !el.closest(ATLA) && !el.querySelector(BLOK),
  );
  const sonuc: Parca[] = [];
  for (const blok of bloklar) {
    const dugumler: { node: Text; bas: number }[] = [];
    let toplam = "";
    const yuru = document.createTreeWalker(blok, NodeFilter.SHOW_TEXT);
    for (let n = yuru.nextNode(); n; n = yuru.nextNode()) {
      dugumler.push({ node: n as Text, bas: toplam.length });
      toplam += n.nodeValue ?? "";
    }
    const konumla = (ofset: number, sonda: boolean): [Text, number] | null => {
      for (let i = dugumler.length - 1; i >= 0; i--) {
        const d = dugumler[i];
        const u = d.node.length;
        if (ofset > d.bas || (ofset === d.bas && !sonda) || i === 0) {
          const g = Math.min(Math.max(ofset - d.bas, 0), u);
          if (sonda && g === 0 && i > 0) continue;
          return [d.node, g];
        }
      }
      return null;
    };
    for (const c of cumleleriBol(toplam)) {
      const metin = okunacakMetin(toplam.slice(c.bas, c.son));
      if (!/[\p{L}\p{N}]/u.test(metin)) continue;
      sonuc.push({
        blok,
        metin,
        aralik: () => {
          const a = konumla(c.bas, false);
          const b = konumla(c.son, true);
          if (!a || !b) return null;
          const r = document.createRange();
          r.setStart(a[0], a[1]);
          r.setEnd(b[0], b[1]);
          return r;
        },
      });
    }
  }
  return sonuc;
}

export class KonuOkuma {
  private parcalar: Parca[] = [];
  private sira = 0;
  private oturum = 0;
  calisiyor = false;

  constructor(
    private kaydirma: HTMLElement,
    private durum: (calisiyor: boolean) => void,
  ) {}

  yukle(kok: HTMLElement): void {
    this.dur(true);
    this.parcalar = parcalaYap(kok);
    this.sira = 0;
  }

  get var(): boolean {
    return this.parcalar.length > 0;
  }

  baslat(): void {
    if (!sesDestekli() || !this.var) return;
    if (this.sira >= this.parcalar.length) this.sira = 0;
    this.oturum++;
    this.calisiyor = true;
    this.durum(true);
    speechSynthesis.cancel();
    this.oku(this.oturum);
  }

  /** Stops speaking; `basa` also returns to the first sentence and clears the highlight. */
  dur(basa = false): void {
    this.oturum++;
    if (sesDestekli()) speechSynthesis.cancel();
    if (basa) {
      this.sira = 0;
      this.vurguSil();
    }
    if (this.calisiyor) {
      this.calisiyor = false;
      this.durum(false);
    }
  }

  private oku(oturum: number): void {
    if (oturum !== this.oturum) return;
    const parca = this.parcalar[this.sira];
    if (!parca) {
      this.sira = 0;
      this.vurguSil();
      this.calisiyor = false;
      this.durum(false);
      return;
    }
    this.vurgula(parca);
    const { hiz, ses } = ayar();
    const u = new SpeechSynthesisUtterance(parca.metin);
    u.lang = "tr-TR";
    u.rate = hiz;
    const sesler = speechSynthesis.getVoices();
    const secilen = (ses && sesler.find((v) => v.voiceURI === ses)) || sesler.find((v) => v.lang.toLowerCase().replace("_", "-").includes("tr-tr"));
    if (secilen) u.voice = secilen;
    u.onend = () => {
      if (oturum !== this.oturum) return;
      this.sira++;
      this.oku(oturum);
    };
    u.onerror = (e) => {
      if (oturum !== this.oturum || e.error === "interrupted" || e.error === "canceled") return;
      this.dur();
    };
    speechSynthesis.speak(u);
  }

  private vurgula(parca: Parca): void {
    this.vurguSil();
    const r = parca.aralik();
    if (r && "highlights" in CSS && typeof Highlight !== "undefined") {
      CSS.highlights.set("konu-okunan", new Highlight(r));
    } else {
      parca.blok.classList.add("konu-okunan-blok");
    }
    this.gorunur(r?.getBoundingClientRect() ?? parca.blok.getBoundingClientRect());
  }

  private vurguSil(): void {
    if ("highlights" in CSS) CSS.highlights.delete("konu-okunan");
    this.kaydirma.querySelector(".konu-okunan-blok")?.classList.remove("konu-okunan-blok");
  }

  private gorunur(r: DOMRect): void {
    const k = this.kaydirma.getBoundingClientRect();
    const pay = 40;
    let fark = 0;
    if (r.top < k.top + pay) fark = r.top - (k.top + pay);
    else if (r.bottom > k.bottom - pay) fark = r.bottom - (k.bottom - pay);
    if (fark === 0) return;
    const sakin = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.kaydirma.scrollBy({ top: fark + (fark > 0 ? k.height / 4 : -k.height / 4), behavior: sakin ? "auto" : "smooth" });
  }
}
