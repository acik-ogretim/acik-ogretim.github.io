// Chat history: every course keeps a list of conversations in localStorage. The messages themselves are stored by
// TanStack AI's localStoragePersistence under `tanstack-ai:<threadId>`; this index only names and orders them.
// The first conversation of a course keeps the old thread id `sohbet:<course>` so chats saved before the history
// existed still open.

export type Konusma = { id: string; baslik: string; guncel: number };

const ANAHTAR = "sohbet-gecmis";
const MESAJ_ONEK = "tanstack-ai:";

export function threadId(courseKey: string | null, id: string): string {
  const ders = courseKey ?? "genel";
  return id ? `sohbet:${ders}:${id}` : `sohbet:${ders}`;
}

type Dizin = Record<string, Konusma[]>;

function oku(): Dizin {
  try {
    const d = JSON.parse(localStorage.getItem(ANAHTAR) ?? "{}");
    return d && typeof d === "object" ? (d as Dizin) : {};
  } catch {
    return {};
  }
}

function yaz(d: Dizin) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(d));
  } catch {
    /* storage full or blocked: history just isn't kept */
  }
}

/** Newest first. Includes the pre-history conversation if it has messages. */
export function listele(courseKey: string | null): Konusma[] {
  const ders = courseKey ?? "genel";
  const liste = [...(oku()[ders] ?? [])];
  if (!liste.some((k) => k.id === "")) {
    try {
      if (localStorage.getItem(MESAJ_ONEK + threadId(courseKey, ""))) liste.push({ id: "", baslik: "Önceki sohbet", guncel: 0 });
    } catch {
      /* ignore */
    }
  }
  return liste.sort((a, b) => b.guncel - a.guncel);
}

export function yeniKimlik(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Records that a conversation was used; the first user message becomes its title. */
export function kaydet(courseKey: string | null, id: string, ilkMesaj?: string) {
  const ders = courseKey ?? "genel";
  const d = oku();
  const liste = d[ders] ?? [];
  const k = liste.find((x) => x.id === id);
  const baslik = basligaCevir(ilkMesaj);
  const simdi = Math.max(Date.now(), ...liste.map((x) => x.guncel + 1)); // strictly newer, even within one millisecond
  if (k) {
    k.guncel = simdi;
    if (baslik && (k.baslik === "Yeni sohbet" || k.baslik === "Önceki sohbet")) k.baslik = baslik;
  } else {
    liste.push({ id, baslik: baslik || (id ? "Yeni sohbet" : "Önceki sohbet"), guncel: simdi });
  }
  d[ders] = liste;
  yaz(d);
}

export function sil(courseKey: string | null, id: string) {
  const ders = courseKey ?? "genel";
  const d = oku();
  d[ders] = (d[ders] ?? []).filter((k) => k.id !== id);
  yaz(d);
  try {
    localStorage.removeItem(MESAJ_ONEK + threadId(courseKey, id));
  } catch {
    /* ignore */
  }
}

export function basligaCevir(metin?: string): string {
  const t = (metin ?? "").replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
}
