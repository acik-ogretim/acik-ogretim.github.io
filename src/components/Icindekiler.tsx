// Course table of contents: units with their book topics. Tapping a unit scrolls to its section,
// tapping a topic scrolls to the first question tied to it. Right panel on desktop, bottom sheet on phones.
import { Drawer } from "@base-ui/react/drawer";
import { ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export type IcKonu = { no: string; baslik: string; hedef: string; alt: IcKonu[] };
export type IcUnite = { no: number; ad: string | null; soru: number; konular: IcKonu[] };

export const ICINDEKILER_OLAYI = "icindekiler:ac";
/** Mod "anlatim" (detail { mod: "anlatim" }): the tree opens the topic drawer (konu:ac) instead of scrolling to questions. */
type Mod = "soru" | "anlatim";
type Calisma = { yol: string; video: boolean } | null;

const davranis = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

function KonuSatiri({ k, derinlik, git, calisma }: { k: IcKonu; derinlik: number; git: (hedef: string, no?: string) => void; calisma: Calisma }) {
  return (
    <li>
      <button
        type="button"
        id={`ic-konu-${k.no}`}
        onClick={() => git(k.hedef, k.no)}
        // CSS-degiskeni: nesting depth comes from the data
        style={{ "--derinlik": derinlik } as CSSProperties}
        className="ic-konu"
      >
        <span className="ic-konu-no">{k.no}</span>
        <span className="line-clamp-2 min-w-0">{k.baslik}</span>
      </button>
      {calisma && (
        <a
          href={`${calisma.yol}?konu=${encodeURIComponent(k.no)}`}
          className="mb-1 inline-flex min-h-9 items-center rounded-full border border-line px-3 text-[13px] font-semibold text-ink-muted hover:text-ink"
          style={{ marginInlineStart: `calc(2.75rem + ${derinlik} * 1rem)` }}
        >
          {calisma.video ? "Videoda izle" : "Çalışma odasında aç"}
        </a>
      )}
      {k.alt.length > 0 && (
        <ul>
          {k.alt.map((a) => (
            <KonuSatiri key={a.no} k={a} derinlik={derinlik + 1} git={git} calisma={calisma} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Icindekiler({ uniteler, calismaYolu, videoVar = false }: { uniteler: IcUnite[]; calismaYolu?: string; videoVar?: boolean }) {
  const [acik, setAcik] = useState(false);
  const [mod, setMod] = useState<Mod>("soru");
  const beklenenKonu = useRef<string | null>(null);
  const calisma: Calisma = mod === "anlatim" && calismaYolu ? { yol: calismaYolu, video: videoVar } : null;
  const [acilan, setAcilan] = useState<Set<number>>(new Set());
  const beklenen = useRef<string | null>(null);

  // A topic chip on a question opens the list at that topic: its unit expanded, the row focused.
  const [hedefKonu, setHedefKonu] = useState<string | null>(null);
  useEffect(() => {
    const ac = (e: Event) => {
      const detay = (e as CustomEvent<{ konu?: string; mod?: string } | null>).detail;
      const konu = detay?.konu ?? null;
      setMod(detay?.mod === "anlatim" ? "anlatim" : "soru");
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
  const git = (hedef: string, no?: string) => {
    if (mod === "anlatim") beklenenKonu.current = no ?? null; // konu numarası: anlatım çekmecesi açılır
    else beklenen.current = hedef;
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
        const konu = beklenenKonu.current;
        beklenenKonu.current = null;
        if (konu) dispatchEvent(new CustomEvent("konu:ac", { detail: { konu } }));
        const hedef = beklenen.current;
        beklenen.current = null;
        if (hedef) document.getElementById(hedef)?.scrollIntoView({ block: "start", behavior: davranis() });
      }}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="katman-perde" />
        <Drawer.Viewport className="katman-konum" data-yer="sag">
          <Drawer.Popup
            initialFocus={() => (hedefKonu && document.getElementById(`ic-konu-${hedefKonu}`)) || document.getElementById("icindekiler-kapat") || true}
            className="katman-yuzey"
          >
            <div className="katman-tutamac" aria-hidden />
            <div className="katman-baslik">
              <div className="katman-baslik-metin">
                <Drawer.Title className="katman-ad">{mod === "anlatim" ? "Konular" : "İçindekiler"}</Drawer.Title>
                <Drawer.Description className="katman-bilgi">
                  {mod === "anlatim" ? `${uniteler.length} ünite · konu anlatımı için dokun` : `${uniteler.length} ünite · ${uniteler.reduce((t, u) => t + u.soru, 0)} soru`}
                </Drawer.Description>
              </div>
              <button id="icindekiler-kapat" type="button" aria-label="Kapat" onClick={() => setAcik(false)} className="katman-kapat">
                <X aria-hidden />
              </button>
            </div>
            <div data-base-ui-swipe-ignore="y" className="katman-govde">
              <div className="katman-liste">
                {uniteler.map((u) => {
                  const ad = u.no === 0 ? "Diğer sorular" : `Ünite ${u.no}`;
                  const var_ = u.konular.length > 0;
                  const genis = acilan.has(u.no);
                  return (
                    <div key={u.no} className="ic-unite">
                      <div className="flex items-stretch">
                        {var_ ? (
                          <button
                            type="button"
                            aria-expanded={genis}
                            aria-label={`${ad} konularını ${genis ? "gizle" : "göster"}`}
                            onClick={() => degistir(u.no)}
                            className="ic-ac"
                          >
                            <ChevronRight aria-hidden />
                          </button>
                        ) : (
                          <span className="w-3 shrink-0" aria-hidden />
                        )}
                        <button type="button" onClick={() => (mod === "anlatim" ? degistir(u.no) : git(`unite-${u.no}`))} className="katman-satir min-w-0 flex-1 ps-1">
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{ad}</span>
                            {u.ad && <span className="katman-satir-not line-clamp-2">{u.ad}</span>}
                          </span>
                          <span className="katman-satir-sag">{mod === "anlatim" ? `${u.konular.length} konu` : `${u.soru} soru`}</span>
                        </button>
                      </div>
                      {var_ && genis && (
                        <ul className="ic-konular">
                          {u.konular.map((k) => (
                            <KonuSatiri key={k.no} k={k} derinlik={0} git={git} calisma={calisma} />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
