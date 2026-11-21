// WebMCP registration (experimental, Chrome origin trial 149-156; local testing through
// chrome://flags/#enable-webmcp-testing). Loaded by SeoHead.astro only when the browser exposes a
// model context, so it costs nothing elsewhere. Current spec: document.modelContext.registerTool(tool,
// { signal }); the first Chrome builds put the same object on navigator.modelContext.
import { kaldiginYerOku, depoOku, depoYaz } from "./calisma-durumu";
import { ARACLAR, araciCalistir, girdiSemasi, type AracOrtami, type KatalogKaydi } from "./ajan-araclari";

type KayitliArac = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  execute: (girdi: unknown, secenek?: { signal?: AbortSignal }) => Promise<string>;
};
type ModelBaglami = {
  registerTool: (arac: KayitliArac, secenek?: { signal?: AbortSignal }) => Promise<void> | void;
};

export function modelBaglami(): ModelBaglami | null {
  const d = (document as unknown as { modelContext?: ModelBaglami }).modelContext;
  const n = (navigator as unknown as { modelContext?: ModelBaglami }).modelContext;
  const b = d ?? n;
  return b && typeof b.registerTool === "function" ? b : null;
}

let katalogSozu: Promise<KatalogKaydi[]> | null = null;

/** The browser side of the tools: the same page functions the menu and the filter sheet use. */
export const tarayiciOrtami: AracOrtami = {
  katalog: () => {
    katalogSozu ??= fetch("/veri/dersler.json").then((r) => {
      if (!r.ok) throw new Error(`Katalog yüklenemedi (${r.status})`);
      return r.json() as Promise<KatalogKaydi[]>;
    });
    return katalogSozu;
  },
  yol: () => location.pathname,
  git: (adres) => location.assign(adres),
  yenile: () => location.reload(),
  kaydir: (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: azHareket ? "auto" : "smooth" });
    return true;
  },
  depoOku,
  depoYaz: (anahtar, deger) => void depoYaz(anahtar, deger),
  suzgeciUygula: () => (window as unknown as { quizPlayer?: { syncSettings?: () => void } }).quizPlayer?.syncSettings?.(),
  soruSayisiMetni: () => document.getElementById("soru-sayisi")?.textContent?.trim() || null,
  kaldiginYer: () => kaldiginYerOku().dersler,
};

let kayitDenetcisi: AbortController | null = null;

/** Registers every tool once per page; calling it again replaces the earlier registration. */
export async function araclariKaydet(baglam = modelBaglami(), ortam: AracOrtami = tarayiciOrtami): Promise<number> {
  if (!baglam) return 0;
  kayitDenetcisi?.abort();
  kayitDenetcisi = new AbortController();
  const { signal } = kayitDenetcisi;
  let sayi = 0;
  for (const arac of ARACLAR) {
    try {
      await baglam.registerTool(
        {
          name: arac.name,
          title: arac.title,
          description: arac.description,
          inputSchema: girdiSemasi(arac),
          annotations: arac.annotations,
          // Tools answer with text (the spec's DOMString); the structured part is appended as JSON.
          execute: async (girdi) => {
            const sonuc = await araciCalistir(arac.name, girdi, ortam);
            return sonuc.veri === undefined ? sonuc.mesaj : `${sonuc.mesaj}\n${JSON.stringify(sonuc.veri)}`;
          },
        },
        { signal },
      );
      sayi++;
    } catch {
      // An older build without the options argument, or a name clash: skip this tool, keep the rest.
    }
  }
  return sayi;
}
