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
import { geriBolumu, type DersBolumu } from "../lib/ders-bolumu";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  GripVertical,
  Icon,
  LayoutGrid,
  ListTree,
  WifiOff,
  Minus,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { KONUM_ISTE_OLAYI, SORU_KONUMU_OLAYI, konumMetni, type SoruKonumu } from "../lib/ders-olaylari";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Tur from "./Tur";
import {
  CUBUK_OLAYI,
  EYLEMLER,
  EYLEM_DURUM_OLAYI,
  EYLEM_HARITASI,
  MENU_ACMA_OLAYI,
  MENU_EYLEMI,
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
const DAR = "(max-width: 767px)";
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
      className="katman-kapat"
    >
      {children}
    </button>
  );
}

function Simge({ e, className }: { e: { simge: Eylem["simge"] }; className: string }) {
  return <Icon iconNode={e.simge as never} className={className} aria-hidden />;
}

type KutuProps = {
  e: Pick<Eylem, "simge" | "kisayol" | "durum" | "deger" | "calisiyor" | "pasif"> & { etiket: string };
  onClick: () => void;
  ilk?: boolean;
  rozet?: "ekle";
};

// One grid tile. State and value come from the action registry (same source as the player bar);
// the look follows aria-pressed, data-calisiyor and :disabled in global.css (.menu-kutu).
function Kutu({ e, onClick, ilk, rozet }: KutuProps) {
  const acik = e.durum?.();
  const deger = e.deger?.();
  return (
    <button
      type="button"
      onClick={onClick}
      {...(ilk ? { "data-ilk": "" } : {})}
      aria-pressed={acik === undefined ? undefined : acik}
      data-calisiyor={e.calisiyor?.() ? "" : undefined}
      disabled={rozet ? undefined : e.pasif?.()}
      className={`menu-kutu ${odak}`}
    >
      <Simge e={e} className="size-6" />
      <span className="flex max-w-full items-center justify-center gap-1">
        <span className="line-clamp-2 text-center text-[12px] font-medium leading-tight">{e.etiket}</span>
        {e.kisayol && (
          <kbd className="hidden shrink-0 rounded border border-line px-1 font-sans text-[10px] text-ink-muted md:inline">{e.kisayol}</kbd>
        )}
      </span>
      {deger && <span className="menu-kutu-deger">{deger}</span>}
      {rozet === "ekle" && (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-on-accent" aria-hidden>
          <Plus className="size-3.5" />
        </span>
      )}
    </button>
  );
}

function SiraSatiri({ e, i, n, tasi, cikar }: { e: Eylem; i: number; n: number; tasi: (yon: -1 | 1) => void; cikar: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: e.id });
  const dugme = `grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-raised disabled:opacity-30 ${odak}`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-[52px] items-center gap-0.5 rounded-2xl border border-line bg-card pr-1 ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`${e.etiket} sırasını sürükle`}
        {...attributes}
        {...listeners}
        className={`grid size-11 shrink-0 cursor-grab touch-none place-items-center text-ink-muted ${odak}`}
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
      <button type="button" aria-label={`${e.etiket} çubuktan çıkar`} onClick={cikar} className={`${dugme} text-bad`}>
        <Minus className="size-5" aria-hidden />
      </button>
    </li>
  );
}

type Props = { dersAdi: string; uniteler: Unite[]; uni: string; ders: string; bolumler: DersBolumu[]; bolum: DersBolumu };

