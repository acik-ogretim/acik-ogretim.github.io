// Bundle written by scripts/calisma-odasi-paketle.mjs (src/data/calisma-odasi/<ders>.json), validated once on load.
import { z } from "zod";
import { CalismaSemasi } from "../konu/calisma";

const KonuTemel = z.object({
  no: z.string(),
  goster: z.string().optional(), // printed number; no stays the key
  baslik: z.string(),
  unite: z.number(),
  sayfa: z.number(),
  html: z.string(),
  metin: z.string(),
  calisma: CalismaSemasi.optional(),
  anlatim: z.string().optional(), // written topic explanation (Markdown) from scripts/konu-anlatimi-uret.py
});
/** Per media id: first line and number of lines where that media covers the topic (derived from medya.konuAraliklari on load). */
export const KonuSemasi = KonuTemel.extend({ video: z.record(z.string(), z.object({ ilk: z.number(), say: z.number() })) });
export type CalismaKonu = z.infer<typeof KonuSemasi>;

export const SatirSemasi = z.object({
  i: z.number(),
  bas: z.number(),
  bit: z.number(),
  k: z.string(),
  m: z.string(),
  konu: z.string().nullable(),
  g: z.number(),
  y: z.number().optional(), // 1: assigned to the nearest topic (below the match threshold)
  q: z.string().optional(), // question id (question-solving videos)
  u: z.number().optional(), // unit of that question
});
export type CalismaSatiri = z.infer<typeof SatirSemasi>;

// Media kinds follow src/lib/ders-paketi/sema.ts (tur: youtube | ses, cesit: kisa-ozet | uzun-anlatim | soru-cozum | diger).
export const MedyaCesitleri = ["kisa-ozet", "uzun-anlatim", "soru-cozum", "diger"] as const;
export type MedyaCesidi = (typeof MedyaCesitleri)[number];
export const CESIT_ADI: Record<MedyaCesidi, string> = { "kisa-ozet": "Kısa özet", "uzun-anlatim": "Uzun anlatım", "soru-cozum": "Soru çözümü", diger: "Medya" };
export const CESIT_EKLI: Record<MedyaCesidi, string> = { "kisa-ozet": "Kısa özette", "uzun-anlatim": "Uzun anlatımda", "soru-cozum": "Soru çözümünde", diger: "Medyada" };
const AralikSemasi = z.record(z.string(), z.object({ ilk: z.number(), say: z.number() }));
export const MedyaSemasi = z.object({
  id: z.string(),
  tur: z.enum(["youtube", "ses"]),
  cesit: z.enum(MedyaCesitleri),
  baslik: z.string(),
  /** YouTube video id, or the absolute https URL of the audio file. */
  kaynak: z.string(),
  sure: z.number().nullable(),
  unite: z.number().optional(),
  kapak: z.string().optional(),
  /** Peaks 0..1 for the audio waveform (optional). */
  dalga: z.array(z.number()).optional(),
  satirlar: z.array(SatirSemasi),
  konuAraliklari: AralikSemasi,
});
export type CalismaMedyasi = z.infer<typeof MedyaSemasi>;
export type CalismaVideosu = CalismaMedyasi;

/** Label of a media item in the selector: "Uzun anlatım · Ünite 3". */
export const medyaAdi = (m: Pick<CalismaMedyasi, "cesit" | "unite">): string => `${CESIT_ADI[m.cesit]}${m.unite ? ` · Ünite ${m.unite}` : ""}`;
/** Label of a topic chip: "Videoda 12:34", "Uzun anlatımda Ünite 2 · 08:10". */
export const medyaCipEtiketi = (m: Pick<CalismaMedyasi, "cesit" | "unite" | "tur">, zaman: string): string => {
  const yer = m.tur === "youtube" && m.cesit === "kisa-ozet" ? "Videoda" : CESIT_EKLI[m.cesit];
  return `${yer} ${zaman}`;
};

export const AdTurleri = ["kisi", "topluluk", "yer", "olay", "eser", "kurum", "akim"] as const;
export const KavramSemasi = z.object({
  terim: z.string(),
  tanim: z.string(),
  konu: z.string(),
  kaynak: z.enum(["etkinlik", "kitap", "ad"]),
  tur: z.enum(AdTurleri).optional(), // set for proper names; plain concepts have none
});
export type CalismaKavrami = z.infer<typeof KavramSemasi>;

const PaketTemel = z.object({
  ders: z.string(),
  uni: z.string(),
  uretim: z.string(),
  medyalar: z.array(MedyaSemasi),
  uniteler: z.array(z.object({ no: z.number(), baslik: z.string(), konular: z.array(z.string()) })),
  konular: z.array(KonuTemel),
  kavramlar: z.array(KavramSemasi),
  sorular: z.record(z.string(), z.array(z.string())),
});

/** Bundles written before the media schema carry `videolar` (+ per-topic `video`): convert them on load. */
function eskiyiCevir(ham: unknown): unknown {
  const p = ham as { videolar?: Record<string, unknown>[]; medyalar?: unknown; konular?: { no: string; video?: Record<string, { ilk: number; say: number }> }[] };
  if (!p || typeof p !== "object" || p.medyalar || !Array.isArray(p.videolar)) return ham;
  const medyalar = p.videolar.map((v) => {
    const kod = String(v.kod);
    const aralik: Record<string, { ilk: number; say: number }> = {};
    for (const k of p.konular ?? []) if (k.video?.[kod]) aralik[k.no] = k.video[kod];
    return { id: kod, tur: "youtube", cesit: v.tur === "uzun-ozet" ? "uzun-anlatim" : v.tur, baslik: v.baslik, kaynak: v.yt, sure: v.sure ?? null, satirlar: v.satirlar, konuAraliklari: aralik };
  });
  const { videolar: _eski, ...kalan } = p as Record<string, unknown>;
  void _eski;
  return { ...kalan, medyalar };
}

export const PaketSemasi = z.preprocess(eskiyiCevir, PaketTemel).transform((p) => ({
  ...p,
  konular: p.konular.map((k) => ({
    ...k,
    video: Object.fromEntries(p.medyalar.flatMap((m) => (m.konuAraliklari[k.no] ? [[m.id, m.konuAraliklari[k.no]] as const] : []))),
  })),
}));
export type CalismaPaketi = z.output<typeof PaketSemasi>;

/** Index of the line playing at second `sn` (last line whose start is <= sn); -1 before the first. */
export function satirBul(satirlar: { bas: number }[], sn: number): number {
  let lo = 0;
  let hi = satirlar.length - 1;
  let sonuc = -1;
  while (lo <= hi) {
    const orta = (lo + hi) >> 1;
    if (satirlar[orta].bas <= sn + 0.05) {
      sonuc = orta;
      lo = orta + 1;
    } else hi = orta - 1;
  }
  return sonuc;
}

export function saatYaz(sn: number): string {
  const t = Math.max(0, Math.floor(sn));
  const d = Math.floor(t / 60);
  const s = t % 60;
  return `${d}:${String(s).padStart(2, "0")}`;
}
