// Personal storage with remoteStorage (unhosted): the learner connects their own storage account (any remoteStorage
// server, or Google Drive / Dropbox when the site has their app keys) and their records sync there. The site has no
// database; the browser talks to the learner's storage directly with the learner's own authorization.

import type RemoteStorage from "remotestoragejs";
import { GOOGLE_CLIENT_ID } from "./google-esitle";
import { topla, yukle } from "./yedek";

const KAPSAM = "acik-ogretim";
const DOSYA = "kayitlar.json";
const ACIK = "rs-esitleme-acik";
const DROPBOX_KEY = (import.meta.env.PUBLIC_DROPBOX_APP_KEY as string | undefined) ?? "";

let ornek: Promise<RemoteStorage> | null = null;

function rsYukle(): Promise<RemoteStorage> {
  ornek ??= import("remotestoragejs").then(({ default: RS }) => {
    const rs = new RS({ cache: false, logging: false });
    rs.access.claim(KAPSAM, "rw");
    const anahtarlar: Record<string, string> = {};
    if (GOOGLE_CLIENT_ID) anahtarlar.googledrive = GOOGLE_CLIENT_ID;
    if (DROPBOX_KEY) anahtarlar.dropbox = DROPBOX_KEY;
    if (Object.keys(anahtarlar).length) rs.setApiKeys(anahtarlar);
    return rs;
  });
  return ornek;
}

/** Merges the records in the learner's storage into this device and writes the merged state back. */
export async function rsEsitle(): Promise<{ gelen: number }> {
  const rs = await rsYukle();
  const istemci = rs.scope(`/${KAPSAM}/`);
  let gelen = 0;
  const f = (await istemci.getFile(DOSYA, false)) as { data?: string | ArrayBuffer } | undefined;
  if (f?.data) {
    const metin = typeof f.data === "string" ? f.data : new TextDecoder().decode(f.data);
    gelen = yukle(JSON.parse(metin));
  }
  await istemci.storeFile("application/json", DOSYA, JSON.stringify(topla()));
  return { gelen };
}

/** Shows the remoteStorage connect widget in the given element; syncs once connected. */
export async function rsGerecKur(kap: HTMLElement, durum: (m: string) => void) {
  const rs = await rsYukle();
  const { default: Widget } = (await import("remotestorage-widget")) as unknown as {
    default: new (rs: RemoteStorage, o?: object) => { attach: (id: string) => void };
  };
  new Widget(rs, { leaveOpen: false, skipInitial: false }).attach(kap.id);
  rs.on("connected", async () => {
    try {
      localStorage.setItem(ACIK, "1");
    } catch {
      /* ignore */
    }
    durum("Bağlandı, eşitleniyor");
    try {
      const r = await rsEsitle();
      durum(`Eşitlendi: ${r.gelen} kayıt birleşti, güncel hâli depona yazıldı.`);
    } catch (e) {
      durum(e instanceof Error ? e.message : "Eşitlenemedi.");
    }
  });
  rs.on("disconnected", () => {
    try {
      localStorage.removeItem(ACIK);
    } catch {
      /* ignore */
    }
    durum("Bağlantı kesildi.");
  });
}

/** Background sync on every page once the learner connected their storage: on load and when the page is hidden. */
export function rsOtomatik() {
  let son = 0;
  const calis = () => {
    if (Date.now() - son < 30_000) return;
    son = Date.now();
    rsEsitle().catch(() => undefined);
  };
  rsYukle().then((rs) => {
    rs.on("connected", calis);
    addEventListener("visibilitychange", () => document.visibilityState === "hidden" && rs.connected && calis());
  });
}
