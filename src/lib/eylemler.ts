// Single action registry for the course page: the player bar, the menu drawer and the keyboard shortcuts
// all read from here. The user's bar selection lives in localStorage (carried by /yedek).
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Flag,
  Gauge,
  Hash,
  LayoutGrid,
  List,
  MessageCircle,
  Mic,
  Play,
  RefreshCw,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  SunMoon,
  Route,
  Volume2,
  type IconNode,
} from "lucide";

export type Eylem = {
  id: string;
  etiket: string;
  simge: IconNode;
  /** Shown as a small hint next to the label on desktop. */
  kisayol?: string;
  /** Key matched by the global listener (event.key, no modifiers). */
  tus?: string;
  /** Id of the button that already exists in the player bar markup. */
  yerel?: string;
  /** Only drawn on the bar at 768 px and wider; below that it lives in the menu. */
  genisBar?: boolean;
  /** Menu sub view opened instead of running something. */
  altGorunum?: "unite" | "soru";
  /** Menu stays open after the tap (the theme cycles in place). */
  acikKalir?: boolean;
  /** Dynamic label (theme name). */
  etiketi?: () => string;
  calistir: () => void;
};

export const MENU_ACMA_OLAYI = "mobil-menu:ac";

const TEMALAR = ["dark", "light", "sepia"] as const;
const TEMA_AD: Record<string, string> = { dark: "Koyu", light: "Açık", sepia: "Sepya" };

const sayfa = () =>
  window as unknown as { setTheme?: (t: string) => void; openQuizSettings?: () => void };
const davranis = (): ScrollBehavior =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const tikla = (secici: string) => document.querySelector<HTMLElement>(secici)?.click();
// Guarded: the menu renders on the server too.
const temaOku = () =>
  typeof document === "undefined" ? "dark" : (document.documentElement.getAttribute("data-theme") ?? "dark");

export const basaDon = () => window.scrollTo({ top: 0, behavior: davranis() });
export const sonaGit = () =>
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: davranis() });

export const menuAc = (gorunum: "ana" | "unite" | "soru" = "ana") =>
  window.dispatchEvent(new CustomEvent(MENU_ACMA_OLAYI, { detail: { gorunum } }));

export const temaDegistir = () => {
  const simdiki = temaOku() as (typeof TEMALAR)[number];
  const yeni = TEMALAR[(TEMALAR.indexOf(simdiki) + 1) % TEMALAR.length];
  sayfa().setTheme?.(yeni);
};

/** Every action, in the order the menu lists them. The menu button itself is fixed and not part of this list. */
export const EYLEMLER: Eylem[] = [
  { id: "seslendir", etiket: "Sesli okuma modu", simge: Volume2, yerel: "btn-toggle-reader", calistir: () => tikla("#btn-toggle-reader") },
  { id: "hiz", etiket: "Okuma hızı", simge: Gauge, yerel: "btn-speed", genisBar: true, acikKalir: true, calistir: () => tikla("#btn-speed") },
  { id: "coz", etiket: "İnteraktif çözüm", simge: Play, yerel: "btn-toggle-interactive", calistir: () => tikla("#btn-toggle-interactive") },
  { id: "geri", etiket: "Önceki soru", simge: SkipBack, yerel: "btn-prev", calistir: () => tikla("#btn-prev") },
  { id: "ileri", etiket: "Sonraki soru", simge: SkipForward, yerel: "btn-next", calistir: () => tikla("#btn-next") },
  { id: "soruyu-oku", etiket: "Soruyu oku", simge: Mic, yerel: "btn-read-question", calistir: () => tikla("#btn-read-question") },
  { id: "aciklamayi-oku", etiket: "Açıklamayı oku", simge: BookOpen, yerel: "btn-read-explanation", calistir: () => tikla("#btn-read-explanation") },
  { id: "durdur", etiket: "Okumayı durdur", simge: Square, yerel: "btn-stop-speech", calistir: () => tikla("#btn-stop-speech") },
  { id: "ayarlar", etiket: "Ayarlar", simge: Settings, yerel: "btn-open-settings", calistir: () => sayfa().openQuizSettings?.() },
  { id: "ara", etiket: "Ara", simge: Search, kisayol: "Ctrl K", calistir: () => tikla("#toggleSearch") },
  { id: "basa-don", etiket: "Başa dön", simge: ArrowUp, kisayol: "Home", tus: "Home", calistir: basaDon },
  { id: "sona-git", etiket: "Sona git", simge: ArrowDown, kisayol: "End", tus: "End", calistir: sonaGit },
  { id: "unite", etiket: "Üniteye git", simge: List, altGorunum: "unite", calistir: () => menuAc("unite") },
  { id: "soru", etiket: "Soruya git", simge: Hash, altGorunum: "soru", calistir: () => menuAc("soru") },
  { id: "sohbet", etiket: "Sohbet asistanı", simge: MessageCircle, calistir: () => tikla("#sohbet-ac") },
  { id: "yedek", etiket: "Kayıtlarını taşı", simge: RefreshCw, calistir: () => location.assign("/yedek") },
  { id: "hata", etiket: "Hata bildir", simge: Flag, calistir: () => tikla("[data-tartisma]") },
  { id: "tur", etiket: "Turu yeniden göster", simge: Route, calistir: () => window.dispatchEvent(new CustomEvent("tur:baslat")) },
  {
    id: "tema",
    etiket: "Tema",
    simge: SunMoon,
    acikKalir: true,
    etiketi: () => `Tema: ${TEMA_AD[temaOku()] ?? temaOku()}`,
    calistir: temaDegistir,
  },
];

