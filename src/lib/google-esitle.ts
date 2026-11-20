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
        callback: (r: { access_token?: string; error?: string }) => void;
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
let token: string | null = (() => {
  try {
    const o = JSON.parse(sessionStorage.getItem(OTURUM) ?? "null") as { t: string; bitis: number } | null;
    return o && o.bitis > Date.now() + 60_000 ? o.t : null;
  } catch {
    return null;
  }
})();
const tokenSakla = (t: string | null) => {
  try {
    if (t) sessionStorage.setItem(OTURUM, JSON.stringify({ t, bitis: Date.now() + 55 * 60_000 }));
    else sessionStorage.removeItem(OTURUM);
  } catch {
    /* ignore */
  }
};

/** Opens Google's sign-in and consent popup; resolves with an access token for the app-data folder. */
export async function girisYap(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google ile eşitleme bu sitede henüz açılmadı.");
  const gis = await gisYukle();
  token = await new Promise<string>((ok, hata) => {
    const istemci = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: KAPSAM,
      callback: (r) => (r.access_token ? ok(r.access_token) : hata(new Error("Google girişi tamamlanmadı."))),
    });
    istemci.requestAccessToken({ prompt: token ? "" : "consent" });
  });
  tokenSakla(token);
  try {
    localStorage.setItem("google-esitleme-acik", "1");
  } catch {
    /* ignore */
  }
  return token;
}

export async function cikisYap() {
  if (!token) return;
  const gis = await gisYukle();
  gis.accounts.oauth2.revoke(token);
  token = null;
  tokenSakla(null);
  try {
    localStorage.removeItem("google-esitleme-acik");
  } catch {
    /* ignore */
  }
}

async function drive(yol: string, init: RequestInit = {}) {
  if (!token) await girisYap();
  const r = await fetch(`https://www.googleapis.com${yol}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (r.status === 401) {
    token = null;
    tokenSakla(null);
    throw new Error("Google oturumu kapandı, yeniden giriş yap.");
  }
  if (!r.ok) throw new Error(`Google Drive yanıtı: ${r.status}`);
  return r;
}

async function dosyaBul(): Promise<string | null> {
  const r = await drive(`/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${DOSYA}'`)}&fields=files(id)`);
  const j = (await r.json()) as { files: { id: string }[] };
  return j.files[0]?.id ?? null;
}

/** Merges the records in Drive into this device, then writes the merged state back. */
export async function googleEsitle(): Promise<{ gelen: number }> {
  let gelen = 0;
  const id = await dosyaBul();
  if (id) gelen = yukle(await (await drive(`/drive/v3/files/${id}?alt=media`)).json());
  const govde = JSON.stringify(topla());
  if (id) {
    await drive(`/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: govde });
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
    await drive("/upload/drive/v3/files?uploadType=multipart", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${sinir}` }, body: cok });
  }
  return { gelen };
}

/** Background sync while a Google session is open in this tab: on page load and when the page is hidden
 * (switching apps, closing the tab), so solved questions reach the other devices without pressing a button. */
export function otomatikEsitlemeKur() {
  if (!GOOGLE_CLIENT_ID || !token) return;
  let son = 0;
  const calis = () => {
    if (!token || Date.now() - son < 30_000) return;
    son = Date.now();
    googleEsitle().catch(() => undefined);
  };
  calis();
  addEventListener("visibilitychange", () => document.visibilityState === "hidden" && calis());
}
