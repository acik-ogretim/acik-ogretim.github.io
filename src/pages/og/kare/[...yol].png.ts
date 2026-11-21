// Per-page square share images (/og/kare/<page>.png, 800x800): the second og:image, designed for square previews.
import type { APIRoute, GetStaticPaths } from "astro";
import { kartDosyasi, ogKaydi, pngYaniti } from "../../../lib/og/uret";
import { ogIndeksi } from "../../../lib/og/veri";

export const getStaticPaths = (async () => [...(await ogIndeksi()).values()].map((k) => ({ params: { yol: k.dosya } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const kayit = await ogKaydi(String(params.yol));
  return kayit ? pngYaniti(await kartDosyasi(kayit, "kare")) : new Response("Bulunamadı", { status: 404 });
};