/** The menu button: always last on the bar, never removable. */
export const MENU_EYLEMI = { id: "menu", etiket: "Menü", simge: LayoutGrid, kisayol: "M", tus: "m" } as const;

export const EYLEM_HARITASI = new Map(EYLEMLER.map((e) => [e.id, e]));

// ---- Bar selection ----

export const VARSAYILAN_CUBUK: readonly string[] = [
  "seslendir",
  "hiz",
  "coz",
  "geri",
  "soruyu-oku",
  "aciklamayi-oku",
  "durdur",
  "ileri",
  "ayarlar",
];

export const DEPO_ANAHTARI = "cubuk-duzeni";
export const CUBUK_OLAYI = "cubuk:degisti";

/** Keeps known ids once each, in order; anything else is dropped. */
export function temizle(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...VARSAYILAN_CUBUK];
  const gorulen = new Set<string>();
  const sonuc: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && EYLEM_HARITASI.has(id) && !gorulen.has(id)) {
      gorulen.add(id);
      sonuc.push(id);
    }
  }
  return sonuc;
}

export function cubukOku(): string[] {
  try {
    const ham = localStorage.getItem(DEPO_ANAHTARI);
    if (!ham) return [...VARSAYILAN_CUBUK];
    const veri = JSON.parse(ham) as { v?: number; ids?: unknown };
    return veri?.v === 1 ? temizle(veri.ids) : [...VARSAYILAN_CUBUK];
  } catch {
    return [...VARSAYILAN_CUBUK];
  }
}

export function cubukYaz(ids: string[]): void {
  const temiz = temizle(ids);
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify({ v: 1, ids: temiz }));
  } catch {
    // Private mode or full storage: the in-memory change below still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent(CUBUK_OLAYI, { detail: temiz }));
}

export function cubukSifirla(): void {
  try {
    localStorage.removeItem(DEPO_ANAHTARI);
  } catch {
    // Nothing stored that we could remove.
  }
  window.dispatchEvent(new CustomEvent(CUBUK_OLAYI, { detail: [...VARSAYILAN_CUBUK] }));
}

// ---- Keyboard shortcuts ----

const yaziAlani = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Starts the global shortcut listener (M, Home, End). Returns a cleanup function. */
export function kisayollariBagla(): () => void {
  const dinle = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (yaziAlani(e.target)) return;
    // Another modal (settings, chat) is open: leave the keys to it.
    if (document.querySelector("[role='dialog'][aria-modal='true'], [data-base-ui-inert]")) return;
    const tus = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (tus === MENU_EYLEMI.tus) {
      e.preventDefault();
      menuAc();
      return;
    }
    const eylem = EYLEMLER.find((x) => x.tus === tus);
    if (eylem) {
      e.preventDefault();
      eylem.calistir();
    }
  };
  window.addEventListener("keydown", dinle);
  return () => window.removeEventListener("keydown", dinle);
}
