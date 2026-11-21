// The question records of the unit files that are on the page, found again by card id (question-<unit>-<index>).
// The record details, the print topic headings and the discussion button read them instead of the DOM.
import type { SoruKaydi } from "./unite-verisi";
import type { KartBaglam } from "./soru-karti";

export interface DepoKaydi {
  q: SoruKaydi;
  baglam: KartBaglam;
  idx: number;
}

const depo = new Map<string, DepoKaydi>();

export const kartKimligi = (unit: number, idx: number): string => `question-${unit}-${idx}`;
export const depoyaYaz = (unit: number, idx: number, kayit: DepoKaydi): void => void depo.set(kartKimligi(unit, idx), kayit);
export const depodanBul = (kartId: string): DepoKaydi | undefined => depo.get(kartId);
export const depoyuBosalt = (): void => depo.clear();
