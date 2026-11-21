// Study material generated per topic by the textbook pipeline (kitap/etkinlik/unite-NN.json, keyed by topic
// number; docs/konu-anlatimi.md stage 9) and merged into the topic file as `calisma`. Every field is optional:
// what the pipeline could not ground in the book stays absent, and the drawer renders nothing for it.
import { z } from "zod";

const metin = z.string().trim().min(1);

export const MiniTestSorusu = z.object({
  tur: z.enum(["coktan", "dogruYanlis", "bosluk"]),
  soru: metin,
  secenekler: z.array(metin).optional(),
  cevap: z.union([z.string(), z.boolean()]).transform((c) => String(c)),
  dayanak: z.string().optional(),
});
export type MiniTestSorusu = z.infer<typeof MiniTestSorusu>;

export const CalismaSemasi = z.object({
  ozet: metin.optional(),
  temelNoktalar: z.array(metin).optional(),
  kavramlar: z.array(z.object({ terim: metin, tanim: metin })).optional(),
  sebepSonuc: z.array(z.object({ sebep: metin, sonuc: metin })).optional(),
  ornek: metin.optional(),
  benzetme: metin.optional(),
  miniTest: z.array(MiniTestSorusu).optional(),
  tartisma: metin.optional(),
});
export type Calisma = z.infer<typeof CalismaSemasi>;

/** True when the record carries at least one non-empty field. */
export function calismaDolu(c: Calisma): boolean {
  return Object.values(c).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}

/**
 * Parses one unit's etkinlik file. Accepts { "1.1": {...} } or { konular: { "k-1.1": {...} } }.
 * Invalid or empty records are skipped silently, valid ones are returned by topic number.
 */
export function calismaCoz(ham: unknown): Map<string, Calisma> {
  const sonuc = new Map<string, Calisma>();
  if (!ham || typeof ham !== "object") return sonuc;
  const kayit = ham as Record<string, unknown>;
  const kaynak = kayit.konular && typeof kayit.konular === "object" ? (kayit.konular as Record<string, unknown>) : kayit;
  for (const [anahtar, deger] of Object.entries(kaynak)) {
    const no = anahtar.replace(/^k-/, "");
    const p = CalismaSemasi.safeParse(deger);
    if (p.success && calismaDolu(p.data)) sonuc.set(no, p.data);
  }
  return sonuc;
}
