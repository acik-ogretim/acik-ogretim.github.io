// /simge.svg: the shared Lucide icon sprite (src/lib/simge-sprite.ts). Pages link it with ?v=<content hash>.
import type { APIRoute } from "astro";
import { simgeSprite } from "../lib/simge-sprite";

export const GET: APIRoute = () => new Response(simgeSprite().svg, { headers: { "Content-Type": "image/svg+xml" } });