export default function MobilMenu({ dersAdi, uniteler: tumUniteler, uni, ders, bolumler, bolum }: Props) {
  // Shared course: go back to the department the learner came from, not the page's canonical one
  const [geriBolum, setGeriBolum] = useState(bolum);
  useEffect(() => {
    if (bolumler.length > 1) setGeriBolum(geriBolumu(uni, ders, bolumler, bolum, location.search));
  }, [uni, ders, bolumler, bolum]);
  const geri = `/${uni}/${geriBolum.id}`;
  const geriEtiket = geriBolum.ad;
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
  // Phones keep the floating bar on screen; from 768 px it hides while reading down (headroom).
  // Starts as phone so the server markup is usable before hydration.
  const [dar, setDar] = useState(true);
  const [konum, setKonum] = useState("");
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

  useEffect(() => {
    const mq = matchMedia(DAR);
    const guncelle = () => setDar(mq.matches);
    guncelle();
    mq.addEventListener("change", guncelle);
    return () => mq.removeEventListener("change", guncelle);
  }, []);

  // "Ü 4 · 12 / 40" follows the player's current question.
  useEffect(() => {
    const dinle = (e: Event) => setKonum(konumMetni((e as CustomEvent<SoruKonumu>).detail));
    addEventListener(SORU_KONUMU_OLAYI, dinle);
    dispatchEvent(new CustomEvent(KONUM_ISTE_OLAYI));
    return () => removeEventListener(SORU_KONUMU_OLAYI, dinle);
  }, []);

  const ustGorunur = dar || gorunur;

  // Desktop: lets the site header slide away while the top bar is out.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-ustcubuk", !dar && gorunur);
  }, [gorunur, dar]);

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

  // Player and theme changes redraw the tiles (state and value live in the action registry).
  useEffect(() => {
    const yenile = () => temaYenile((n) => n + 1);
    addEventListener(EYLEM_DURUM_OLAYI, yenile);
    return () => removeEventListener(EYLEM_DURUM_OLAYI, yenile);
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

  return (
    <>
      <Tur />
      <header
        aria-label="Ders çubuğu"
        inert={!ustGorunur}
        data-gorunur={ustGorunur}
        className="mobil-ustcubuk fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-[55] mx-auto flex h-[52px] w-[calc(100%-2*max(10px,env(safe-area-inset-left)))] max-w-[720px] items-center gap-0.5 rounded-full border border-line bg-glass pl-1 pr-1 shadow-[0_6px_24px_rgba(0,0,0,0.14)] backdrop-blur-[22px] backdrop-saturate-[1.8] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none data-[gorunur=false]:-translate-y-[calc(100%+48px)] data-[gorunur=false]:shadow-none print:hidden"
      >
        <a
          href={geri}
          aria-label={`Geri: ${geriEtiket}`}
          title={geriEtiket}
          className={`grid size-11 shrink-0 place-items-center rounded-full text-ink active:bg-raised ${odak}`}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </a>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-semibold text-ink">{dersAdi}</p>
          <p className="truncate text-[12px] tabular-nums text-ink-muted" aria-live="off">
            {konum || (aktifUnite ? etiket(aktifUnite) : "\u00a0")}
          </p>
        </div>
        {/* Shown by html[data-cevrimdisi] (src/styles/cevrimdisi.css) */}
        <span className="cevrimdisi-simge !m-0 !w-9" role="img" aria-label="Çevrimdışı" title="Çevrimdışısın: indirdiğin dersler açılır">
          <WifiOff className="size-[18px]" aria-hidden />
        </span>
        <button
          type="button"
          aria-label="İçindekiler"
          title="İçindekiler"
          onClick={() => window.dispatchEvent(new CustomEvent("icindekiler:ac"))}
          className={`grid size-11 shrink-0 place-items-center rounded-full text-ink active:bg-raised ${odak}`}
        >
          <ListTree className="size-5" aria-hidden />
        </button>
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
          <Drawer.Backdrop className="katman-perde" />
          <Drawer.Viewport className="katman-konum" data-yer="orta">
            <Drawer.Popup
              initialFocus={() => kap.current?.querySelector<HTMLElement>("[data-ilk]") ?? true}
              className="katman-yuzey md:max-w-2xl"
            >
              <div className="katman-tutamac" aria-hidden />
              <div className="katman-baslik">
                {gorunum !== "ana" && !duzenle && (
                  <SimgeDugmesi etiket="Geri" onClick={() => setGorunum("ana")}>
                    <ChevronLeft aria-hidden />
                  </SimgeDugmesi>
                )}
                <div className="katman-baslik-metin">
                  <Drawer.Title className="katman-ad">{baslik}</Drawer.Title>
                  {duzenle && <Drawer.Description className="katman-bilgi">Alt çubukta görünecekleri seç ve sırala</Drawer.Description>}
                </div>
                {gorunum === "ana" && !duzenle && (
                  <button type="button" onClick={() => setDuzenle(true)} className="katman-metin-dugme flex items-center gap-1.5">
                    <Pencil className="size-4" aria-hidden />
                    Düzenle
                  </button>
                )}
                {duzenle && (
                  <button type="button" data-ilk="" onClick={() => setDuzenle(false)} className="katman-metin-dugme">
                    Bitti
                  </button>
                )}
                {!duzenle && (
                  <Drawer.Close aria-label="Kapat" className="katman-kapat">
                    <X aria-hidden />
                  </Drawer.Close>
                )}
              </div>
              <div ref={kap} className="katman-govde">
                {gorunum === "ana" && !duzenle && (
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                    {EYLEMLER.map((e, i) => (
                      <Kutu key={e.id} ilk={i === 0} e={{ ...e, etiket: etiketi(e) }} onClick={() => dokun(e)} />
                    ))}
                    <a href="/durum/" className={`menu-kutu ${odak}`}><ListTree aria-hidden /><span>Durum</span></a>
                  </div>
                )}

                {gorunum === "ana" && duzenle && (
                  <div data-base-ui-swipe-ignore="y" className="flex flex-col gap-4">
                    <section aria-label="Alt çubukta" className="flex flex-col gap-1.5">
                      <h3 className="katman-grup-ad">Alt çubukta</h3>
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
                      <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-dashed border-line px-3 text-ink-muted">
                        <LayoutGrid className="size-5 shrink-0" aria-hidden />
                        <span className="text-sm font-medium">{MENU_EYLEMI.etiket}</span>
                      </div>
                    </section>
                    <section aria-label="Menüde" className="flex flex-col gap-1.5">
                      <h3 className="katman-grup-ad">Menüde</h3>
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
                      className="katman-metin-dugme mx-auto text-ink-muted"
                    >
                      Varsayılana sıfırla
                    </button>
                  </div>
                )}

                {gorunum === "unite" && (
                  <ul data-base-ui-swipe-ignore="y" className="katman-liste">
                    {uniteler.map((u, i) => (
                      <li key={u.no} className="contents">
                        <button
                          type="button"
                          {...(i === 0 ? { "data-ilk": "" } : {})}
                          aria-current={u.no === aktif ? "true" : undefined}
                          onClick={() => calistir(() => uniteyeGit(u.no))}
                          className="katman-satir"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{etiket(u)}</span>
                            {u.baslik && <span className="katman-satir-not line-clamp-2">{u.baslik}</span>}
                          </span>
                          <span className="katman-satir-sag">{u.soru} soru</span>
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
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-muted">
                      Ünite
                      <select
                        value={secili}
                        onChange={(e) => {
                          setSecili(Number(e.target.value));
                          setHata(false);
                        }}
                        className="h-12 rounded-2xl border border-line bg-control px-3 text-base text-ink"
                      >
                        {uniteler.map((u) => (
                          <option key={u.no} value={u.no}>
                            {etiket(u)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-muted">
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
                        className="h-12 rounded-2xl border border-line bg-control px-3 text-base text-ink"
                      />
                    </label>
                    {hata && (
                      <p id="mobil-soru-hata" role="alert" className="text-sm text-bad">
                        1 ile {seciliUnite?.soru ?? 0} arasında bir sayı gir.
                      </p>
                    )}
                    <button
                      type="submit"
                      className="katman-dugme katman-dugme-birincil"
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
