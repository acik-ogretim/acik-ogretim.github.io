// Course package ("ders paketi"): the single static JSON layout every consumer reads
// (course page, study room, offline download, print, Quiz Time import, MCP/WebMCP tools).
// Layout and rules: docs/veri-mimarisi.md. Files are written at build time under
//   /ders/<uni>/<ders>/index.json        DersDizini      (small: tree, counts, media list, file list)
//   /ders/<uni>/<ders>/konu/<id>.json    KonuDosyasi     (book text + study material + links)
//   /ders/<uni>/<ders>/unite/<n>.json    UniteSorulari   (full questions of one unit)
//   /ders/<uni>/<ders>/kavramlar.json    KavramSozlugu   (concepts with backlinks)
//   /ders/<uni>/<ders>/medya/<id>.json   MedyaDokumu     (timed transcript of one video or audio)
// Ids: topic id = book number ("1.3.2"), unit = number, concept id = slug of the term, media id = short slug.
import { z } from "zod";
import { CalismaSemasi } from "../konu/calisma";
import { questionSchema } from "../schemas";

export const PAKET_SURUMU = 1;

const id = z.string().trim().min(1);
const saniye = z.number().nonnegative();

/** Where a topic is covered in one media item. A topic may appear in several media and several times in one. */
export const MedyaAniSemasi = z.object({ medya: id, bas: saniye, bit: saniye });
export type MedyaAni = z.infer<typeof MedyaAniSemasi>;

export const MedyaCesitleri = ["kisa-ozet", "uzun-anlatim", "soru-cozum", "diger"] as const;
export const MedyaSemasi = z.object({
  id,
  tur: z.enum(["youtube", "ses"]),
  cesit: z.enum(MedyaCesitleri),
  baslik: z.string(),
  /** YouTube video id, or an absolute https URL of the audio file. */
  kaynak: z.string(),
  sure: saniye.nullable(),
  /** Set when the media covers one unit (e.g. long narration per unit). */
  unite: z.number().int().positive().optional(),
  /** Relative path of the MedyaDokumu file, absent when there is no transcript. */
  dokum: z.string().optional(),
});
export type Medya = z.infer<typeof MedyaSemasi>;

export const KonuOzetiSemasi = z.object({
  id,
  no: z.string(),
  baslik: z.string(),
  unite: z.number().int().positive(),
  /** Parent topic id ("1.3" for "1.3.2"); absent for top-level topics. */
  ust: z.string().optional(),
  sayfa: z.number().int().nonnegative().optional(),
  soruSayisi: z.number().int().nonnegative(),
  kavramSayisi: z.number().int().nonnegative(),
  /** True when study material exists (otherwise the book text is shown). */
  calismaVar: z.boolean(),
  medyaAnlari: z.array(MedyaAniSemasi),
});
export type KonuOzeti = z.infer<typeof KonuOzetiSemasi>;

export const DersDiziniSemasi = z.object({
  v: z.literal(PAKET_SURUMU),
  uni: id,
  ders: id,
  ad: z.string(),
  kod: z.string().optional(),
  donem: z.number().int().optional(),
  /** Content hash of every file in the package; offline copies compare it. */
  surum: z.string(),
  uretim: z.string(),
  uniteler: z.array(
    z.object({ no: z.number().int().positive(), baslik: z.string(), konular: z.array(id), soruSayisi: z.number().int().nonnegative() }),
  ),
  /** Topics in book order. */
  konular: z.array(KonuOzetiSemasi),
  medyalar: z.array(MedyaSemasi),
  /** Every file of the package relative to the package root, with byte size (offline download list). */
  dosyalar: z.array(z.object({ yol: z.string(), boyut: z.number().int().nonnegative() })),
});
export type DersDizini = z.infer<typeof DersDiziniSemasi>;

