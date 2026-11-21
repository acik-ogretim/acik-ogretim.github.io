// Course question filters as a bottom sheet (right panel from 768 px). Writes the same quiz-settings
// fields the player reads, then asks the player to re-apply them; the count previews the draft live.
import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  VARSAYILAN_SUZGEC,
  cevaplanmamis,
  sinavEtiketi,
  suz,
  suzgecOku,
  suzgecYaz,
  yanlisVar,
  yariNoktasi,
  type Ilerleme,
  type SuzgecAyar,
  type SuzulecekSoru,
} from "../lib/suzgec";

export const SUZGEC_ACMA_OLAYI = "suzgec:ac";

type Oynatici = { syncSettings?: () => void };
const odak = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]";

/** Every question card on the page, read from its data attributes. */
function kartlariOku(): SuzulecekSoru[] {
  return [...document.querySelectorAll<HTMLElement>(".question-card")].map((el) => ({
    id: el.dataset.id ?? el.id,
    unitNumber: Number.parseInt(el.dataset.unit ?? "0", 10),
    source: el.dataset.source ?? "soru-bankasi",
    sinavlar: (el.dataset.sinav ?? "").split(";").filter(Boolean),
  }));
}

function ilerlemeOku(ders: string): Ilerleme {
  try {
    const veri = JSON.parse(localStorage.getItem(`quiz-progress-${ders}`) ?? "{}") as unknown;
    return veri && typeof veri === "object" ? (veri as Ilerleme) : {};
  } catch {
    return {};
  }
}

