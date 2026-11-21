// Static public pages (help, legal, chat). Personal pages such as /derslerim carry noindex and stay out.
import type { APIRoute } from "astro";
import { STATIK_SAYFALAR, sitemapXml, xmlYaniti } from "../lib/site-haritasi";

export const GET: APIRoute = ({ site }) => xmlYaniti(sitemapXml(site, STATIK_SAYFALAR));
