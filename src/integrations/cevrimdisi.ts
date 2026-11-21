// Build step of the offline support (docs/cevrimdisi.md). After Astro writes dist/ it:
//   1. moves inline question images out of the pages (scripts/extract-inline-images.mjs, so hashes see the final HTML),
//   2. lists the app shell (pages, catalog, icons, every /_astro/ file) with a content revision per file,
//   3. lists the department pages the worker fetches in the background,
//   4. writes one version manifest per university (content hash and size of every downloadable course)
//      plus /cevrimdisi-surum.json,
//   5. bundles src/sw/sw.ts with those lists into dist/sw.js.
// Nothing here reads the data/ folder for content: it hashes what was actually built.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";
// Static import: the config is loaded through a Vite runner that is closed by the time build:done runs.
import { build as esbuildBuild } from "esbuild";
import { icerikIcinNormalle, sayfaVarliklari } from "../lib/cevrimdisi/anahtar";

/** Pages every visitor gets offline, besides the university pages. */
export const KABUK_SAYFALARI = [
  "/",
  "/ara/",
  "/derslerim/",
  "/ilerleme/",
  "/ayarlar/",
  "/yedek/",
  "/rehber/",
  "/gizlilik/",
  "/kullanim-kosullari/",
  "/telif/",
  "/hakkimizda/",
  "/iletisim/",
  "/offline/",
  "/cevrimdisi/",
] as const;

const KABUK_DOSYALARI = [
  "/manifest.json",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/logo.svg",
  "/veri/dersler.json",
] as const;

const kisaHash = (veri: string | Buffer, uzunluk = 12) => createHash("sha256").update(veri).digest("hex").slice(0, uzunluk);

async function dosyalar(dizin: string): Promise<string[]> {
  if (!existsSync(dizin)) return [];
  const sonuc: string[] = [];
  for (const e of await readdir(dizin, { withFileTypes: true })) {
    const p = path.join(dizin, e.name);
    if (e.isDirectory()) sonuc.push(...(await dosyalar(p)));
    else sonuc.push(p);
  }
  return sonuc;
}

const sayfaDosyasi = (kok: string, yol: string) => path.join(kok, yol, yol.endsWith("/") ? "index.html" : "");
const yonlendirmeMi = (html: string) => html.length < 4000 && /http-equiv="refresh"/i.test(html);

export type KabukGirdisi = { u: string; r: string };
export type IsinmaGirdisi = { u: string; r: string; uni: string };