function Cip({ secili, onClick, children }: { secili: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={secili}
      onClick={onClick}
      className={`inline-flex min-h-11 max-w-full items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none ${odak} ${
        secili ? "bg-accent-soft text-accent-ink" : "bg-control text-ink"
      }`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

function Grup({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section aria-label={baslik} className="flex flex-col gap-2">
      <h3 className="px-0.5 text-[13px] font-semibold text-ink-muted">{baslik}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export default function Suzgec({ ders }: { ders: string }) {
  const [acik, setAcik] = useState(false);
  const [taslak, setTaslak] = useState<SuzgecAyar>(VARSAYILAN_SUZGEC);
  const [sorular, setSorular] = useState<SuzulecekSoru[]>([]);
  const [ilerleme, setIlerleme] = useState<Ilerleme>({});

  useEffect(() => {
    const ac = () => {
      setSorular(kartlariOku());
      setIlerleme(ilerlemeOku(ders));
      setTaslak(suzgecOku(localStorage.getItem("quiz-settings")));
      setAcik(true);
    };
    addEventListener(SUZGEC_ACMA_OLAYI, ac);
    return () => removeEventListener(SUZGEC_ACMA_OLAYI, ac);
  }, [ders]);

  const uniteler = useMemo(() => [...new Set(sorular.map((q) => q.unitNumber))].filter((u) => u > 0).sort((a, b) => a - b), [sorular]);
  const { orta, son } = yariNoktasi(uniteler);
  const sinavlar = useMemo(() => {
    const sayac = new Map<string, number>();
    for (const q of sorular) for (const s of q.sinavlar) sayac.set(s, (sayac.get(s) ?? 0) + 1);
    return [...sayac].sort((a, b) => b[0].localeCompare(a[0], "tr"));
  }, [sorular]);
  const cikmisVar = sorular.some((q) => q.source === "cikmis-soru");
  const alistirmaVar = sorular.some((q) => q.source !== "cikmis-soru");
  const yanlisSayisi = sorular.filter((q) => yanlisVar(ilerleme, q.id)).length;
  const bosSayisi = sorular.filter((q) => cevaplanmamis(ilerleme, q.id)).length;
  const onizleme = suz(sorular, taslak, ilerleme).length;

  const degistir = (yama: Partial<SuzgecAyar>) => setTaslak((t) => ({ ...t, ...yama }));
  const uygula = () => {
    localStorage.setItem("quiz-settings", suzgecYaz(localStorage.getItem("quiz-settings"), taslak));
    (window as unknown as { quizPlayer?: Oynatici }).quizPlayer?.syncSettings?.();
    setAcik(false);
  };

  return (
    <Drawer.Root open={acik} onOpenChange={setAcik} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-[150] bg-scrim opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Drawer.Viewport
          className="fixed inset-x-0 top-0 z-[151] flex items-end justify-center px-2 pb-2 md:items-stretch md:justify-end md:p-2"
          style={{ bottom: "var(--klavye, 0px)" }}
        >
          <Drawer.Popup
            initialFocus={() => document.getElementById("suzgec-govde") ?? true}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-line bg-glass text-ink shadow-2xl outline-none backdrop-blur-[22px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none
              max-md:[transform:translateY(var(--drawer-swipe-movement-y))] max-md:data-starting-style:[transform:translateY(110%)] max-md:data-ending-style:[transform:translateY(110%)]
              md:h-full md:max-w-[420px] md:[transform:none] md:data-starting-style:[transform:translateX(110%)] md:data-ending-style:[transform:translateX(110%)]"
            style={{ maxHeight: "calc(var(--app-height, 100dvh) - 1rem)", WebkitBackdropFilter: "blur(22px) saturate(180%)" }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border-color-hover)] md:hidden" aria-hidden />
            <div className="flex shrink-0 items-start gap-2 px-4 pt-2 md:pt-4">
              <div className="min-w-0 flex-1 pt-1.5">
                <Drawer.Title className="truncate text-[17px] font-bold">Süzgeç</Drawer.Title>
                <Drawer.Description className="truncate text-[13px] text-ink-muted" aria-live="polite">
                  Seçime uyan soru: <span className="tabular-nums">{onizleme}</span> / <span className="tabular-nums">{sorular.length}</span>
                </Drawer.Description>
              </div>
              <button
                id="suzgec-kapat"
                type="button"
                aria-label="Kapat"
                onClick={() => setAcik(false)}
                className={`grid size-11 shrink-0 place-items-center rounded-full text-ink-muted active:bg-raised ${odak}`}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div id="suzgec-govde" tabIndex={-1} data-base-ui-swipe-ignore="y" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 outline-none">
              <Grup baslik="Soru türü">
                <Cip secili={taslak.filterIncorrect} onClick={() => degistir({ filterIncorrect: !taslak.filterIncorrect })}>
                  Yanlışlarım · {yanlisSayisi}
                </Cip>
                <Cip secili={taslak.filterUnanswered} onClick={() => degistir({ filterUnanswered: !taslak.filterUnanswered })}>
                  Cevaplanmamış · {bosSayisi}
                </Cip>
              </Grup>
              {sinavlar.length > 0 && (
                <Grup baslik="Sınav">
                  <Cip secili={taslak.filterExam === "all"} onClick={() => degistir({ filterExam: "all" })}>
                    Tümü
                  </Cip>
                  {sinavlar.map(([anahtar, sayi]) => (
                    <Cip key={anahtar} secili={taslak.filterExam === anahtar} onClick={() => degistir({ filterExam: anahtar })}>
                      {sinavEtiketi(anahtar)} · {sayi}
                    </Cip>
                  ))}
                </Grup>
              )}
              {cikmisVar && alistirmaVar && (
                <Grup baslik="Kaynak">
                  <Cip secili={taslak.filterSource === "all"} onClick={() => degistir({ filterSource: "all" })}>
                    Tümü
                  </Cip>
                  <Cip secili={taslak.filterSource === "cikmis-soru"} onClick={() => degistir({ filterSource: "cikmis-soru" })}>
                    Çıkmış sorular
                  </Cip>
                  <Cip secili={taslak.filterSource === "alistirma"} onClick={() => degistir({ filterSource: "alistirma" })}>
                    Alıştırma ve deneme
                  </Cip>
                </Grup>
              )}
              {uniteler.length > 1 && (
                <Grup baslik="Ünite">
                  <Cip secili={taslak.filterUnite === "all"} onClick={() => degistir({ filterUnite: "all" })}>
                    Tümü
                  </Cip>
                  {son > 1 && (
                    <>
                      <Cip secili={taslak.filterUnite === "first_half"} onClick={() => degistir({ filterUnite: "first_half" })}>
                        İlk yarı · 1-{orta}
                      </Cip>
                      <Cip secili={taslak.filterUnite === "second_half"} onClick={() => degistir({ filterUnite: "second_half" })}>
                        İkinci yarı · {orta + 1}-{son}
                      </Cip>
                    </>
                  )}
                  {uniteler.map((u) => (
                    <Cip key={u} secili={taslak.filterUnite === String(u)} onClick={() => degistir({ filterUnite: String(u) })}>
                      Ü {u}
                    </Cip>
                  ))}
                </Grup>
              )}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setTaslak({ ...VARSAYILAN_SUZGEC })}
                className={`h-12 flex-1 rounded-full border border-line bg-card text-[15px] font-semibold text-ink active:scale-[0.96] motion-reduce:transform-none ${odak}`}
              >
                Sıfırla
              </button>
              <button
                type="button"
                onClick={uygula}
                className={`h-12 flex-[1.6] rounded-full bg-accent text-[15px] font-semibold text-on-accent active:scale-[0.96] motion-reduce:transform-none ${odak}`}
              >
                Uygula
              </button>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
