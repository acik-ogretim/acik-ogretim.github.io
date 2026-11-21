// Sign in with Google and keep the learner's records in their own Google Drive, in the hidden app-data folder that only
// this site can see (scope drive.appdata, non-sensitive). The site has no database or server: the browser talks to
// Google directly with the learner's own access token, and the site's owners never see the records.

import { topla, yukle } from "./yedek";

/** OAuth client id of the site (public value, not a secret). Empty: Google sync is hidden. */
export const GOOGLE_CLIENT_ID = (import.meta.env.PUBLIC_GOOGLE_CLIENT_ID as string | undefined) ?? "";
const KAPSAM = "https://www.googleapis.com/auth/drive.appdata";
const DOSYA = "kayitlar.json";

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient: (c: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void;
        error_callback?: (e: { type?: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
};

let gisYukleniyor: Promise<Gis> | null = null;
function gisYukle(): Promise<Gis> {
  gisYukleniyor ??= new Promise((ok, hata) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => ok((window as unknown as { google: Gis }).google);
    s.onerror = () => hata(new Error("Google girişi yüklenemedi."));
    document.head.appendChild(s);
  });
  return gisYukleniyor;
}

// The access token lives about an hour; it is kept for this tab session so pages can sync without a new popup.
const OTURUM = "google-esitleme-oturum";
const ACIK = "google-esitleme-acik";
const SON = "google-esitleme-son";
let bitis = 0;
let token: string | null = (() => {
  try {
    const o = JSON.parse(sessionStorage.getItem(OTURUM) ?? "null") as { t: string; bitis: number } | null;
    if (o && o.bitis > Date.now() + 60_000) {
      bitis = o.bitis;
      return o.t;
    }
  } catch {
    /* ignore */
  }
  return null;
})();
const tokenSakla = (t: string | null, saniye = 3600) => {
  bitis = t ? Date.now() + (saniye - 120) * 1000 : 0;
  try {
    if (t) sessionStorage.setItem(OTURUM, JSON.stringify({ t, bitis }));
    else sessionStorage.removeItem(OTURUM);
  } catch {
    /* ignore */
  }
};
const gecerliToken = () => (token && bitis > Date.now() ? token : null);
const yerel = {
  oku: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  yaz: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};
const duyur = () => dispatchEvent(new CustomEvent("google-esitleme:durum"));

export type GoogleDurumu = {
  /** A valid access token is held in this tab. */
  bagli: boolean;
  /** The learner turned Google sync on on this device (may need a new sign-in in a new tab). */
  acik: boolean;
  /** Date.now() of the last successful sync on this device. */
  son: number | null;
};

export function googleDurumu(): GoogleDurumu {
  const son = Number(yerel.oku(SON));
  return { bagli: !!gecerliToken(), acik: yerel.oku(ACIK) === "1", son: Number.isFinite(son) && son > 0 ? son : null };
}

/** Opens Google's sign-in and consent popup; resolves with an access token for the app-data folder. */
export async function girisYap(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google ile eşitleme bu sitede henüz açılmadı.");
  const gis = await gisYukle();
  // Without error_callback a closed or blocked popup never settles the promise and the page stays on "Eşitleniyor"
  const yanit = await new Promise<{ t: string; saniye: number }>((ok, hata) => {
    const sure = setTimeout(() => hata(new Error("Google girişi zaman aşımına uğradı. Yeniden dene.")), 180_000);
    const istemci = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: KAPSAM,
      callback: (r) => {
        clearTimeout(sure);
        if (r.access_token) ok({ t: r.access_token, saniye: r.expires_in ?? 3600 });
        else hata(new Error(r.error === "access_denied" ? "Google izni verilmedi." : "Google girişi tamamlanmadı."));
      },
      error_callback: (e) => {
        clearTimeout(sure);
        hata(
          new Error(
            e.type === "popup_failed_to_open"
              ? "Google penceresi açılamadı. Tarayıcının açılır pencere engelini kaldırıp yeniden dene."
              : "Google penceresi kapatıldı, giriş yapılmadı.",
          ),
        );
      },
    });
    istemci.requestAccessToken({ prompt: yerel.oku(ACIK) === "1" ? "" : "consent" });
  });
  token = yanit.t;
  tokenSakla(token, yanit.saniye);
  yerel.yaz(ACIK, "1");
  duyur();
  return token;
}

