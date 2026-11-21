import type { APIRoute } from "astro";
import { aracOzetleri } from "../lib/ajan-araclari";
import { llmsMetni } from "../lib/llms";
import { katalog, metinYaniti } from "../lib/site-haritasi";

export const GET: APIRoute = async ({ site }) => metinYaniti(llmsMetni(site, await katalog(), aracOzetleri()), "text/markdown");
