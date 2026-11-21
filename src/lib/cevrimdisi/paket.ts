// Downloads one course into the course cache. Runs in the page (foreground download with a progress bar)
// and in the service worker (after a Background Fetch finishes). Resumable: the metadata record is written
// as "yarim" first and lists every stored file, so a later call with the same hash skips what is already there.
import {
  ONBELLEK,
  dersDosyalari,
  dersYolu,
  metaYolu,
  paketDosyaYolu,
  parcaBagimliliklari,
  sayfaVarliklari,
  sayfadanDersAdi,
} from "./anahtar";
import { metaCoz, type DersHedefi, type DersMeta } from "./sema";

export type Ilerleme = { alinan: number; toplam: number };

export type IndirmeSecenek = {
  ilerleme?: (i: Ilerleme) => void;
  sinyal?: AbortSignal;
  /** Responses already fetched elsewhere (Background Fetch records), keyed by path. */
  hazir?: Map<string, Response>;
};

const JSON_BASLIK = { "Content-Type": "application/json" };

export async function metaOku(uni: string, ders: string): Promise<DersMeta | null> {
  const c = await caches.open(ONBELLEK.ders);
  const r = await c.match(metaYolu(uni, ders));
  if (!r) return null;
  try {
    return metaCoz(await r.json());
  } catch {
    return null;
  }
}

export async function metaYaz(meta: DersMeta): Promise<void> {
  const c = await caches.open(ONBELLEK.ders);
  await c.put(metaYolu(meta.uni, meta.ders), new Response(JSON.stringify(meta), { headers: JSON_BASLIK }));
}

/** Reads a response body while counting bytes, then returns an equivalent response that can be stored. */
async function sayarakOku(yanit: Response, say: (n: number) => void, sinyal?: AbortSignal): Promise<Response> {
  const govde = yanit.body;
  if (!govde) return yanit;
  const okuyucu = govde.getReader();
  const parcalar: Uint8Array[] = [];
  for (;;) {
    if (sinyal?.aborted) {
      await okuyucu.cancel();
      throw new DOMException("İndirme durduruldu", "AbortError");
    }
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
    say(value.byteLength);
  }
  const basliklar = new Headers(yanit.headers);
  // The stored copy is already decoded; a leftover length or encoding header would describe the network bytes.
  basliklar.delete("content-length");
  basliklar.delete("content-encoding");
  return new Response(new Blob(parcalar as BlobPart[]), { status: yanit.status, statusText: yanit.statusText, headers: basliklar });
}

async function getir(yol: string, s: IndirmeSecenek, say: (n: number) => void): Promise<Response> {
  const hazir = s.hazir?.get(yol);
  const yanit = hazir ?? (await fetch(yol, { cache: "no-cache", signal: s.sinyal }));
  if (!yanit.ok) throw new Error(`${yol}: ${yanit.status}`);
  return sayarakOku(yanit, say, s.sinyal);
}

/** Every /_astro/ file the page needs: the ones its HTML names plus their relative imports, read from cache or network. */
async function varliklariTopla(baslangic: string[], s: IndirmeSecenek): Promise<string[]> {
  const varlik = await caches.open(ONBELLEK.varlik);
  const gorulen = new Set<string>();
  const sira = [...baslangic];
  while (sira.length) {
    const yol = sira.shift() as string;
    if (gorulen.has(yol)) continue;
    gorulen.add(yol);
    let r = await varlik.match(yol);
    if (!r) {
      const ag = await fetch(yol, { signal: s.sinyal });
      if (!ag.ok) throw new Error(`${yol}: ${ag.status}`);
      await varlik.put(yol, ag.clone());
      r = ag;
    }
    if (/\.m?js$/.test(yol)) for (const b of parcaBagimliliklari(await r.text())) if (!gorulen.has(b)) sira.push(b);
  }
  return [...gorulen];
}

/**
 * Downloads (or resumes) a course. Progress counts decoded body bytes against the manifest size,
 * so the percentage reaches 100 when the last file is in.
 */
