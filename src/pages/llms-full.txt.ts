import type { APIRoute } from "astro";
import { llmsTamMetni } from "../lib/llms";
import { katalog, metinYaniti } from "../lib/site-haritasi";

export const GET: APIRoute = async ({ site }) => metinYaniti(llmsTamMetni(site, await katalog()), "text/markdown");
