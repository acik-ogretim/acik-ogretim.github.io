// Bundle written by scripts/calisma-odasi-paketle.mjs (src/data/calisma-odasi/<ders>.json), validated once on load.
import { z } from "zod";
import { CalismaSemasi } from "../konu/calisma";

export const KonuSemasi = z.object({
  no: z.string(),
  baslik: z.string(),
  unite: z.number(),
  sayfa: z.number(),
  html: z.string(),
  metin: z.string(),
  calisma: CalismaSemasi.optional(),
  video: z.object({ ilk: z.number(), say: z.number() }).nullable(),
});
export type CalismaKonu = z.infer<typeof KonuSemasi>;

export const SatirSemasi = z.object({
  i: z.number(),
  bas: z.number(),
  bit: z.number(),
  k: z.string(),
  m: z.string(),
  konu: z.string().nullable(),
  g: z.number(),
});
export type CalismaSatiri = z.infer<typeof SatirSemasi>;

export const KavramSemasi = z.object({ terim: z.string(), tanim: z.string(), konu: z.string(), kaynak: z.enum(["etkinlik", "kitap"]) });
export type CalismaKavrami = z.infer<typeof KavramSemasi>;

export const PaketSemasi = z.object({
  ders: z.string(),
  uni: z.string(),
  uretim: z.string(),
  video: z.object({ id: z.string(), url: z.string(), sure: z.number() }).nullable(),
  uniteler: z.array(z.object({ no: z.number(), baslik: z.string(), konular: z.array(z.string()) })),
  konular: z.array(KonuSemasi),
  satirlar: z.array(SatirSemasi),
  kavramlar: z.array(KavramSemasi),
  sorular: z.record(z.string(), z.array(z.string())),
});
export type CalismaPaketi = z.infer<typeof PaketSemasi>;

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
