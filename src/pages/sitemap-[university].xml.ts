// One sitemap per university, so the data of each university stays in its own file.
import type { APIRoute, GetStaticPaths } from "astro";
import { katalog, sitemapXml, universiteYollari, xmlYaniti, type KatalogUniversitesi } from "../lib/site-haritasi";

export const getStaticPaths = (async () =>
  (await katalog()).map((k) => ({ params: { university: k.uni.id }, props: { k } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, props }) => {
  const { k } = props as { k: KatalogUniversitesi };
  return xmlYaniti(sitemapXml(site, universiteYollari(k)));
};
