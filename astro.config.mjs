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