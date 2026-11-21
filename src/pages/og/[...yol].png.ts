// Per-page wide share images (/og/<page>.png, 1200x630), drawn at build time by src/lib/og.
// Square versions live in og/kare/. Both are cached by content hash in .cache/og.
import type { APIRoute, GetStaticPaths } from "astro";
import { kartDosyasi, ogKaydi, pngYaniti } from "../../lib/og/uret";
import { ogIndeksi } from "../../lib/og/veri";

export const getStaticPaths = (async () => [...(await ogIndeksi()).values()].map((k) => ({ params: { yol: k.dosya } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const kayit = await ogKaydi(String(params.yol));
  return kayit ? pngYaniti(await kartDosyasi(kayit, "genis")) : new Response("Bulunamadı", { status: 404 });
};
