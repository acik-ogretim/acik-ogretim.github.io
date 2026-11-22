// Online sync with no server of ours: the backup (yedek.ts) is encrypted in the browser with the learner's own
// passphrase (PBKDF2 -> AES-GCM) and stored in a secret gist on the learner's own GitHub account, written with their
// own token. Neither the site nor GitHub can read it; only someone with the passphrase can.

import { tabanOku, tabanYaz, topla, yukle, type Yedek } from "./yedek";

const API = "https://api.github.com";
const DOSYA = "acik-ogretim-kayitlarim.sifreli.json";
const ACIKLAMA = "Açık Öğretim Portal: şifreli kayıtlar";
export const TOKEN_ANAHTARI = "github-esitleme-api-key"; // ends with -api-key: never exported by yedek.ts
const GIST_ANAHTARI = "github-esitleme-gist";

type Sifreli = { surum: 1; tuz: string; iv: string; veri: string; tarih: string };

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const b64ten = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function anahtar(parola: string, tuz: Uint8Array<ArrayBuffer>) {
  const ham = await crypto.subtle.importKey("raw", new TextEncoder().encode(parola), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: tuz, iterations: 310000, hash: "SHA-256" },
    ham,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sifrele(y: Yedek, parola: string): Promise<Sifreli> {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const veri = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await anahtar(parola, tuz), new TextEncoder().encode(JSON.stringify(y)));
  return { surum: 1, tuz: b64(tuz), iv: b64(iv), veri: b64(veri), tarih: y.tarih };
}

export async function coz(s: Sifreli, parola: string): Promise<Yedek> {
  try {
    const acik = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ten(s.iv) }, await anahtar(parola, b64ten(s.tuz)), b64ten(s.veri));
    return JSON.parse(new TextDecoder().decode(acik)) as Yedek;
  } catch {
    throw new Error("Parola yanlış ya da kayıt bozuk.");
  }
}

async function gh(token: string, yol: string, init: RequestInit = {}) {
  const r = await fetch(API + yol, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (r.status === 401) throw new Error("GitHub anahtarı kabul edilmedi.");
  if (!r.ok) throw new Error(`GitHub yanıtı: ${r.status}`);
  return r.json();
}

async function gistBul(token: string): Promise<string | null> {
  const kayitli = localStorage.getItem(GIST_ANAHTARI);
  if (kayitli) return kayitli;
  for (let sayfa = 1; sayfa <= 5; sayfa++) {
    const liste = (await gh(token, `/gists?per_page=100&page=${sayfa}`)) as { id: string; files: Record<string, unknown> }[];
    const g = liste.find((x) => DOSYA in x.files);
    if (g) {
      localStorage.setItem(GIST_ANAHTARI, g.id);
      return g.id;
    }
    if (liste.length < 100) break;
  }
  return null;
}

/** Downloads, decrypts and merges what is online, then uploads the merged state. Returns how many records merged in. */
export async function esitle(token: string, parola: string): Promise<{ gelen: number; tarih: string }> {
  if (parola.length < 8) throw new Error("Parola en az 8 karakter olmalı.");
  let gelen = 0;
  const id = await gistBul(token);
  if (id) {
    const g = (await gh(token, `/gists/${id}`)) as { files: Record<string, { content?: string; raw_url?: string; truncated?: boolean }> };
    const f = g.files[DOSYA];
    const icerik = f?.truncated && f.raw_url ? await (await fetch(f.raw_url)).text() : f?.content;
    if (icerik) gelen = yukle(await coz(JSON.parse(icerik) as Sifreli, parola), localStorage, await tabanOku("bulut"));
  }
  const anlik = topla();
  const yeni = await sifrele(anlik, parola);
  const govde = JSON.stringify({ description: ACIKLAMA, files: { [DOSYA]: { content: JSON.stringify(yeni) } } });
  if (id) await gh(token, `/gists/${id}`, { method: "PATCH", body: govde });
  else {
    const g = (await gh(token, "/gists", { method: "POST", body: JSON.stringify({ ...JSON.parse(govde), public: false }) })) as { id: string };
    localStorage.setItem(GIST_ANAHTARI, g.id);
  }
  await tabanYaz("bulut", anlik);
  return { gelen, tarih: yeni.tarih };
}
