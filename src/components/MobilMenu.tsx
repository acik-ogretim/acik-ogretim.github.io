// Phone chrome for the course page: a headroom top bar (hides while scrolling down, returns on the way
// up) and a bottom action drawer that holds everything the player bar has no room for.
import { Drawer } from "@base-ui/react/drawer";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  GripVertical,
  Icon,
  LayoutGrid,
  Minus,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Tur from "./Tur";
import {
  CUBUK_OLAYI,
  EYLEMLER,
  EYLEM_HARITASI,
  MENU_ACMA_OLAYI,
  MENU_EYLEMI,
  basaDon,
  cubukOku,
  cubukSifirla,
  cubukYaz,
  type Eylem,
} from "../lib/eylemler";

type Unite = { no: number; ad: string; baslik?: string; soru: number };
type Gorunum = "ana" | "unite" | "soru";

const davranis = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const uniteyeGit = (no: number) =>
  document.getElementById(`unite-${no}`)?.scrollIntoView({ block: "start", behavior: davranis() });
const soruyaGit = (no: number, sira: number) =>
  document.getElementById(`question-${no}-${sira - 1}`)?.scrollIntoView({ block: "start", behavior: davranis() });
const etiketi = (e: Eylem) => e.etiketi?.() ?? e.etiket;

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

function Simge({ e, className }: { e: { simge: Eylem["simge"] }; className: string }) {
  return <Icon iconNode={e.simge as never} className={className} aria-hidden />;
}

type KutuProps = {
  e: Pick<Eylem, "simge" | "kisayol"> & { etiket: string };
  onClick: () => void;
  ilk?: boolean;
  rozet?: "ekle";
};

// One grid tile. Shortcut hints show next to the label on desktop only.
function Kutu({ e, onClick, ilk, rozet }: KutuProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...(ilk ? { "data-ilk": "" } : {})}
      className={`relative flex min-h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-theme bg-[var(--button-bg)] px-1 py-2 text-theme transition-transform active:scale-[0.97] motion-reduce:transition-none ${odak}`}
    >
      <Simge e={e} className="size-6" />
      <span className="flex max-w-full items-center justify-center gap-1">
        <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight sm:text-xs">{e.etiket}</span>
        {e.kisayol && (
          <kbd className="hidden shrink-0 rounded border border-theme px-1 font-sans text-[10px] text-muted-theme md:inline">{e.kisayol}</kbd>
        )}
      </span>
      {rozet === "ekle" && (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--primary-color)] text-[var(--primary-color-text)]" aria-hidden>
          <Plus className="size-3.5" />
        </span>
      )}
    </button>
  );
}

function SiraSatiri({ e, i, n, tasi, cikar }: { e: Eylem; i: number; n: number; tasi: (yon: -1 | 1) => void; cikar: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
  const dugme = `grid size-9 shrink-0 place-items-center rounded-lg text-muted-theme active:bg-[var(--button-bg-hover)] disabled:opacity-30 ${odak}`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-12 items-center gap-0.5 rounded-xl border border-theme bg-[var(--button-bg)] pr-1 ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`${e.etiket} sırasını sürükle`}
        {...attributes}
        {...listeners}
        className={`grid size-10 shrink-0 cursor-grab touch-none place-items-center text-muted-theme ${odak}`}
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
      <Simge e={e} className="size-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate pl-2 text-sm font-medium">{etiketi(e)}</span>
      <button type="button" aria-label={`${e.etiket} yukarı taşı`} disabled={i === 0} onClick={() => tasi(-1)} className={dugme}>
        <ChevronUp className="size-5" aria-hidden />
      </button>
      <button type="button" aria-label={`${e.etiket} aşağı taşı`} disabled={i === n - 1} onClick={() => tasi(1)} className={dugme}>
        <ChevronDown className="size-5" aria-hidden />
      </button>
      <button type="button" aria-label={`${e.etiket} çubuktan çıkar`} onClick={cikar} className={`${dugme} text-[var(--incorrect-border)]`}>
        <Minus className="size-5" aria-hidden />
      </button>
    </li>
  );
}