export const KonuDosyasiSemasi = z.object({
  v: z.literal(PAKET_SURUMU),
  id,
  no: z.string(),
  baslik: z.string(),
  unite: z.number().int().positive(),
  ust: z.string().optional(),
  onceki: id.nullable(),
  sonraki: id.nullable(),
  /** Book text of the topic (sanitised HTML) and its page in the book. */
  kitap: z.object({ html: z.string(), sayfa: z.number().int().nonnegative().optional() }),
  /** Study material (free-length lists, every field optional). */
  calisma: CalismaSemasi.optional(),
  /** Concept ids defined or used in this topic (resolve in kavramlar.json). */
  kavramlar: z.array(id),
  /** Question ids of this topic (resolve in unite/<n>.json). */
  sorular: z.array(id),
  medyaAnlari: z.array(MedyaAniSemasi),
  /** Related topics (same concept, prerequisite, continuation). */
  baglantilar: z.array(z.object({ konu: id, neden: z.enum(["kavram", "oncul", "devam", "benzer"]) })),
});
export type KonuDosyasi = z.infer<typeof KonuDosyasiSemasi>;

/** A question of the bank plus the topic it belongs to. */
export const PaketSorusuSemasi = questionSchema.and(z.object({ konu: id.optional() }));
export type PaketSorusu = z.infer<typeof PaketSorusuSemasi>;

export const UniteSorulariSemasi = z.object({
  v: z.literal(PAKET_SURUMU),
  /** 0 holds the questions whose unit is not known yet (listed after the numbered units). */
  unite: z.number().int().nonnegative(),
  sorular: z.array(PaketSorusuSemasi),
});
export type UniteSorulari = z.infer<typeof UniteSorulariSemasi>;

export const KavramSemasi = z.object({
  id,
  terim: z.string(),
  tanim: z.string(),
  /** Topic where the concept is defined. */
  konu: id,
  /** Every topic that uses it (backlinks), defining topic included. */
  konular: z.array(id),
  kaynak: z.enum(["etkinlik", "kitap"]),
});
export type Kavram = z.infer<typeof KavramSemasi>;

export const KavramSozluguSemasi = z.object({ v: z.literal(PAKET_SURUMU), kavramlar: z.array(KavramSemasi) });
export type KavramSozlugu = z.infer<typeof KavramSozluguSemasi>;

export const DokumSatiriSemasi = z.object({
  bas: saniye,
  bit: saniye,
  konusmaci: z.string(),
  metin: z.string(),
  /** Topic id of the line; null only when the line is an intro or outro. */
  konu: id.nullable(),
  /** 0..1 confidence of the topic assignment. */
  guven: z.number().min(0).max(1),
  /** Question id when the line reads or solves a question (question videos). */
  soru: id.optional(),
});
export type DokumSatiri = z.infer<typeof DokumSatiriSemasi>;

export const MedyaDokumuSemasi = z.object({ v: z.literal(PAKET_SURUMU), medya: id, satirlar: z.array(DokumSatiriSemasi) });
export type MedyaDokumu = z.infer<typeof MedyaDokumuSemasi>;

/** URL helpers: one place builds every path of the package. */
export const paketYolu = (uni: string, ders: string) => `/ders/${uni}/${ders}/`;
export const paketDosyalari = {
  dizin: (uni: string, ders: string) => `${paketYolu(uni, ders)}index.json`,
  konu: (uni: string, ders: string, konu: string) => `${paketYolu(uni, ders)}konu/${konu}.json`,
  unite: (uni: string, ders: string, unite: number) => `${paketYolu(uni, ders)}unite/${unite}.json`,
  kavramlar: (uni: string, ders: string) => `${paketYolu(uni, ders)}kavramlar.json`,
  medya: (uni: string, ders: string, medya: string) => `${paketYolu(uni, ders)}medya/${medya}.json`,
};

/** Slug used for concept and media ids (Turkish letters folded, spaces to dashes). */
export function kimlikYap(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
