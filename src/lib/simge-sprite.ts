// One SVG sprite for the site's Lucide icons. Every page used to carry each icon's full SVG paths inline
// (a course page: 81 icons, 33 KB of its 111 KB, 23 Nov 2026); pages now reference /simge.svg#<id> and the browser
// caches the sprite once. Icon names come from the source (string literals that are Lucide icon names), so a
// name produced only at runtime falls back to the inline SVG in Simge.astro.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { icons } from "lucide";

type Dugum = [string, Record<string, string | number>];

let onbellek: { adlar: Set<string>; surum: string; svg: string } | null = null;

function kaynaklar(dizin: string): string[] {
  const out: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const p = path.join(dizin, ad);
    if (statSync(p).isDirectory()) out.push(...kaynaklar(p));
    else if (/\.(astro|ts|tsx)$/.test(ad) && !/\.test\.tsx?$/.test(ad)) out.push(p);
  }
  return out;
}

export const kebab = (ad: string): string => ad.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Inner SVG elements of a Lucide icon, as markup. */
export function ikonIci(ad: string): string {
  const node = (icons as Record<string, Dugum[] | undefined>)[ad];
  return (node ?? [])
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`).join(" ")}/>`)
    .join("");
}

export function simgeSprite(): { adlar: Set<string>; surum: string; svg: string } {
  if (onbellek) return onbellek;
  const adlar = new Set<string>();
  for (const f of kaynaklar(path.join(process.cwd(), "src"))) {
    for (const m of readFileSync(f, "utf-8").matchAll(/["'`]([A-Z][A-Za-z0-9]+)["'`]/g)) {
      if (m[1] in icons) adlar.add(m[1]);
    }
  }
  const semboller = [...adlar]
    .sort()
    .map((ad) => `<symbol id="${kebab(ad)}" viewBox="0 0 24 24">${ikonIci(ad)}</symbol>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${semboller}</svg>`;
  onbellek = { adlar, surum: createHash("sha256").update(svg).digest("hex").slice(0, 10), svg };
  return onbellek;
}
