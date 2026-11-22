// Study room: moves the video into an always-on-top window (Document Picture-in-Picture, Chrome and Edge 116+), so the
// transcript, topic text and questions get the whole page while the video keeps playing above other apps.
// Source: developer.chrome.com/docs/web-platform/document-picture-in-picture (Zeki, 23 Nov 2026).

type PipPenceresiApi = {
  requestWindow: (secenek?: { width?: number; height?: number; preferInitialWindowPlacement?: boolean }) => Promise<Window>;
  window: Window | null;
};

const pipApi = (): PipPenceresiApi | null => (window as unknown as { documentPictureInPicture?: PipPenceresiApi }).documentPictureInPicture ?? null;

export const pipDestekli = (): boolean => pipApi() !== null;

export type PipBaglami = {
  /** Player box to move (holds the iframe and the speed button). */
  kap: HTMLElement;
  /** Where the box goes back when the window closes. */
  yuva: HTMLElement;
  /** Current second and play state: a moved iframe reloads, playback resumes from here. */
  konum: () => { sn: number; caliyor: boolean };
  /** Resumes the reloaded player at that second. */
  surdur: (sn: number, caliyor: boolean) => void;
  /** The window opened or closed. */
  degisti: (acik: boolean) => void;
};

const PIP_STIL = `
html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
#co-oynatici-kap { position: fixed; inset: 0; }
#co-oynatici-kap iframe { width: 100%; height: 100%; border: 0; display: block; }
#co-oynatici-kap .co-kucult, #co-oynatici-kap .co-pip-ac { display: none; }
`;

/** Copies the page's style sheets once (same-origin ones rule by rule, others as links). */
function stilleriKopyala(hedef: Document): void {
  for (const sayfa of [...document.styleSheets]) {
    try {
      const style = hedef.createElement("style");
      style.textContent = [...sayfa.cssRules].map((k) => k.cssText).join("");
      hedef.head.append(style);
    } catch {
      if (!sayfa.href) continue;
      const link = hedef.createElement("link");
      link.rel = "stylesheet";
      link.href = sayfa.href;
      hedef.head.append(link);
    }
  }
  const ek = hedef.createElement("style");
  ek.textContent = PIP_STIL;
  hedef.head.append(ek);
}

/**
 * The YouTube iframe talks to its parent with postMessage. Inside the window the parent is the PiP document; without
 * forwarding those messages to the opener the player API (seekTo, getCurrentTime) never hears the iframe.
 */
function iletileriAktar(pip: Window): void {
  pip.addEventListener("message", (e) => {
    window.dispatchEvent(new MessageEvent("message", { data: e.data, origin: e.origin, source: e.source }));
  });
}

/** An iframe reloads when it enters another document; resume at the saved second once it loads. */
function yuklenincesurdur(kap: HTMLElement, sn: number, caliyor: boolean, surdur: PipBaglami["surdur"]): void {
  const iframe = kap.querySelector("iframe");
  if (!iframe) return;
  iframe.addEventListener("load", () => setTimeout(() => surdur(sn, caliyor), 600), { once: true });
}

/** Opens the window, or closes it when open. Call from a click handler: it needs a user gesture. */
export async function pipAcKapat(b: PipBaglami): Promise<void> {
  const api = pipApi();
  if (!api) return;
  if (api.window) {
    api.window.close();
    return;
  }
  const { sn, caliyor } = b.konum();
  const genislik = Math.max(320, Math.min(640, Math.round(b.kap.getBoundingClientRect().width || 480)));
  const pip = await api.requestWindow({ width: genislik, height: Math.round((genislik * 9) / 16) });
  stilleriKopyala(pip.document);
  pip.document.title = document.title;
  iletileriAktar(pip);
  yuklenincesurdur(b.kap, sn, caliyor, b.surdur);
  pip.document.body.append(b.kap);
  b.degisti(true);
  pip.addEventListener(
    "pagehide",
    () => {
      const son = b.konum();
      yuklenincesurdur(b.kap, son.sn, son.caliyor, b.surdur);
      b.yuva.prepend(b.kap);
      b.degisti(false);
    },
    { once: true },
  );
}
