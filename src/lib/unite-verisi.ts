// One card of the course page as stored in /veri/<uni>/<ders>/unite-<n>.json. The page draws its cards from these
// files in the browser (src/lib/soru-karti.ts); text, options and explanation stay HTML as in the source data.
// Browser code cannot import src/lib/schemas.ts (it reads astro:content), so the enum values are repeated here;
// unite-verisi.test.ts checks them against schemas.ts.
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
  source: z.enum(KAYNAKLAR),
  year: z.string().optional(),
  examType: z.enum(SINAV_TURLERI).optional(),
  sinavlar: z.array(z.object({ year: z.string(), examType: z.enum(SINAV_TURLERI), kitapcik: z.string().optional() })).optional(),
  kontrol: z.enum(["cevap-celiskisi", "sik-farkli", "kaynak-celiskili"]).optional(),
  /** Place in the older "most asked first" order, only when it differs from the card position (data-eski). */
  eski: z.number().optional(),
});
export type SoruKaydi = z.infer<typeof soruKaydiSchema>;

export const uniteVerisiSchema = z.object({
  unite: z.number(),
  baslik: z.string().optional(),
  /** Topic names (and their parents) used by this unit's questions, keyed by topic number. */
  konular: z.record(z.string(), z.string()),
  sorular: z.array(soruKaydiSchema),
});
export type UniteVerisi = z.infer<typeof uniteVerisiSchema>;