/** Signs out on this device: revokes the token if one is held and forgets that sync was on. Records stay on the device and in Drive. */
export async function cikisYap() {
  const eski = token;
  token = null;
  tokenSakla(null);
  yerel.yaz(ACIK, null);
  yerel.yaz(SON, null);
  duyur();
  if (eski) {
    try {
      const gis = await gisYukle();
      gis.accounts.oauth2.revoke(eski);
    } catch {
      /* the token expires on its own within the hour */
    }
  }
}

class OturumGerekli extends Error {}

async function drive(yol: string, init: RequestInit = {}, etkilesimli = true) {
  if (!gecerliToken()) {
    // A popup outside a user gesture is blocked: background syncs stop here instead of hanging
    if (!etkilesimli) throw new OturumGerekli("Google oturumu kapalı.");
    await girisYap();
  }
  let r: Response;
  try {
    r = await fetch(`https://www.googleapis.com${yol}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  } catch {
    throw new Error("Google'a ulaşılamadı. İnternet bağlantını kontrol et.");
  }
  if (r.status === 401) {
    token = null;
    tokenSakla(null);
    duyur();
    throw new Error("Google oturumu kapandı, yeniden giriş yap.");
  }
  if (r.status === 403) throw new Error("Google Drive erişimi reddedildi. Çıkış yapıp yeniden giriş yap.");
  if (!r.ok) throw new Error(`Google Drive yanıt vermedi (${r.status}). Biraz sonra yeniden dene.`);
  return r;
}

async function dosyaBul(e: boolean): Promise<string | null> {
  const r = await drive(`/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${DOSYA}'`)}&fields=files(id)`, {}, e);
  const j = (await r.json()) as { files: { id: string }[] };
  return j.files[0]?.id ?? null;
}

/** Merges the records in Drive into this device, then writes the merged state back. */
let suren: Promise<{ gelen: number }> | null = null;

/** One sync at a time: a button press during a background sync waits for the same run. */
export function googleEsitle(etkilesimli = true): Promise<{ gelen: number }> {
  suren ??= esitle(etkilesimli).finally(() => {
    suren = null;
  });
  return suren;
}

async function esitle(e: boolean): Promise<{ gelen: number }> {
  let gelen = 0;
  const id = await dosyaBul(e);
  if (id) gelen = yukle(await (await drive(`/drive/v3/files/${id}?alt=media`, {}, e)).json());
  const govde = JSON.stringify(topla());
  if (id) {
    await drive(`/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: govde }, e);
  } else {
    const sinir = "acik-ogretim-sinir";
    const cok = [
      `--${sinir}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify({ name: DOSYA, parents: ["appDataFolder"] }),
      `--${sinir}`,
      "Content-Type: application/json",
      "",
      govde,
      `--${sinir}--`,
    ].join("\r\n");
    await drive("/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${sinir}` }, body: cok }, e);
  }
  yerel.yaz(SON, String(Date.now()));
  duyur();
  return { gelen };
}

/** Background sync while a Google session is open in this tab: on page load and when the page is hidden
 * (switching apps, closing the tab), so solved questions reach the other devices without pressing a button. */
export function otomatikEsitlemeKur() {
  if (!GOOGLE_CLIENT_ID || !gecerliToken()) return;
  let son = 0;
  const calis = () => {
    if (!gecerliToken() || Date.now() - son < 30_000) return;
    son = Date.now();
    googleEsitle(false).catch(() => undefined);
  };
  calis();
  addEventListener("visibilitychange", () => document.visibilityState === "hidden" && calis());
}
