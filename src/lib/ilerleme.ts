// Progress figures computed from quiz-progress-<course> records only: each question keeps its last
// two results (true = correct) and no date, so no streak or time series can be derived from them.

export type Ilerleme = Record<string, unknown>;

export type Olcu = {
  /** Questions answered at least once. */
  cozulen: number;
  /** Answered questions whose latest answer was correct. */
  dogru: number;
  /** Share (0-100) of answered questions whose latest answer was correct. */
  oran: number;
  /** Questions whose last two answers were both correct. */
  ikiKez: number;
  /** Questions with a wrong answer among the last two (the "Yanlışlarım" filter). */
  tekrar: number;
};

export type DersOzeti = Olcu & { ders: string };

const sonuclar = (veri: Ilerleme): boolean[][] =>
  Object.values(veri).filter((r): r is boolean[] => Array.isArray(r) && r.length > 0 && r.every((x) => typeof x === "boolean"));

export function olc(veri: Ilerleme): Olcu {
  const s = sonuclar(veri);
  const dogru = s.filter((r) => r[r.length - 1]).length;
  return {
    cozulen: s.length,
    dogru,
    oran: s.length ? Math.round((dogru / s.length) * 100) : 0,
    ikiKez: s.filter((r) => r.length >= 2 && r[r.length - 1] && r[r.length - 2]).length,
    tekrar: s.filter((r) => r.includes(false)).length,
  };
}

/** Totals over every course plus one row per course with answers, most answered first. */
export function ilerlemeOzeti(kayitlar: { ders: string; veri: Ilerleme }[]): { toplam: Olcu; dersler: DersOzeti[] } {
  const dersler = kayitlar
    .map(({ ders, veri }) => ({ ders, ...olc(veri ?? {}) }))
    .filter((d) => d.cozulen > 0)
    .sort((a, b) => b.cozulen - a.cozulen);
  const cozulen = dersler.reduce((t, d) => t + d.cozulen, 0);
  const dogru = dersler.reduce((t, d) => t + d.dogru, 0);
  return {
    toplam: {
      cozulen,
      dogru,
      oran: cozulen ? Math.round((dogru / cozulen) * 100) : 0,
      ikiKez: dersler.reduce((t, d) => t + d.ikiKez, 0),
      tekrar: dersler.reduce((t, d) => t + d.tekrar, 0),
    },
    dersler,
  };
}
