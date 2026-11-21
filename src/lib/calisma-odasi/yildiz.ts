// Yıldızlı kavramlar: Çalışma odasında tanım balonundan yıldızlanan kavramlar, localStorage'da
// yildizli-kavramlar-<uni>-<ders> anahtarı altında. Kavram (terim + konu) kimliktir; paket yeniden üretilince de bulunur.
import { z } from "zod";

export const YILDIZ_ONEKI = "yildizli-kavramlar-";
export const yildizAnahtari = (uni: string, ders: string): string => `${YILDIZ_ONEKI}${uni}-${ders}`;

export const YildizSemasi = z.object({
  terim: z.string().min(1),
  konu: z.string().min(1),
  zaman: z.number().finite(),
});
export type Yildiz = z.infer<typeof YildizSemasi>;

export const yildizKimligi = (y: Pick<Yildiz, "terim" | "konu">): string => `${y.konu}|${y.terim}`;

export function yildizAyristir(ham: string | null): Yildiz[] {
  try {
    const h: unknown = JSON.parse(ham ?? "[]");
    if (!Array.isArray(h)) return [];
    const m = new Map<string, Yildiz>();
    for (const x of h) {
      const p = YildizSemasi.safeParse(x);
      if (p.success) m.set(yildizKimligi(p.data), p.data);
    }
    return [...m.values()];
  } catch {
    return [];
  }
}

export function yildizlariOku(uni: string, ders: string, depo: Pick<Storage, "getItem"> = localStorage): Yildiz[] {
  try {
    return yildizAyristir(depo.getItem(yildizAnahtari(uni, ders)));
  } catch {
    return [];
  }
}

export function yildizlariYaz(uni: string, ders: string, liste: Yildiz[], depo: Pick<Storage, "setItem" | "removeItem"> = localStorage): void {
  try {
    if (liste.length) depo.setItem(yildizAnahtari(uni, ders), JSON.stringify(liste));
    else depo.removeItem(yildizAnahtari(uni, ders));
  } catch {
    /* storage full or blocked: stars stay in memory for this visit */
  }
}

/** Backup merge (yedek.ts): union by concept, later star wins. */
export function yildizlariBirlestir(yerel: string, gelen: string): string {
  const m = new Map<string, Yildiz>();
  for (const y of [...yildizAyristir(yerel), ...yildizAyristir(gelen)]) {
    const var0 = m.get(yildizKimligi(y));
    if (!var0 || var0.zaman < y.zaman) m.set(yildizKimligi(y), y);
  }
  return JSON.stringify([...m.values()].sort((a, b) => a.zaman - b.zaman));
}
