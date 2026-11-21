// Per-page share images (/og/<page>.png, 1200x630), drawn at build time by src/lib/og. Cards are cached by
// content hash in .cache/og, so unchanged pages cost a file read on the next build.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { OG_SURUM, kartPng, kodla } from "../../lib/og/cizim";
import { ogIndeksi, type OgKaydi } from "../../lib/og/veri";

const ONBELLEK = path.resolve(process.cwd(), ".cache/og");

export const getStaticPaths = (async () => {
  const indeks = await ogIndeksi();
  return [...indeks.values()].map((k) => ({ params: { yol: k.dosya } }));
}) satisfies GetStaticPaths;

let dosyaMap: Map<string, OgKaydi> | null = null;
async function dosyaIndeksi() {
  dosyaMap ??= new Map([...(await ogIndeksi()).values()].map((k) => [k.dosya, k]));
  return dosyaMap;
}

export const GET: APIRoute = async ({ params }) => {
  const kayit = (await dosyaIndeksi()).get(String(params.yol));
  if (!kayit) return new Response("Bulunamadı", { status: 404 });
  const kart = await kayit.kart();
  const anahtar = crypto.createHash("sha1").update(`${OG_SURUM}\n${JSON.stringify(kart)}`).digest("hex");
  const dosya = path.join(ONBELLEK, `${anahtar}.png`);
  let govde: Buffer;
  try {
    govde = await fs.readFile(dosya);
  } catch {
    govde = await kodla(await kartPng(kart), "png");
    await fs.mkdir(ONBELLEK, { recursive: true });
    await fs.writeFile(dosya, govde);
  }
  return new Response(new Uint8Array(govde), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
};