export async function dersIndir(h: DersHedefi, s: IndirmeSecenek = {}): Promise<DersMeta> {
  const c = await caches.open(ONBELLEK.ders);
  const dosya = dersDosyalari(h.yol, h.uni, h.ders);
  const onceki = await metaOku(h.uni, h.ders);
  // Same content as a stopped download: keep what is stored. A new hash starts from the page again.
  const devam = onceki && onceki.hash === h.hash ? new Set(onceki.dosyalar) : new Set<string>();
  const meta: DersMeta = {
    v: 1,
    uni: h.uni,
    ders: h.ders,
    ad: h.ad ?? onceki?.ad ?? h.ders,
    uniAd: h.uniAd ?? onceki?.uniAd,
    yol: dosya.sayfa,
    hash: h.hash,
    kabuk: h.kabuk,
    boyut: h.boyut,
    tarih: new Date().toISOString(),
    durum: "yarim",
    // Files already in the cache stay listed (an update overwrites them one by one), so deleting finds them all.
    dosyalar: onceki?.dosyalar ?? [],
    varliklar: onceki?.varliklar ?? [],
  };
  let alinan = 0;
  const toplam = Math.max(1, h.boyut);
  const say = (n: number) => {
    alinan += n;
    s.ilerleme?.({ alinan: Math.min(alinan, toplam), toplam });
  };
  const kaydet = async (yol: string, r: Response) => {
    await c.put(yol, r);
    if (!meta.dosyalar.includes(yol)) meta.dosyalar.push(yol);
    await metaYaz(meta);
  };
  // Earlier copies stay readable until the new ones replace them: an interrupted update still opens offline
  // and is listed as unfinished, so the next tap resumes it.
  await metaYaz(meta);

  // 1. The page: always fetched (it names the images and the scripts of this build).
  const sayfa = await getir(dosya.sayfa, s, say);
  const html = await sayfa.clone().text();
  meta.ad = h.ad ?? sayfadanDersAdi(html) ?? meta.ad;
  await kaydet(dosya.sayfa, sayfa);

  // 2. Chat and reading data, then the materials page (a course without one is still complete).
  for (const [yol, zorunlu] of [[dosya.veri, true], [dosya.materyal, false]] as const) {
    if (devam.has(yol) && (await c.match(yol))) continue;
    try {
      await kaydet(yol, await getir(yol, s, say));
    } catch (e) {
      if (zorunlu || (e instanceof DOMException && e.name === "AbortError")) throw e;
    }
  }

  // 3. Question files of the course package: the index names the unit files; the page draws its cards from them.
  const paketYollari: string[] = [];
  const indeksYolu = dosya.paket;
  let indeks: Response | undefined;
  if (devam.has(indeksYolu) && (await c.match(indeksYolu))) indeks = await c.match(indeksYolu);
  else {
    indeks = await getir(indeksYolu, s, say);
    await kaydet(indeksYolu, indeks.clone());
  }
  const dosyaListesi = ((await indeks?.json()) as { dosyalar?: { yol?: string }[] } | undefined)?.dosyalar ?? [];
  const resimMetni: string[] = [html];
  for (const d of dosyaListesi) {
    if (typeof d.yol !== "string") continue;
    const yol = paketDosyaYolu(h.uni, h.ders, d.yol);
    paketYollari.push(yol);
    let r = devam.has(yol) ? await c.match(yol) : undefined;
    if (!r) {
      r = await getir(yol, s, say);
      await kaydet(yol, r.clone());
    }
    resimMetni.push(await r.text());
  }

  // 4. Question images: content addressed, so any stored copy (from this or another course) is reused.
  const { astro, img } = sayfaVarliklari(resimMetni.join("\n"));
  for (const yol of img) {
    const var_ = await c.match(yol);
    if (var_) {
      if (!meta.dosyalar.includes(yol)) meta.dosyalar.push(yol);
      continue;
    }
    await kaydet(yol, await getir(yol, s, say));
  }

  // 5. Scripts and styles, with their imports: usually already in the shell cache.
  meta.varliklar = await varliklariTopla(astro, s);
  meta.durum = "tamam";
  meta.tarih = new Date().toISOString();
  meta.boyut = Math.max(h.boyut, alinan);
  await metaYaz(meta);
  s.ilerleme?.({ alinan: toplam, toplam });
  return meta;
}

/** Every metadata record in the course cache. */
export async function metalariListele(): Promise<DersMeta[]> {
  const c = await caches.open(ONBELLEK.ders);
  const sonuc: DersMeta[] = [];
  for (const istek of await c.keys()) {
    if (!new URL(istek.url).pathname.startsWith("/__cevrimdisi__/")) continue;
    const r = await c.match(istek);
    try {
      const m = r ? metaCoz(await r.json()) : null;
      if (m) sonuc.push(m);
    } catch {
      // unreadable record: listed as missing
    }
  }
  return sonuc;
}

/** Deletes a course: its record and every file no other stored course uses (shared images stay). */
export async function dersSil(uni: string, ders: string): Promise<void> {
  const c = await caches.open(ONBELLEK.ders);
  const hepsi = await metalariListele();
  const hedef = hepsi.find((m) => m.uni === uni && m.ders === ders);
  await c.delete(metaYolu(uni, ders));
  if (!hedef) return;
  const kullanilan = new Set(hepsi.filter((m) => m !== hedef).flatMap((m) => m.dosyalar));
  await Promise.all(hedef.dosyalar.filter((d) => !kullanilan.has(d)).map((d) => c.delete(d)));
  // A copy kept from an earlier visit would still open offline: the learner deleted the course, so it goes too.
  const ziyaret = await caches.open(ONBELLEK.sayfa);
  for (const k of await ziyaret.keys()) {
    const d = dersYolu(new URL(k.url).pathname);
    if (d?.uni === uni && d.ders === ders) await ziyaret.delete(k);
  }
}
