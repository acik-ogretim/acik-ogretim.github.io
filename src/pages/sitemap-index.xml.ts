// Sitemap index: the static pages plus one sitemap per university. Submit this URL in Search Console.
import type { APIRoute } from "astro";
import { SAYFALAR_SITEMAP, katalog, sitemapDiziniXml, universiteSitemapYolu, xmlYaniti } from "../lib/site-haritasi";

export const GET: APIRoute = async ({ site }) => {
  const unis = await katalog();
  return xmlYaniti(sitemapDiziniXml(site, [SAYFALAR_SITEMAP, ...unis.map((k) => universiteSitemapYolu(k.uni.id))]));
};