export default function MobilMenu({ dersAdi, uniteler: tumUniteler }: { dersAdi: string; uniteler: Unite[] }) {
  // Units left empty by the question filters are hidden (quiz-player sends "sorular:filtre")
  const [gorunenler, setGorunenler] = useState<number[] | null>(null);
  useEffect(() => {
    const dinle = (e: Event) => setGorunenler((e as CustomEvent<{ units: number[] }>).detail.units);
    addEventListener("sorular:filtre", dinle);
    // The player may have filtered before this island hydrated: read the visible unit headers once
    const ayrac = [...document.querySelectorAll<HTMLElement>(".unit-separator")];
    if (ayrac.some((el) => el.style.display === "none"))
      setGorunenler(ayrac.filter((el) => el.style.display !== "none").map((el) => Number(el.dataset.unit)));
    return () => removeEventListener("sorular:filtre", dinle);
  }, []);
  const uniteler = gorunenler ? tumUniteler.filter((u) => gorunenler.includes(u.no)) : tumUniteler;
  const [gorunur, setGorunur] = useState(false);
  const [aktif, setAktif] = useState<number>(tumUniteler[0]?.no ?? 0);
  const [acik, setAcik] = useState(false);
  const [gorunum, setGorunum] = useState<Gorunum>("ana");
  const [duzenle, setDuzenle] = useState(false);
  const [cubuk, setCubuk] = useState<string[]>([]);
  const [, temaYenile] = useState(0);
  const [secili, setSecili] = useState<number>(tumUniteler[0]?.no ?? 0);
  const [sira, setSira] = useState("");
  const [hata, setHata] = useState(false);
  const kap = useRef<HTMLDivElement>(null);
  const beklenen = useRef<(() => void) | null>(null);
  const sensorler = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        // Units hidden by the question filters report top 0; skip them or the last hidden unit wins
        if (el.offsetParent === null) continue;
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

  // Lets the page shift its sticky unit navigation and site header while the top bar is out.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-ustcubuk", gorunur);
  }, [gorunur]);

  // The player bar and shortcuts open the drawer through a window event.
  useEffect(() => {
    const ac = (olay: Event) => {
      const g = (olay as CustomEvent<{ gorunum?: Gorunum }>).detail?.gorunum;
      setGorunum(g === "unite" || g === "soru" ? g : "ana");
      setDuzenle(false);
      setAcik(true);
    };
    addEventListener(MENU_ACMA_OLAYI, ac);
    return () => removeEventListener(MENU_ACMA_OLAYI, ac);
  }, []);

  // Bar selection: read once, then follow every change.
  useEffect(() => {
    setCubuk(cubukOku());
    const degisti = (olay: Event) => setCubuk((olay as CustomEvent<string[]>).detail);
    addEventListener(CUBUK_OLAYI, degisti);
    return () => removeEventListener(CUBUK_OLAYI, degisti);
  }, []);

  useEffect(() => {
    if (acik) setSecili(aktif);
  }, [acik]);

  // Keep focus on the first control of whichever view is showing.
  useEffect(() => {
    if (acik) requestAnimationFrame(() => kap.current?.querySelector<HTMLElement>("[data-ilk]")?.focus());
  }, [gorunum, acik, duzenle]);

  // Actions run after the exit animation so the page scroll lock is gone and the next drawer can open.
  const calistir = (is: () => void) => {
    beklenen.current = is;
    setAcik(false);
  };

  const dokun = (e: Eylem) => {
    if (e.altGorunum) setGorunum(e.altGorunum);
    else if (e.acikKalir) {
      e.calistir();
      temaYenile((n) => n + 1);
    } else calistir(e.calistir);
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

  // Bar edit helpers: every change is saved and broadcast, so the bar redraws at once.
  const cubuktakiler = cubuk.map((id) => EYLEM_HARITASI.get(id)).filter((e): e is Eylem => !!e);
  const menudekiler = EYLEMLER.filter((e) => !cubuk.includes(e.id));
  const tasi = (i: number, yon: -1 | 1) => cubukYaz(arrayMove(cubuk, i, i + yon));
  const surukleBitti = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    cubukYaz(arrayMove(cubuk, cubuk.indexOf(String(active.id)), cubuk.indexOf(String(over.id))));
  };

  const baslik = duzenle ? "Menüyü düzenle" : gorunum === "unite" ? "Üniteye git" : gorunum === "soru" ? "Soruya git" : "Tüm menü";
  const sagMetin = "h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-[var(--primary-color)] active:bg-[var(--button-bg-hover)]";

  return (
    <>
      <Tur />
      <header
        aria-label="Ders çubuğu"
        inert={!gorunur}
        data-gorunur={gorunur}
        className="mobil-ustcubuk fixed inset-x-0 top-0 z-[55] flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-1 border-b border-theme bg-[color-mix(in_srgb,var(--bg-color)_96%,transparent)] px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-transform duration-200 ease-out motion-reduce:transition-none data-[gorunur=false]:-translate-y-full md:px-6 print:hidden"
      >
        <p className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-theme">{dersAdi}</p>
        <SimgeDugmesi etiket="Sayfanın başına dön" onClick={basaDon}>
          <ArrowUp className="size-5" aria-hidden />
        </SimgeDugmesi>
        {uniteler.length > 0 && (
          <label className="relative flex h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-theme active:bg-[var(--button-bg-hover)] md:hover:bg-[var(--button-bg-hover)]">
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
            setDuzenle(false);
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
          setDuzenle(false);
          const is = beklenen.current;
          beklenen.current = null;
          is?.();
        }}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[150] bg-black opacity-[calc(0.5*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
          <Drawer.Viewport
            className="fixed inset-x-0 top-0 z-[151] flex items-end justify-center md:items-center md:p-6"
            style={{ bottom: "var(--klavye, 0px)" }}
          >
            <Drawer.Popup
              initialFocus={() => kap.current?.querySelector<HTMLElement>("[data-ilk]") ?? true}
              className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-b-0 border-theme shadow-2xl outline-none
                [transform:translateY(var(--drawer-swipe-movement-y))] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)] motion-reduce:transition-none
                md:max-w-2xl md:rounded-2xl md:border md:[transform:none] md:data-starting-style:[transform:scale(0.96)] md:data-ending-style:[transform:scale(0.96)] md:data-starting-style:opacity-0 md:data-ending-style:opacity-0"
              style={{ background: "var(--card-bg)", color: "var(--text-color)" }}
            >
              <div
                ref={kap}
                className="flex flex-col overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-5 md:pb-5"
                style={{ maxHeight: "calc(var(--app-height, 100dvh) - 1.5rem)" }}
              >
                <div className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-[var(--border-color-hover)] md:hidden" aria-hidden />
                <div className="mb-2 flex min-h-11 items-center gap-1">
                  {gorunum !== "ana" && !duzenle && (
                    <SimgeDugmesi etiket="Geri" onClick={() => setGorunum("ana")}>
                      <ChevronLeft className="size-5" aria-hidden />
                    </SimgeDugmesi>
                  )}
                  <Drawer.Title className={`min-w-0 flex-1 truncate text-base font-semibold ${gorunum === "ana" ? "pl-1" : ""}`}>
                    {baslik}
                  </Drawer.Title>
                  {gorunum === "ana" && !duzenle && (
                    <button type="button" onClick={() => setDuzenle(true)} className={`${sagMetin} flex items-center gap-1.5 ${odak}`}>
                      <Pencil className="size-4" aria-hidden />
                      Düzenle
                    </button>
                  )}
                  {duzenle && (
                    <button type="button" data-ilk="" onClick={() => setDuzenle(false)} className={`${sagMetin} ${odak}`}>
                      Bitti
                    </button>
                  )}
                </div>

                {gorunum === "ana" && !duzenle && (
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                    {EYLEMLER.map((e, i) => (
                      <Kutu key={e.id} ilk={i === 0} e={{ ...e, etiket: etiketi(e) }} onClick={() => dokun(e)} />
                    ))}
                  </div>
                )}

                {gorunum === "ana" && duzenle && (
                  <div data-base-ui-swipe-ignore="y" className="flex flex-col gap-4">
                    <section aria-label="Alt çubukta" className="flex flex-col gap-1.5">
                      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-theme">Alt çubukta</h3>
                      <DndContext sensors={sensorler} collisionDetection={closestCenter} onDragEnd={surukleBitti}>
                        <SortableContext items={cubuk} strategy={verticalListSortingStrategy}>
                          <ul className="flex flex-col gap-1.5">
                            {cubuktakiler.map((e, i) => (
                              <SiraSatiri
                                key={e.id}
                                e={e}
                                i={i}
                                n={cubuktakiler.length}
                                tasi={(yon) => tasi(i, yon)}
                                cikar={() => cubukYaz(cubuk.filter((id) => id !== e.id))}
                              />
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-theme px-3 text-muted-theme">
                        <LayoutGrid className="size-5 shrink-0" aria-hidden />
                        <span className="text-sm font-medium">{MENU_EYLEMI.etiket}</span>
                      </div>
                    </section>
                    <section aria-label="Menüde" className="flex flex-col gap-1.5">
                      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-theme">Menüde</h3>
                      {menudekiler.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                          {menudekiler.map((e) => (
                            <Kutu key={e.id} rozet="ekle" e={{ ...e, kisayol: undefined, etiket: etiketi(e) }} onClick={() => cubukYaz([...cubuk, e.id])} />
                          ))}
                        </div>
                      )}
                    </section>
                    <button
                      type="button"
                      onClick={cubukSifirla}
                      className={`mx-auto h-11 rounded-lg px-3 text-sm font-medium text-muted-theme underline underline-offset-4 active:bg-[var(--button-bg-hover)] ${odak}`}
                    >
                      Varsayılana sıfırla
                    </button>
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
