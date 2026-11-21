// Runtime check for the topic files the drawer fetches (public/konu/<uni>/<course>/<no>.json).
import { z } from "zod";
import { CalismaSemasi } from "./calisma";

const ref = z.object({ no: z.string(), baslik: z.string() });

export const KonuSemasi = z.object({
  id: z.string(),
  no: z.string(),
  baslik: z.string(),
  unite: z.number(),
  sayfa: z.number(),
  html: z.string(),
  metin: z.string(),
  kavramlar: z.array(z.string()).default([]),
  baglantilar: z.array(z.string()).default([]),
  calisma: CalismaSemasi.optional(),
  onceki: ref.nullable(),
  sonraki: ref.nullable(),
});
export type Konu = z.infer<typeof KonuSemasi>;

export const IndeksSemasi = z.object({
  uniteler: z.array(
    z.object({
      no: z.number(),
      baslik: z.string(),
      konular: z.array(z.object({ no: z.string(), baslik: z.string(), sayfa: z.number() })),
    }),
  ),
});
export type Indeks = z.infer<typeof IndeksSemasi>;
