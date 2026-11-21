// Window events shared by the quiz player (plain script) and the course page islands.

/** Fired whenever the current question changes; detail is SoruKonumu. */
export const SORU_KONUMU_OLAYI = "soru:konum";
/** Islands that hydrate late ask the player to fire SORU_KONUMU_OLAYI again. */
export const KONUM_ISTE_OLAYI = "soru:konum-iste";
/** Fired when reading/solving mode flips; detail is { cozme: boolean }. */
export const KIP_OLAYI = "kip:degisti";

export type SoruKonumu = {
  /** Unit of the current question, null when no question is visible. */
  unite: number | null;
  /** 1-based place inside the unit among the questions the filters leave. */
  sira: number;
  uniteToplam: number;
  index: number;
  toplam: number;
};

/** "Ü 4 · 12 / 40" ("Diğer" for unit 0). */
export const konumMetni = (k: SoruKonumu): string =>
  k.unite === null ? "" : `${k.unite === 0 ? "Diğer" : `Ü ${k.unite}`} · ${k.sira} / ${k.uniteToplam}`;
