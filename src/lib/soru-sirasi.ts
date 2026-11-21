import type { Question } from "./types";

/** The fields the order reads: card data from the course package works as well as a full Question. */
export type SiralanirSoru = Pick<Question, "source" | "section"> & { sinavlar?: readonly unknown[] };

// How many exams a question appeared in (0 for practice questions).
export function cikmaSayisi(q: SiralanirSoru): number {
  if (q.source !== "cikmis-soru") return 0;
  return Math.max(q.sinavlar?.length ?? 0, 1);
}

// "1.2.5" -> [1, 2, 5]; missing section sorts after numbered ones.
function bolumAnahtari(section: string | undefined): number[] {
  if (!section) return [Number.MAX_SAFE_INTEGER];
  return section.split(/[^0-9]+/).filter(Boolean).map(Number);
}

function bolumKarsilastir(a: string | undefined, b: string | undefined): number {
  const x = bolumAnahtari(a);
  const y = bolumAnahtari(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

// Order within a unit: most frequently asked exam questions first, then the other exam
// questions, then practice questions; within the same rank, by section (1.2.5) and
// otherwise by the original file order (sorting is stable).
export function soruSirala<T extends SiralanirSoru>(sorular: readonly T[]): T[] {
  return [...sorular].sort(
    (a, b) =>
      cikmaSayisi(b) - cikmaSayisi(a) ||
      bolumKarsilastir(a.section, b.section),
  );
}
