// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cevrimdisi from './src/integrations/cevrimdisi.ts';


// https://astro.build/config
export default defineConfig({
  site: 'https://acik-ogretim.github.io',
  output: 'static',
  // 22k prerendered files, most of them JSON endpoints that wait on disk reads: render four at a time (default 1).
  // Measured on the 23 Nov 2026 build: 458 s total, of which 194 s was the duplicated /veri/ route (fixed separately).
  build: { concurrency: 4 },
  vite: {
    plugins: [tailwindcss()],
    // The chat loads provider adapters on demand; pre-bundle them so the dev server does not re-optimize mid-session.
    optimizeDeps: {
      include: ['@tanstack/ai-gemini', '@tanstack/ai-openai', '@tanstack/ai-anthropic', '@tanstack/ai-openrouter', '@tanstack/ai-openrouter/model-meta']
    }
  },
  // Sitemaps, robots.txt and llms.txt are endpoints in src/pages (src/lib/site-haritasi.ts): one sitemap per
  // university, canonical course pages only.
  integrations: [mdx(), react(), cevrimdisi()]
});