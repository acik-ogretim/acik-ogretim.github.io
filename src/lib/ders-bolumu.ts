// A course shared by many departments has one page under its canonical department (see kanonik.ts).
// The back link must still lead to the department the learner came from: the redirect page adds
// ?bolum=<id>, and the choice is remembered per course so later visits (home page "kaldığın yer",
// Derslerim, search) go back to the same department.

export const DERS_BOLUMU_ANAHTARI = "ders-bolumu";

export type DersBolumu = { id: string; ad: string };

function oku(anahtar: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(anahtar) ?? "null");
  } catch {
    return null;
  }
}

/** The department the back link should open. Order: ?bolum, remembered choice, a starred department, the page's own. */
export function geriBolumu(uni: string, ders: string, bolumler: DersBolumu[], varsayilan: DersBolumu, arama: string): DersBolumu {
  const bul = (id: unknown) => (typeof id === "string" ? bolumler.find((b) => b.id === id) : undefined);
  const anahtar = `${uni}/${ders}`;
  const hafiza = oku(DERS_BOLUMU_ANAHTARI);
  const kayitlar: Record<string, string> = hafiza && typeof hafiza === "object" ? (hafiza as Record<string, string>) : {};

  const istenen = bul(new URLSearchParams(arama).get("bolum"));
  if (istenen) {
    if (kayitlar[anahtar] !== istenen.id) {
      try {
        localStorage.setItem(DERS_BOLUMU_ANAHTARI, JSON.stringify({ ...kayitlar, [anahtar]: istenen.id }));
      } catch {
        // Storage blocked: the link still works for this visit.
      }
    }
    return istenen;
  }
  const hatirlanan = bul(kayitlar[anahtar]);
  if (hatirlanan) return hatirlanan;
  const yildizli = oku("favorite-departments");
  if (Array.isArray(yildizli)) for (const id of yildizli) { const b = bul(id); if (b) return b; }
  return varsayilan;
}
