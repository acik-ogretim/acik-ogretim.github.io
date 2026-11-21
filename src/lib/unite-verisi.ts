// What the browser reads from the course package (docs/veri-mimarisi.md): /ders/<uni>/<ders>/index.json for unit
// and topic names and /ders/<uni>/<ders>/unite/<n>.json for the questions of one unit. The full Zod schemas live in
// src/lib/ders-paketi/sema.ts, but that file pulls in schemas.ts (astro:content, server only), so browser code
// validates the fields it uses here. unite-verisi.test.ts checks these against the full schemas and schemas.ts.
import { z } from "zod";

export const KAYNAKLAR = ["soru-bankasi", "cikmis-soru", "deneme", "sorularla-ogrenelim", "unite-sonu"] as const;
export const SINAV_TURLERI = ["vize", "final", "butunleme", "tek-ders", "yaz-okulu", "uc-ders", "mezuniyet", "genel"] as const;

export const soruKaydiSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.object({ key: z.string(), text: z.string() })),
  correctAnswer: z.enum(["A", "B", "C", "D", "E", ""]),
  explanation: z.string().optional(),
  section: z.string().optional(),
  source: z.enum(KAYNAKLAR).default("soru-bankasi"),
  year: z.union([z.string(), z.number()]).optional(),
  examType: z.enum(SINAV_TURLERI).optional(),
  sinavlar: z.array(z.object({ year: z.string(), examType: z.enum(SINAV_TURLERI), kitapcik: z.string().optional() })).optional(),
  kontrol: z.enum(["cevap-celiskisi", "sik-farkli", "kaynak-celiskili"]).optional(),
  /** Topic id (the book number); equals `section`. */
  konu: z.string().optional(),
});
/** A question as the card template reads it. `eski` is set by the loader (place in the older order). */
export type SoruKaydi = Omit<z.infer<typeof soruKaydiSchema>, "year"> & { year?: string; eski?: number };

/** unite/<n>.json (UniteSorulari). Unit 0 holds the questions whose unit is not known yet. */
export const paketUniteSchema = z.object({
  v: z.literal(1),
  unite: z.number().int().nonnegative(),
  sorular: z.array(soruKaydiSchema),
});
export type PaketUnite = z.infer<typeof paketUniteSchema>;

/** index.json (DersDizini), the part the course page needs. */
export const paketDizinSchema = z.object({
  v: z.literal(1),
  uniteler: z.array(z.object({ no: z.number(), baslik: z.string() })),
  konular: z.array(z.object({ id: z.string(), no: z.string(), baslik: z.string() })),
});
export type PaketDizin = z.infer<typeof paketDizinSchema>;

/** Same paths as paketDosyalari in src/lib/ders-paketi/sema.ts (which browser code cannot import); the test compares them. */
export const paketAdresi = {
  dizin: (uni: string, ders: string): string => `/ders/${uni}/${ders}/index.json`,
  unite: (uni: string, ders: string, unite: number): string => `/ders/${uni}/${ders}/unite/${unite}.json`,
};
