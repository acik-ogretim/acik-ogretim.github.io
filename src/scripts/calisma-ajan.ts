// Study room WebMCP tools: a browser agent lists topics, jumps to a topic or a video second, and searches the transcript.
// Loaded only where document.modelContext exists. Registration is removed with an AbortSignal (there is no unregisterTool).
// Source: developer.chrome.com/docs/modern-web-guidance/guides/webmcp/agentic-javascript-tools (Zeki, 23 Nov 2026).
import { saatYaz } from "../lib/calisma-odasi/sema";

type Arac = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (girdi: Record<string, unknown>) => Promise<string>;
};
type ModelBaglami = { registerTool: (arac: Arac, secenek?: { signal?: AbortSignal }) => Promise<void> | void };

export type CalismaAjanOrtami = {
  ders: string;
  konular: () => { no: string; baslik: string; unite: number }[];
  konuyaGit: (no: string) => boolean;
  zamanaGit: (sn: number) => void;
  suAn: () => { sn: number; konu: string | null; satir: string | null };
  dokum: () => { bas: number; m: string; konu: string | null }[];
};

const tr = (s: string): string => s.toLocaleLowerCase("tr");
const json = (v: unknown): string => JSON.stringify(v);

export function calismaAraclari(o: CalismaAjanOrtami): Arac[] {
  return [
    {
      name: "calisma_konulari",
      title: "Dersin konuları",
      description: `${o.ders} çalışma odasındaki konuları ünite ve numarasıyla listeler. Konuya gitmek için calisma_konuya_git aracına no değerini ver.`,
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => json(o.konular()),
    },
    {
      name: "calisma_konuya_git",
      title: "Konuya git",
      description: "Konu anlatımını açar; konu videoda geçiyorsa videoyu o saniyeye getirir.",
      inputSchema: { type: "object", properties: { no: { type: "string", description: "calisma_konulari çıktısındaki no" } }, required: ["no"] },
      execute: async (g) => (o.konuyaGit(String(g.no ?? "")) ? `Konu açıldı: ${String(g.no)}` : `Konu bulunamadı: ${String(g.no)}`),
    },
    {
      name: "calisma_videoda_git",
      title: "Videoda saniyeye git",
      description: "Videoyu verilen saniyeye getirir ve oynatır; döküm o satıra kayar.",
      inputSchema: { type: "object", properties: { saniye: { type: "number", minimum: 0 } }, required: ["saniye"] },
      execute: async (g) => {
        const sn = Math.max(0, Number(g.saniye) || 0);
        o.zamanaGit(sn);
        return `Video ${saatYaz(sn)} konumunda.`;
      },
    },
    {
      name: "calisma_dokumde_ara",
      title: "Dökümde ara",
      description: "Video dökümünde sözcük arar; en çok 10 satırı saniyesi ve konusuyla döndürür.",
      inputSchema: { type: "object", properties: { sorgu: { type: "string", minLength: 2 } }, required: ["sorgu"] },
      annotations: { readOnlyHint: true },
      execute: async (g) => {
        const s = tr(String(g.sorgu ?? "").trim());
        if (s.length < 2) return "En az iki harf yaz.";
        const bulunan = o
          .dokum()
          .filter((x) => tr(x.m).includes(s))
          .slice(0, 10)
          .map((x) => ({ saniye: Math.round(x.bas), zaman: saatYaz(x.bas), konu: x.konu, metin: x.m }));
        return bulunan.length ? json(bulunan) : "Dökümde geçmiyor.";
      },
    },
    {
      name: "calisma_su_an",
      title: "Şu an ne anlatılıyor",
      description: "Videonun o anki saniyesini, konusunu ve dökümdeki cümleyi döndürür.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const a = o.suAn();
        return json({ zaman: saatYaz(a.sn), saniye: Math.round(a.sn), konu: a.konu, satir: a.satir });
      },
    },
  ];
}

let denetci: AbortController | null = null;

export async function calismaAraclariniKaydet(o: CalismaAjanOrtami): Promise<number> {
  const b = (document as unknown as { modelContext?: ModelBaglami }).modelContext;
  if (!b || typeof b.registerTool !== "function") return 0;
  denetci?.abort();
  denetci = new AbortController();
  let sayi = 0;
  for (const arac of calismaAraclari(o)) {
    try {
      await b.registerTool(arac, { signal: denetci.signal });
      sayi++;
    } catch {
      // name clash or an older build: skip this tool, keep the rest
    }
  }
  return sayi;
}
