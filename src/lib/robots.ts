// robots.txt body. The site is a free study portal, so search engines and AI crawlers are welcome;
// only /veri/ (the per-course question JSON the in-browser chat reads) is kept out of crawling,
// because the full question sets belong to the universities (docs/yz-ve-ajan-hazirligi.md).
import { mutlakUrl } from "./seo";
import { SITEMAP_DIZINI } from "./site-haritasi";

/**
 * AI crawlers named explicitly so the intent is clear to their operators (tokens as published by
 * OpenAI, Anthropic, Google, Perplexity, Apple, Microsoft, Meta, Mistral, DuckDuckGo, Amazon, Common Crawl).
 */
export const YZ_TARAYICILARI = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Gemini-Deep-Research",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "MistralAI-User",
  "Meta-WebIndexer",
  "meta-externalagent",
  "Amazonbot",
  "CCBot",
] as const;

export const KAPALI_YOLLAR = ["/veri/"] as const;

export function robotsMetni(site: URL | string | undefined): string {
  const kurallar = ["Allow: /", ...KAPALI_YOLLAR.map((y) => `Disallow: ${y}`)];
  return [
    "# Açık Öğretim Portal: ücretsiz ve ticari olmayan bir çalışma sitesi.",
    "# Arama motorları ve yapay zekâ tarayıcıları siteyi tarayabilir. Ders özetleri için /llms.txt dosyasına bakın.",
    "",
    "User-agent: *",
    ...kurallar,
    "",
    "# Yapay zekâ arama, model ve kullanıcı isteğiyle çalışan tarayıcılar: aynı kurallar",
    ...YZ_TARAYICILARI.map((t) => `User-agent: ${t}`),
    ...kurallar,
    "",
    `Sitemap: ${mutlakUrl(site, SITEMAP_DIZINI)}`,
    "",
  ].join("\n");
}
