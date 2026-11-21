// Course table of contents: units with their book topics. Tapping a unit scrolls to its section,
// tapping a topic scrolls to the first question tied to it. Right panel on desktop, bottom sheet on phones.
import { Drawer } from "@base-ui/react/drawer";
import { ChevronRight, ListTree, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type IcKonu = { no: string; baslik: string; hedef: string; alt: IcKonu[] };
export type IcUnite = { no: number; ad: string | null; soru: number; konular: IcKonu[] };

export const ICINDEKILER_OLAYI = "icindekiler:ac";

const davranis = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
const odak = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]";

function KonuSatiri({ k, derinlik, git }: { k: IcKonu; derinlik: number; git: (hedef: string) => void }) {
  return (
    <li>
      <button
        type="button"
        id={`ic-konu-${k.no}`}
        onClick={() => git(k.hedef)}
        style={{ paddingLeft: `${0.75 + derinlik * 0.875}rem` }}
        className={`flex min-h-11 w-full items-center gap-2 rounded-lg pr-2 text-left text-sm active:bg-[var(--button-bg-hover)] md:hover:bg-[var(--button-bg-hover)] ${odak}`}
      >
        <span className="shrink-0 text-xs tabular-nums text-muted-theme">{k.no}</span>
        <span className="line-clamp-2 min-w-0">{k.baslik}</span>
      </button>
      {k.alt.length > 0 && (
        <ul>
          {k.alt.map((a) => (
            <KonuSatiri key={a.no} k={a} derinlik={derinlik + 1} git={git} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Icindekiler({ uniteler }: { uniteler: IcUnite[] }) {
  const [acik, setAcik] = useState(false);
  const [acilan, setAcilan] = useState<Set<number>>(new Set());
  const beklenen = useRef<string | null>(null);

  // A topic chip on a question opens the list at that topic: its unit expanded, the row focused.
  const [hedefKonu, setHedefKonu] = useState<string | null>(null);
  useEffect(() => {
    const ac = (e: Event) => {
      const konu = (e as CustomEvent<{ konu?: string } | null>).detail?.konu ?? null;
      if (konu) {
        const unite = Number.parseInt(konu, 10);
        setAcilan((onceki) => new Set(onceki).add(unite));
      }
      setHedefKonu(konu);
      setAcik(true);
    };
    addEventListener(ICINDEKILER_OLAYI, ac);
    return () => removeEventListener(ICINDEKILER_OLAYI, ac);
  }, []);

  // Scrolling waits for the close animation so the page scroll lock is gone first.
  const git = (hedef: string) => {
    beklenen.current = hedef;
    setAcik(false);
  };
  const degistir = (no: number) =>
    setAcilan((onceki) => {
      const yeni = new Set(onceki);
      if (!yeni.delete(no)) yeni.add(no);
      return yeni;
    });

  return (
    <Drawer.Root
      open={acik}
      onOpenChange={setAcik}
      onOpenChangeComplete={(o) => {
        if (o) return;
        const hedef = beklenen.current;
        beklenen.current = null;
        if (hedef) document.getElementById(hedef)?.scrollIntoView({ block: "start", behavior: davranis() });
      }}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-[150] bg-page opacity-[calc(0.5*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Drawer.Viewport
          className="fixed inset-x-0 top-0 z-[151] flex items-end justify-center md:items-stretch md:justify-end"
          style={{ bottom: "var(--klavye, 0px)" }}
        >
          <Drawer.Popup
            initialFocus={() => (hedefKonu && document.getElementById(`ic-konu-${hedefKonu}`)) || document.getElementById("icindekiler-kapat") || true}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-b-0 border-theme shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none
              max-md:[transform:translateY(var(--drawer-swipe-movement-y))] max-md:data-starting-style:[transform:translateY(100%)] max-md:data-ending-style:[transform:translateY(100%)]
              md:h-full md:max-w-[26rem] md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:[transform:none] md:data-starting-style:[transform:translateX(100%)] md:data-ending-style:[transform:translateX(100%)]"
            style={{ background: "var(--card-bg)", color: "var(--text-color)", maxHeight: "calc(var(--app-height, 100dvh) - 1.5rem)" }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border-color-hover)] md:hidden" aria-hidden />
            <div className="flex min-h-12 shrink-0 items-center gap-2 px-3 pt-1 md:px-4 md:pt-3">
              <ListTree className="size-5 shrink-0 text-muted-theme" aria-hidden />
              <Drawer.Title className="min-w-0 flex-1 truncate text-base font-semibold">İçindekiler</Drawer.Title>
              <button
                id="icindekiler-kapat"
                type="button"
                aria-label="Kapat"
                onClick={() => setAcik(false)}
                className={`grid size-11 shrink-0 place-items-center rounded-lg text-muted-theme active:bg-[var(--button-bg-hover)] ${odak}`}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div
              data-base-ui-swipe-ignore="y"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-3"
            >
              <ul className="flex flex-col gap-1">
                {uniteler.map((u) => {
                  const ad = u.no === 0 ? "Diğer sorular" : `Ünite ${u.no}`;
                  const var_ = u.konular.length > 0;
                  const genis = acilan.has(u.no);
                  return (
                    <li key={u.no} className="rounded-xl border border-theme bg-[var(--button-bg)]">
                      <div className="flex items-stretch">
                        {var_ ? (
                          <button
                            type="button"
                            aria-expanded={genis}
                            aria-label={`${ad} konularını ${genis ? "gizle" : "göster"}`}
                            onClick={() => degistir(u.no)}
                            className={`grid w-11 shrink-0 place-items-center rounded-l-xl text-muted-theme active:bg-[var(--button-bg-hover)] ${odak}`}
                          >
                            <ChevronRight className={`size-5 transition-transform motion-reduce:transition-none ${genis ? "rotate-90" : ""}`} aria-hidden />
                          </button>
                        ) : (
                          <span className="w-3 shrink-0" aria-hidden />
                        )}
                        <button
                          type="button"
                          onClick={() => git(`unite-${u.no}`)}
                          className={`flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-r-xl py-2 pr-3 text-left active:bg-[var(--button-bg-hover)] md:hover:bg-[var(--button-bg-hover)] ${odak}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{ad}</span>
                            {u.ad && <span className="line-clamp-2 text-xs text-muted-theme">{u.ad}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-muted-theme">{u.soru} soru</span>
                        </button>
                      </div>
                      {var_ && genis && (
                        <ul className="border-t border-theme px-1 py-1">
                          {u.konular.map((k) => (
                            <KonuSatiri key={k.no} k={k} derinlik={0} git={git} />
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
