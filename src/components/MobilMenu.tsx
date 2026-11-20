// Phone chrome for the course page: a headroom top bar (hides while scrolling down, returns on the way
// up) and a bottom action drawer that holds everything the player bar has no room for.
import { Drawer } from "@base-ui/react/drawer";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Flag,
  Hash,
  LayoutGrid,
  List,
  MessageCircle,
  Mic,
  RefreshCw,
  Search,
  Settings,
  Square,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Unite = { no: number; ad: string; baslik?: string; soru: number };
type Gorunum = "ana" | "unite" | "soru";

const TEMALAR = ["dark", "light", "sepia"] as const;
const TEMA_AD: Record<string, string> = { dark: "Koyu", light: "Açık", sepia: "Sepya" };
// Page helpers defined by the layout script, typed here instead of widening Window.
const sayfa = () => window as unknown as { setTheme?: (t: string) => void; openQuizSettings?: () => void };

const davranis = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const basaDon = () => window.scrollTo({ top: 0, behavior: davranis() });
const sonaGit = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: davranis() });
const uniteyeGit = (no: number) =>
  document.getElementById(`unite-${no}`)?.scrollIntoView({ block: "start", behavior: davranis() });
const soruyaGit = (no: number, sira: number) =>
  document.getElementById(`question-${no}-${sira - 1}`)?.scrollIntoView({ block: "start", behavior: davranis() });
const tikla = (secici: string) => document.querySelector<HTMLElement>(secici)?.click();
const temaOku = () => document.documentElement.getAttribute("data-theme") ?? "dark";

const odak = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]";

function SimgeDugmesi({ etiket, onClick, children }: { etiket: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiket}
      title={etiket}
      onClick={onClick}
      className={`size-11 shrink-0 grid place-items-center rounded-lg text-muted-theme active:bg-[var(--button-bg-hover)] ${odak}`}
    >
      {children}
    </button>
  );
}

type KutuProps = { simge: LucideIcon; etiket: string; onClick?: () => void; href?: string; ilk?: boolean; dar?: boolean };

function Kutu({ simge: Simge, etiket, onClick, href, ilk, dar }: KutuProps) {
  const sinif = `flex min-h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-theme bg-[var(--button-bg)] px-1.5 py-2 text-theme transition-transform active:scale-[0.97] motion-reduce:transition-none ${odak} ${dar ? "md:hidden" : ""}`;
  const icerik = (
    <>
      <Simge className="size-6" aria-hidden />
      <span className="line-clamp-2 text-center text-xs font-medium leading-tight">{etiket}</span>
    </>
  );
  const ilkOznitelik = ilk ? { "data-ilk": "" } : {};
  return href ? (
    <a href={href} className={sinif} {...ilkOznitelik}>
      {icerik}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={sinif} {...ilkOznitelik}>
      {icerik}
    </button>
  );
}

