// Question order on the course page ("Sırala" in the Süzgeç sheet). Pure functions shared by the page
// build (book order is the order the cards are rendered in) and the quiz player (other orders move the
// cards inside their unit). Units always keep their own order; only the questions inside a unit move.

export const SIRALAMALAR = ["kitap", "cikma", "yeni", "eski", "yanlis", "cozulmemis"] as const;
export type Siralama = (typeof SIRALAMALAR)[number];
export const VARSAYILAN_SIRALAMA: Siralama = "kitap";

export const SIRALAMA_ADI: Record<Siralama, string> = {
  kitap: "Kitap sırası",
  cikma: "En çok sorulan",
  yeni: "En yeni sınav",
  eski: "En eski sınav",
  yanlis: "Yanlışlarım önce",
  cozulmemis: "Çözmediklerim önce",
};

export const siralamaMi = (x: unknown): x is Siralama => typeof x === "string" && (SIRALAMALAR as readonly string[]).includes(x);

/** "1.7.4" -> [1, 7, 4]. A question without a topic number gets an empty key and sorts after numbered ones. */
export function bolumAnahtari(section: string | undefined | null): number[] {
  if (!section) return [];
  return section.split(/[^0-9]+/).filter(Boolean).map(Number);
}

/** Compares topic numbers part by part: 1.2 < 1.7.4 < 1.10 (never as text). Missing topic sorts last. */
export function bolumKarsilastir(a: string | undefined | null, b: string | undefined | null): number {
  const x = bolumAnahtari(a);
  const y = bolumAnahtari(b);
  if (x.length === 0 || y.length === 0) return (x.length === 0 ? 1 : 0) - (y.length === 0 ? 1 : 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    // A parent topic (1.7) comes before its children (1.7.4)
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/** Book order of one unit's questions: topic number, then the order of the source file (stable sort). */
export function kitapSirala<T extends { section?: string }>(sorular: readonly T[]): T[] {
  return [...sorular].sort((a, b) => bolumKarsilastir(a.section, b.section));
}

// Exam kinds in calendar order inside one academic year
const SINAV_SIRASI: Record<string, number> = {
  vize: 1,
  final: 2,
  butunleme: 3,
  "tek-ders": 4,
  "uc-ders": 4,
  "yaz-okulu": 5,
  mezuniyet: 6,
  genel: 0,
};

/** "2024-2025 final" -> 2024 * 10 + 2. Unknown year -> 0 (oldest). Keys are the data-sinav format. */
export function sinavDegeri(anahtar: string): number {
  const [yil, tur] = anahtar.split(" ");
  const y = Number.parseInt((yil ?? "").slice(0, 4), 10);
  return (Number.isFinite(y) ? y : 0) * 10 + (SINAV_SIRASI[tur ?? ""] ?? 0);
}

export type SiralanacakSoru = {
  /** Persistent question key (see calisma-durumu.ts). */
  anahtar: string;
  unitNumber: number;
  /** data-sinav keys: one per distinct exam the question appeared in. */
  sinavlar: readonly string[];
  /** Position in book order across the page (the rendered order). */
  sira: number;
};

export type SiralamaBaglami = {
  /** A wrong answer is recorded (current answer or one of the last two results). */
  yanlis: (anahtar: string) => boolean;
  /** The question has an answer on screen right now. */
  cozuldu: (anahtar: string) => boolean;
};

const BOS_BAGLAM: SiralamaBaglami = { yanlis: () => false, cozuldu: () => false };

function karsilastirici(secim: Siralama, b: SiralamaBaglami): (x: SiralanacakSoru, y: SiralanacakSoru) => number {
  const enYeni = (q: SiralanacakSoru) => (q.sinavlar.length ? Math.max(...q.sinavlar.map(sinavDegeri)) : -1);
  const enEski = (q: SiralanacakSoru) => (q.sinavlar.length ? Math.min(...q.sinavlar.map(sinavDegeri)) : Number.MAX_SAFE_INTEGER);
  switch (secim) {
    case "cikma":
      return (x, y) => y.sinavlar.length - x.sinavlar.length;
    case "yeni":
      return (x, y) => enYeni(y) - enYeni(x);
    case "eski":
      return (x, y) => enEski(x) - enEski(y);
    case "yanlis":
      return (x, y) => Number(b.yanlis(y.anahtar)) - Number(b.yanlis(x.anahtar));
    case "cozulmemis":
      return (x, y) => Number(b.cozuldu(x.anahtar)) - Number(b.cozuldu(y.anahtar));
    case "kitap":
      return () => 0;
  }
}

/**
 * Orders the questions for display. Units stay in the order they first appear in; inside a unit the
 * chosen order applies and ties keep book order. Returns a new array.
 */
export function sirala<T extends SiralanacakSoru>(sorular: readonly T[], secim: Siralama, baglam: SiralamaBaglami = BOS_BAGLAM): T[] {
  const uniteSirasi = new Map<number, number>();
  for (const q of sorular) if (!uniteSirasi.has(q.unitNumber)) uniteSirasi.set(q.unitNumber, uniteSirasi.size);
  const k = karsilastirici(secim, baglam);
  return [...sorular].sort(
    (x, y) =>
      (uniteSirasi.get(x.unitNumber) ?? 0) - (uniteSirasi.get(y.unitNumber) ?? 0) || k(x, y) || x.sira - y.sira,
  );
}

// ---- Stored choice: one order per course ----

export const SIRALAMA_ANAHTARI = "soru-siralama";

/** soru-siralama: { "<uni>/<ders>": Siralama }. */
export function siralamaOku(ham: string | null, ders: string): Siralama {
  try {
    const v = ham ? (JSON.parse(ham) as Record<string, unknown>) : {};
    const s = v && typeof v === "object" ? v[ders] : undefined;
    return siralamaMi(s) ? s : VARSAYILAN_SIRALAMA;
  } catch {
    return VARSAYILAN_SIRALAMA;
  }
}

export function siralamaYaz(ham: string | null, ders: string, secim: Siralama): string {
  let v: Record<string, unknown> = {};
  try {
    const o = ham ? (JSON.parse(ham) as unknown) : {};
    if (o && typeof o === "object" && !Array.isArray(o)) v = o as Record<string, unknown>;
  } catch {
    v = {};
  }
  if (secim === VARSAYILAN_SIRALAMA) delete v[ders];
  else v[ders] = secim;
  return JSON.stringify(v);
}
