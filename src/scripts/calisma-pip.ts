// Study room: plays the video in an always-on-top window (Document Picture-in-Picture, Chrome and Edge 116+), so the
// transcript, topic text and questions get the whole page while the video keeps playing above other apps.
// Source: developer.chrome.com/docs/web-platform/document-picture-in-picture (Zeki, 23 Nov 2026).
//
// The page's own player is not moved: an iframe moved into the blank PiP document reloads without a Referer and
// YouTube answers with error 153 ("Video player configuration error"). The window loads /pip-oynatici/ instead, a
// same-origin page with its own player; while the window is open the study room reads and drives that player.

type PipPenceresiApi = {
  requestWindow: (secenek?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
};

const pipApi = (): PipPenceresiApi | null => (window as unknown as { documentPictureInPicture?: PipPenceresiApi }).documentPictureInPicture ?? null;

export const pipDestekli = (): boolean => pipApi() !== null;

/** The subset of the YouTube player the study room uses. */
export type PipOynatici = {
  getCurrentTime: () => number;
  seekTo: (sn: number, ileri: boolean) => void;
  playVideo: () => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  setPlaybackRate?: (hiz: number) => void;
};

export type PipBaglami = {
  /** Video id, current second, play state and speed of the page's player. */
  durum: () => { id: string; sn: number; caliyor: boolean; hiz: number } | null;
  /** Width of the page's player, for the window's first size. */
  genislik: number;
  /** The window opened: pause the page's player and use this one. */
  acildi: (vekil: PipOynatici) => void;
  /** The window closed at this second: the page's player takes over from there. */
  kapandi: (sn: number, caliyor: boolean) => void;
};

/** Opens the window, or closes it when open. Call from a click handler: it needs a user gesture. */
export async function pipAcKapat(b: PipBaglami): Promise<void> {
  const api = pipApi();
  if (!api) return;
  if (api.window) {
    api.window.close();
    return;
  }
  const d = b.durum();
  if (!d?.id) return;
  const en = Math.max(320, Math.min(640, Math.round(b.genislik || 480)));
  const pip = await api.requestWindow({ width: en, height: Math.round((en * 9) / 16) });
  pip.document.title = document.title;
  const stil = pip.document.createElement("style");
  stil.textContent = "html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:0;display:block}";
  pip.document.head.append(stil);
  const cerceve = pip.document.createElement("iframe");
  const q = new URLSearchParams({ v: d.id, t: String(Math.floor(d.sn)), cal: d.caliyor ? "1" : "0", hiz: String(d.hiz) });
  cerceve.src = new URL(`/pip-oynatici/?${q}`, location.origin).href;
  cerceve.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  pip.document.body.append(cerceve);

  // The player inside the same-origin page: every call goes to it once it is ready.
  const ic = (): PipOynatici | undefined => (cerceve.contentWindow as unknown as { pipOynatici?: PipOynatici } | null)?.pipOynatici;
  let son = { sn: d.sn, caliyor: d.caliyor };
  const vekil: PipOynatici = {
    getCurrentTime: () => {
      const o = ic();
      if (o) son = { sn: o.getCurrentTime(), caliyor: o.getPlayerState?.() === 1 };
      return son.sn;
    },
    seekTo: (sn, ileri) => ic()?.seekTo(sn, ileri),
    playVideo: () => ic()?.playVideo(),
    pauseVideo: () => ic()?.pauseVideo?.(),
    getPlayerState: () => ic()?.getPlayerState?.() ?? (son.caliyor ? 1 : 2),
    setPlaybackRate: (hiz) => ic()?.setPlaybackRate?.(hiz),
  };
  b.acildi(vekil);
  pip.addEventListener(
    "pagehide",
    () => {
      try {
        vekil.getCurrentTime();
      } catch {
        /* window already gone: keep the last known second */
      }
      b.kapandi(son.sn, son.caliyor);
    },
    { once: true },
  );
}