export default function MobilMenu({ dersAdi, uniteler }: { dersAdi: string; uniteler: Unite[] }) {
  const [gorunur, setGorunur] = useState(false);
  const [aktif, setAktif] = useState<number>(uniteler[0]?.no ?? 0);
  const [acik, setAcik] = useState(false);
  const [gorunum, setGorunum] = useState<Gorunum>("ana");
  const [tema, setTema] = useState("dark");
  const [secili, setSecili] = useState<number>(uniteler[0]?.no ?? 0);
  const [sira, setSira] = useState("");
  const [hata, setHata] = useState(false);
  const kap = useRef<HTMLDivElement>(null);
  const beklenen = useRef<(() => void) | null>(null);

  // Headroom: hidden near the top and while scrolling down, shown while scrolling up.
  useEffect(() => {
    let son = scrollY;
    let bekliyor = false;
    const guncelle = () => {
      bekliyor = false;
      const y = scrollY;
      const fark = y - son;
      if (y < 200) setGorunur(false);
      else if (fark < -8) setGorunur(true);
      else if (fark > 8) setGorunur(false);
      if (Math.abs(fark) > 8) son = y;
      let simdiki: number | undefined;
      for (const el of document.querySelectorAll<HTMLElement>(".unit-separator")) {
        if (el.getBoundingClientRect().top <= 160) simdiki = Number(el.dataset.unit);
      }
      if (simdiki !== undefined) setAktif(simdiki);
    };
    const olay = () => {
      if (!bekliyor) {
        bekliyor = true;
        requestAnimationFrame(guncelle);
      }
    };
    addEventListener("scroll", olay, { passive: true });
    guncelle();
    return () => removeEventListener("scroll", olay);
  }, []);

  // Lets the page shift its sticky unit navigation while the top bar is out.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-ustcubuk", gorunur);
  }, [gorunur]);

  // The player bar opens the drawer through a window event (it is plain Astro markup).
  useEffect(() => {
    const ac = () => {
      setGorunum("ana");
      setAcik(true);
    };
    addEventListener("mobil-menu:ac", ac);
    return () => removeEventListener("mobil-menu:ac", ac);
  }, []);

  useEffect(() => {
    if (acik) {
      setTema(temaOku());
      setSecili(aktif);
    }
  }, [acik]);

  // Keep focus on the first control of whichever view is showing.
  useEffect(() => {
    if (acik) requestAnimationFrame(() => kap.current?.querySelector<HTMLElement>("[data-ilk]")?.focus());
  }, [gorunum, acik]);

  // Actions run after the exit animation so the page scroll lock is gone and the next drawer can open.
  const calistir = (is: () => void) => {
    beklenen.current = is;
    setAcik(false);
  };

  const etiket = (u: Unite) => (u.no === 0 ? "Diğer" : `Ünite ${u.no}`);
  const aktifUnite = uniteler.find((u) => u.no === aktif);
  const seciliUnite = uniteler.find((u) => u.no === secili);

  const gonder = () => {
    const n = Number(sira);
    if (!seciliUnite || !Number.isInteger(n) || n < 1 || n > seciliUnite.soru) {
      setHata(true);
      return;
    }
    setHata(false);
    calistir(() => soruyaGit(seciliUnite.no, n));
  };

  const baslik = gorunum === "unite" ? "Üniteye git" : gorunum === "soru" ? "Soruya git" : "Ders menüsü";

  return (
    <>
      <header
        aria-label="Ders çubuğu"
        inert={!gorunur}
        data-gorunur={gorunur}
        className="mobil-ustcubuk fixed inset-x-0 top-0 z-[55] flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-1 border-b border-theme bg-[color-mix(in_srgb,var(--bg-color)_96%,transparent)] px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-transform duration-200 ease-out motion-reduce:transition-none data-[gorunur=false]:-translate-y-full md:hidden print:hidden"
      >
        <p className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-theme">{dersAdi}</p>
        <SimgeDugmesi etiket="Sayfanın başına dön" onClick={basaDon}>
          <ArrowUp className="size-5" aria-hidden />
        </SimgeDugmesi>
        {uniteler.length > 0 && (
          <label className={`relative flex h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-theme active:bg-[var(--button-bg-hover)]`}>
            <span className="whitespace-nowrap">{aktifUnite ? (aktifUnite.no === 0 ? "Diğer" : `Ü ${aktifUnite.no}`) : "Ünite"}</span>
            <ChevronDown className="size-4 text-muted-theme" aria-hidden />
            <select
              aria-label="Üniteye git"
              value={aktif}
              onChange={(e) => uniteyeGit(Number(e.target.value))}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            >
              {uniteler.map((u) => (
                <option key={u.no} value={u.no}>
                  {etiket(u)}
                  {u.baslik ? ` · ${u.baslik}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <SimgeDugmesi
          etiket="Menüyü aç"
          onClick={() => {
            setGorunum("ana");
            setAcik(true);
          }}
        >
          <LayoutGrid className="size-5" aria-hidden />
        </SimgeDugmesi>
      </header>

      <Drawer.Root
        open={acik}
        onOpenChange={(o) => {
          setAcik(o);
          if (!o) setHata(false);
        }}
        onOpenChangeComplete={(o) => {
          if (o) return;
          setGorunum("ana");
          const is = beklenen.current;
          beklenen.current = null;
          is?.();
        }}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[150] bg-black opacity-[calc(0.5*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
          <Drawer.Viewport
            className="fixed inset-x-0 top-0 z-[151] flex items-end justify-center"
            style={{ bottom: "var(--klavye, 0px)" }}
          >
            <Drawer.Popup
              initialFocus={() => kap.current?.querySelector<HTMLElement>("[data-ilk]") ?? true}
              className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-b-0 border-theme shadow-2xl outline-none
                [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)] motion-reduce:transition-none"
              style={{ background: "var(--card-bg)", color: "var(--text-color)" }}
            >
              <div
                ref={kap}
                className="flex flex-col overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
                style={{ maxHeight: "calc(var(--app-height, 100dvh) - 1.5rem)" }}
              >
                <div className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-[var(--border-color-hover)]" aria-hidden />
                <div className="mb-2 flex min-h-11 items-center gap-1">
                  {gorunum !== "ana" && (
                    <SimgeDugmesi etiket="Geri" onClick={() => setGorunum("ana")}>
                      <ChevronLeft className="size-5" aria-hidden />
                    </SimgeDugmesi>
                  )}
                  <Drawer.Title className={`min-w-0 flex-1 truncate text-base font-semibold ${gorunum === "ana" ? "pl-1" : ""}`}>
                    {baslik}
                  </Drawer.Title>
                </div>

                {gorunum === "ana" && (
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                    <Kutu ilk simge={ArrowUp} etiket="Başa dön" onClick={() => calistir(basaDon)} />
                    <Kutu simge={ArrowDown} etiket="Sona git" onClick={() => calistir(sonaGit)} />
                    <Kutu simge={Search} etiket="Ara" onClick={() => calistir(() => tikla("#toggleSearch"))} />
                    <Kutu simge={List} etiket="Üniteye git" onClick={() => setGorunum("unite")} />
                    <Kutu simge={Hash} etiket="Soruya git" onClick={() => setGorunum("soru")} />
                    <Kutu simge={Settings} etiket="Ayarlar" onClick={() => calistir(() => sayfa().openQuizSettings?.())} />
                    <Kutu simge={MessageCircle} etiket="Sohbet asistanı" onClick={() => calistir(() => tikla("#sohbet-ac"))} />
                    <Kutu simge={RefreshCw} etiket="Kayıtlarını taşı" href="/yedek" />
                    <Kutu simge={Flag} etiket="Hata bildir" onClick={() => calistir(() => tikla("[data-tartisma]"))} />
                    <Kutu
                      simge={SunMoon}
                      etiket={`Tema: ${TEMA_AD[tema] ?? tema}`}
                      onClick={() => {
                        const yeni = TEMALAR[(TEMALAR.indexOf(tema as (typeof TEMALAR)[number]) + 1) % TEMALAR.length];
                        sayfa().setTheme?.(yeni);
                        setTema(yeni);
                      }}
                    />
                    <Kutu dar simge={Mic} etiket="Soruyu oku" onClick={() => calistir(() => tikla("#btn-read-question"))} />
                    <Kutu dar simge={BookOpen} etiket="Açıklamayı oku" onClick={() => calistir(() => tikla("#btn-read-explanation"))} />
                    <Kutu dar simge={Square} etiket="Okumayı durdur" onClick={() => calistir(() => tikla("#btn-stop-speech"))} />
                  </div>
                )}

                {gorunum === "unite" && (
                  <ul data-base-ui-swipe-ignore="y" className="flex max-h-[60dvh] flex-col gap-1.5 overflow-y-auto overscroll-contain">
                    {uniteler.map((u, i) => (
                      <li key={u.no}>
                        <button
                          type="button"
                          {...(i === 0 ? { "data-ilk": "" } : {})}
                          onClick={() => calistir(() => uniteyeGit(u.no))}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left active:bg-[var(--button-bg-hover)] ${odak} ${
                            u.no === aktif ? "border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)]" : "border-theme bg-[var(--button-bg)]"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{etiket(u)}</span>
                            {u.baslik && <span className="line-clamp-2 text-xs text-muted-theme">{u.baslik}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-muted-theme">{u.soru} soru</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {gorunum === "soru" && (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      gonder();
                    }}
                  >
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Ünite
                      <select
                        value={secili}
                        onChange={(e) => {
                          setSecili(Number(e.target.value));
                          setHata(false);
                        }}
                        className="h-12 rounded-xl border border-theme bg-[var(--button-bg)] px-3 text-base"
                      >
                        {uniteler.map((u) => (
                          <option key={u.no} value={u.no}>
                            {etiket(u)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Soru numarası
                      <input
                        data-ilk=""
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="go"
                        autoComplete="off"
                        autoCorrect="off"
                        value={sira}
                        onChange={(e) => {
                          setSira(e.target.value.replace(/\D/g, ""));
                          setHata(false);
                        }}
                        placeholder={seciliUnite ? `1 - ${seciliUnite.soru}` : ""}
                        aria-invalid={hata}
                        aria-describedby={hata ? "mobil-soru-hata" : undefined}
                        className="h-12 rounded-xl border border-theme bg-[var(--button-bg)] px-3 text-base"
                      />
                    </label>
                    {hata && (
                      <p id="mobil-soru-hata" role="alert" className="text-sm text-[var(--incorrect-border)]">
                        1 ile {seciliUnite?.soru ?? 0} arasında bir sayı gir.
                      </p>
                    )}
                    <button
                      type="submit"
                      className={`h-12 rounded-xl bg-[var(--primary-color)] text-base font-semibold text-[var(--primary-color-text)] active:opacity-90 ${odak}`}
                    >
                      Soruya git
                    </button>
                  </form>
                )}
              </div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