export async function cevrimdisiUret(kok: string, log: Pick<AstroIntegrationLogger, "info" | "warn">): Promise<{ surum: string; kabukBayt: number; isinmaBayt: number }> {
  const proje = process.cwd();
  // 1. Final HTML first: the image extractor is idempotent, so the npm postbuild run after this is a no-op.
  const cikar = spawnSync(process.execPath, [path.join(proje, "scripts/extract-inline-images.mjs"), kok], { encoding: "utf8" });
  if (cikar.status !== 0) throw new Error(`extract-inline-images: ${cikar.stderr}`);

  const universiteler = (JSON.parse(await readFile(path.join(proje, "data/universities.json"), "utf8")) as { id: string; shortName?: string; name: string }[])
    .filter((u) => !u.id.startsWith("test-") && existsSync(path.join(kok, u.id, "index.html")));

  // 2. Shell.
  const kabuk: KabukGirdisi[] = [];
  let kabukBayt = 0;
  const ekle = async (yol: string, hashli = false) => {
    const dosya = sayfaDosyasi(kok, yol);
    if (!existsSync(dosya)) return log.warn(`kabukta yok: ${yol}`);
    const icerik = await readFile(dosya);
    kabukBayt += icerik.length;
    kabuk.push({ u: yol, r: hashli ? "" : kisaHash(icerik) });
  };
  for (const y of KABUK_SAYFALARI) await ekle(y);
  for (const u of universiteler) await ekle(`/${u.id}/`);
  for (const y of KABUK_DOSYALARI) await ekle(y);
  for (const p of [...(await dosyalar(path.join(kok, "icons/universities"))), ...(await dosyalar(path.join(kok, "icons/ataturk-aof")))]) {
    if (!/test-/.test(p)) await ekle(`/${path.relative(kok, p).split(path.sep).join("/")}`);
  }
  for (const p of await dosyalar(path.join(kok, "_astro"))) await ekle(`/_astro/${path.relative(path.join(kok, "_astro"), p).split(path.sep).join("/")}`, true);

  // 3. Department pages and 4. course manifests.
  const isinma: IsinmaGirdisi[] = [];
  let isinmaBayt = 0;
  const kokSurum: { kabuk: string; olusturma: string; uniler: Record<string, { ad: string; h: string }> } = { kabuk: "", olusturma: new Date().toISOString(), uniler: {} };
  await mkdir(path.join(kok, "cevrimdisi-surum"), { recursive: true });
  for (const u of universiteler) {
    const dersler: Record<string, [string, string, number]> = {};
    for (const bolum of (await readdir(path.join(kok, u.id), { withFileTypes: true })).filter((e) => e.isDirectory())) {
      const bolumDizin = path.join(kok, u.id, bolum.name);
      const bolumSayfa = path.join(bolumDizin, "index.html");
      if (!existsSync(bolumSayfa)) continue;
      const bolumHtml = await readFile(bolumSayfa);
      if (yonlendirmeMi(bolumHtml.toString("utf8"))) continue;
      isinmaBayt += bolumHtml.length;
      isinma.push({ u: `/${u.id}/${bolum.name}/`, r: kisaHash(bolumHtml), uni: u.id });
      for (const ders of (await readdir(bolumDizin, { withFileTypes: true })).filter((e) => e.isDirectory())) {
        if (dersler[ders.name]) continue;
        const sayfa = path.join(bolumDizin, ders.name, "index.html");
        if (!existsSync(sayfa)) continue;
        const html = await readFile(sayfa, "utf8");
        if (yonlendirmeMi(html) || /data-toplam="0"/.test(html)) continue;
        const veriYolu = path.join(kok, "veri", u.id, `${ders.name}.json`);
        const materyalYolu = path.join(bolumDizin, ders.name, "materyaller", "index.html");
        const h = createHash("sha256").update(icerikIcinNormalle(html));
        let boyut = Buffer.byteLength(html);
        for (const ek of [veriYolu, materyalYolu]) {
          if (!existsSync(ek)) continue;
          const icerik = await readFile(ek, "utf8");
          h.update(icerikIcinNormalle(icerik));
          boyut += Buffer.byteLength(icerik);
        }
        for (const img of sayfaVarliklari(html).img) {
          h.update(img); // names are content hashes
          const p = path.join(kok, img);
          if (existsSync(p)) boyut += (await stat(p)).size;
        }
        dersler[ders.name] = [`/${u.id}/${bolum.name}/${ders.name}/`, h.digest("hex").slice(0, 16), boyut];
      }
    }
    const metin = JSON.stringify({ uni: u.id, dersler });
    await writeFile(path.join(kok, "cevrimdisi-surum", `${u.id}.json`), metin);
    kokSurum.uniler[u.id] = { ad: u.shortName ?? u.name, h: kisaHash(metin) };
  }

  // 5. Worker: the version covers the lists and the worker code, so any change ships a new worker.
  const giris = path.join(proje, "src/sw/sw.ts");
  const paketle = (surum: string) =>
    esbuildBuild({
      entryPoints: [giris],
      bundle: true,
      format: "iife",
      target: "es2020",
      minify: true,
      write: false,
      legalComments: "none",
      define: {
        __AO_SURUM__: JSON.stringify(surum),
        __AO_KABUK__: JSON.stringify(kabuk),
        __AO_ISINMA__: JSON.stringify(isinma),
        __AO_UNILER__: JSON.stringify(universiteler.map((u) => u.id)),
      },
    });
  const taslak = await paketle("0");
  const surum = kisaHash((taslak.outputFiles[0]?.text ?? "") + JSON.stringify(kokSurum.uniler));
  const son = await paketle(surum);
  await writeFile(path.join(kok, "sw.js"), son.outputFiles[0]?.contents ?? new Uint8Array());
  kokSurum.kabuk = surum;
  await writeFile(path.join(kok, "cevrimdisi-surum.json"), JSON.stringify(kokSurum));

  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  const dersSayisi = Object.values(kokSurum.uniler).length;
  log.info(`çevrimdışı: sürüm ${surum}, kabuk ${kabuk.length} dosya ${mb(kabukBayt)}, bölüm sayfası ${isinma.length} (${mb(isinmaBayt)}), ${dersSayisi} üniversite`);
  return { surum, kabukBayt, isinmaBayt };
}

export default function cevrimdisi(): AstroIntegration {
  return {
    name: "acik-ogretim-cevrimdisi",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await cevrimdisiUret(fileURLToPath(dir), logger);
      },
    },
  };
}
