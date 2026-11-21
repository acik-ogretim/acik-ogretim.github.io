import type { APIRoute } from "astro";
import { robotsMetni } from "../lib/robots";
import { metinYaniti } from "../lib/site-haritasi";

export const GET: APIRoute = ({ site }) => metinYaniti(robotsMetni(site));
