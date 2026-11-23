// /calisma-veri/<üniversite>/<ders>/paket.json: the study room's data (media transcripts, topics with book text,
// explanations and concept list). It used to sit inside the page as an inline JSON script, which made a study room
// page 3.4 MB (3.05 MB of it this JSON, Öğretim Tasarımı, 23 Nov 2026). As its own file the browser and the
// service worker cache it once and the page HTML stays small.
import type { APIRoute, GetStaticPaths } from "astro";

export const getStaticPaths = (async () => {
  const paketler = import.meta.glob<{ ders: string; uni: string }>("../../../../data/calisma-odasi/*.json", { eager: true, import: "default" });
  return Object.values(paketler).map((p) => ({ params: { uni: p.uni, ders: p.ders }, props: { paket: p } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify((props as { paket: unknown }).paket), { headers: { "Content-Type": "application/json" } });
