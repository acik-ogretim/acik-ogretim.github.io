// Shapes of the offline records, validated with Zod wherever they are read from the network or the cache.
// The build integration writes the manifests; the page and the service worker read them. A broken record is
// treated as missing, never thrown at the learner.
import { z } from "zod";

/** /cevrimdisi-surum.json: shell version and one hash per university manifest. */
export const kokSurumSemasi = z.object({
  kabuk: z.string().min(1),
  olusturma: z.string(),
  uniler: z.record(z.object({ ad: z.string(), h: z.string() })),
});
export type KokSurum = z.infer<typeof kokSurumSemasi>;

/** One course in /cevrimdisi-surum/<uni>.json: [canonical path, content hash, bytes of everything downloaded]. */
export const dersSurumSemasi = z.tuple([z.string(), z.string(), z.number().nonnegative()]);
export const uniSurumSemasi = z.object({
  uni: z.string(),
  dersler: z.record(dersSurumSemasi),
});
export type UniSurum = z.infer<typeof uniSurumSemasi>;

/** Metadata record of a downloaded course, stored in the course cache at metaYolu(uni, ders). */
export const dersMetaSemasi = z.object({
  v: z.literal(1),
  uni: z.string(),
  ders: z.string(),
  ad: z.string(),
  uniAd: z.string().optional(),
  /** Canonical page path with trailing slash. */
  yol: z.string(),
  /** Content hash from the version manifest at download time; compared later to show "Güncelleme var". */
  hash: z.string(),
  /** Shell version the page's scripts belong to. */
  kabuk: z.string(),
  boyut: z.number().nonnegative(),
  /** ISO time the download finished (or started, while "yarim"). */
  tarih: z.string(),
  /** "yarim" while files are still coming in: a later download resumes and skips the stored ones. */
  durum: z.enum(["yarim", "tamam"]),
  /** Files stored in the course cache for this course (page, materials, chat data, images). */
  dosyalar: z.array(z.string()),
  /** Build assets the page needs, transitive imports included; kept in ao-varlik while this course is stored. */
  varliklar: z.array(z.string()),
});
export type DersMeta = z.infer<typeof dersMetaSemasi>;

/** What a download needs to know about a course before it starts. */
export type DersHedefi = { uni: string; ders: string; yol: string; hash: string; boyut: number; kabuk: string; ad?: string; uniAd?: string };

export function metaCoz(ham: unknown): DersMeta | null {
  const s = dersMetaSemasi.safeParse(ham);
  return s.success ? s.data : null;
}
