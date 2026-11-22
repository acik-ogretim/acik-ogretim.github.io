// Course question filters: one implementation shared by the quiz player (applies them to the list)
// and the "Süzgeç" sheet (previews how many questions a draft selection leaves).
import type { QuizSettings } from "./types";

export type SuzgecAyar = Pick<
  QuizSettings,
  "filterUnite" | "filterSource" | "filterExam" | "filterIncorrect" | "filterUnanswered"
>;

/** The fields of a question the filters look at (PlayerQuestion and the DOM cards both provide them). */
export type SuzulecekSoru = { id: string; unitNumber: number; source: string; sinavlar: string[] };

/** quiz-progress-<course>: question id -> last results (true = correct). */
export type Ilerleme = Record<string, boolean[]>;

export const VARSAYILAN_SUZGEC: SuzgecAyar = {
  filterUnite: "all",
  filterSource: "all",
  filterExam: "all",
  filterIncorrect: false,
  filterUnanswered: false,
};

export const SUZGEC_ANAHTARLARI = Object.keys(VARSAYILAN_SUZGEC) as (keyof SuzgecAyar)[];

/** True when any filter differs from "show everything". */
export const suzgecEtkin = (a: SuzgecAyar): boolean =>
  SUZGEC_ANAHTARLARI.some((k) => a[k] !== VARSAYILAN_SUZGEC[k]);

export const yanlisVar = (ilerleme: Ilerleme, id: string): boolean => (ilerleme[id] ?? []).includes(false);
export const cevaplanmamis = (ilerleme: Ilerleme, id: string): boolean => (ilerleme[id] ?? []).length === 0;

/** Middle unit used by the "first half" and "second half" choices (unit 0 is left out). */
/** toplam: dersin bilinen ünite sayısı (Anadolu kitap ünite listesi). Sorusu olmayan üniteler de yarıya sayılır:
 *  8 üniteli derste yalnız 1-4'ün sorusu varken yarılar 1-4 ve 5-8 olur. */
export function yariNoktasi(uniteler: number[], toplam = 0): { orta: number; son: number } {
  const gecerli = uniteler.filter((u) => u > 0);
  const son = Math.max(gecerli.length > 0 ? Math.max(...gecerli) : 0, toplam);
  return { orta: Math.ceil(son / 2), son };
}

export function suz<T extends SuzulecekSoru>(sorular: T[], a: SuzgecAyar, ilerleme: Ilerleme, toplam = 0): T[] {
  let sonuc = sorular;
  if (a.filterUnite !== "all") {
    const { orta } = yariNoktasi(sorular.map((q) => q.unitNumber), toplam);
    if (a.filterUnite === "first_half") sonuc = sonuc.filter((q) => q.unitNumber <= orta);
    else if (a.filterUnite === "second_half") sonuc = sonuc.filter((q) => q.unitNumber > orta);
    else {
      const hedef = Number.parseInt(a.filterUnite, 10);
      sonuc = sonuc.filter((q) => q.unitNumber === hedef);
    }
  }
  if (a.filterSource === "cikmis-soru") sonuc = sonuc.filter((q) => q.source === "cikmis-soru");
  else if (a.filterSource === "alistirma") sonuc = sonuc.filter((q) => q.source !== "cikmis-soru");
  if (a.filterExam && a.filterExam !== "all") sonuc = sonuc.filter((q) => q.sinavlar.includes(a.filterExam));
  if (a.filterIncorrect || a.filterUnanswered) {
    sonuc = sonuc.filter((q) => {
      const yanlis = yanlisVar(ilerleme, q.id);
      const bos = cevaplanmamis(ilerleme, q.id);
      if (a.filterIncorrect && a.filterUnanswered) return yanlis || bos;
      return a.filterIncorrect ? yanlis : bos;
    });
  }
  return sonuc;
}

/** Reads the filter fields from quiz-settings, falling back to the defaults for anything missing. */
export function suzgecOku(ham: string | null): SuzgecAyar {
  if (!ham) return { ...VARSAYILAN_SUZGEC };
  try {
    const veri = JSON.parse(ham) as Partial<Record<keyof SuzgecAyar, unknown>>;
    const kaynak = veri.filterSource;
    return {
      filterUnite: typeof veri.filterUnite === "string" ? veri.filterUnite : "all",
      filterSource: kaynak === "cikmis-soru" || kaynak === "alistirma" ? kaynak : "all",
      filterExam: typeof veri.filterExam === "string" ? veri.filterExam : "all",
      filterIncorrect: veri.filterIncorrect === true,
      filterUnanswered: veri.filterUnanswered === true,
    };
  } catch {
    return { ...VARSAYILAN_SUZGEC };
  }
}

/** Writes the filter fields into quiz-settings and keeps every other field as it was. */
export function suzgecYaz(ham: string | null, a: SuzgecAyar): string {
  let veri: Record<string, unknown> = {};
  try {
    veri = ham ? (JSON.parse(ham) as Record<string, unknown>) : {};
  } catch {
    veri = {};
  }
  return JSON.stringify({ ...veri, ...a });
}

const SINAV_ADI: Record<string, string> = {
  vize: "Vize",
  final: "Final",
  butunleme: "Bütünleme",
  "tek-ders": "Tek Ders",
  "yaz-okulu": "Yaz Okulu",
  "uc-ders": "Üç Ders",
  mezuniyet: "Mezuniyet",
  genel: "",
};

/** "2023 final" -> "2023 Final" (the key format of data-sinav). */
export function sinavEtiketi(anahtar: string): string {
  const [yil, tur] = anahtar.split(" ");
  return `${yil || "Yılı bilinmeyen"} ${SINAV_ADI[tur ?? ""] ?? tur ?? ""}`.trim();
}

/** Ders sayfasındaki data-toplam-unite özniteliği (yoksa 0). */
export function toplamUniteOku(): number {
  if (typeof document === "undefined") return 0;
  return Number(document.querySelector<HTMLElement>("[data-toplam-unite]")?.dataset.toplamUnite) || 0;
}
