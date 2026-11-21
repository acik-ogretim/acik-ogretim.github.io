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
import { SIRALAMALAR, SIRALAMA_ADI, SIRALAMA_ANAHTARI, VARSAYILAN_SIRALAMA, siralamaOku, siralamaYaz, type Siralama } from "../lib/soru-siralama";
import { dersAnahtari, depoOku, depoYaz } from "../lib/calisma-durumu";

export const SUZGEC_ACMA_OLAYI = "suzgec:ac";

type Oynatici = { syncSettings?: () => void };

/** Every question card on the page, read from its data attributes. */
function kartlariOku(): SuzulecekSoru[] {
  return [...document.querySelectorAll<HTMLElement>(".question-card")].map((el) => ({
    // Persistent key set by the player (data id, "id#2" for a repeated id): progress is keyed by it
    id: el.dataset.anahtar ?? el.dataset.id ?? el.id,
    unitNumber: Number.parseInt(el.dataset.unit ?? "0", 10),
    source: el.dataset.source ?? "soru-bankasi",
    sinavlar: (el.dataset.sinav ?? "").split(";").filter(Boolean),
  }));
}

function ilerlemeOku(ders: string): Ilerleme {
  try {
    const veri = JSON.parse(depoOku(`quiz-progress-${ders}`) ?? "{}") as unknown;
    return veri && typeof veri === "object" ? (veri as Ilerleme) : {};
  } catch {
    return {};
  }
}

function Cip({ secili, onClick, children }: { secili: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={secili} onClick={onClick} className="katman-cip">
      <span>{children}</span>
    </button>
  );
}

function Grup({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section aria-label={baslik} className="katman-grup">
      <h3 className="katman-grup-ad">{baslik}</h3>
      <div className="katman-ciplar">{children}</div>
    </section>
  );
}

export default function Suzgec({ ders }: { ders: string }) {
  const [acik, setAcik] = useState(false);
  const [taslak, setTaslak] = useState<SuzgecAyar>(VARSAYILAN_SUZGEC);
  const [sorular, setSorular] = useState<SuzulecekSoru[]>([]);
  const [ilerleme, setIlerleme] = useState<Ilerleme>({});
  const [sira, setSira] = useState<Siralama>(VARSAYILAN_SIRALAMA);
  const dersYolu = typeof location === "undefined" ? null : dersAnahtari(location.pathname);

  useEffect(() => {
    const ac = () => {
      setSorular(kartlariOku());
      setIlerleme(ilerlemeOku(ders));
      setTaslak(suzgecOku(depoOku("quiz-settings")));
      if (dersYolu) setSira(siralamaOku(depoOku(SIRALAMA_ANAHTARI), dersYolu));
      setAcik(true);
    };
    addEventListener(SUZGEC_ACMA_OLAYI, ac);
    return () => removeEventListener(SUZGEC_ACMA_OLAYI, ac);
  }, [ders, dersYolu]);

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
    depoYaz("quiz-settings", suzgecYaz(depoOku("quiz-settings"), taslak));
    if (dersYolu) depoYaz(SIRALAMA_ANAHTARI, siralamaYaz(depoOku(SIRALAMA_ANAHTARI), dersYolu, sira));
    (window as unknown as { quizPlayer?: Oynatici }).quizPlayer?.syncSettings?.();
    setAcik(false);
  };

  return (
    <Drawer.Root open={acik} onOpenChange={setAcik} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="katman-perde" />
        <Drawer.Viewport className="katman-konum" data-yer="sag">
          <Drawer.Popup initialFocus={() => document.getElementById("suzgec-govde") ?? true} className="katman-yuzey">
            <div className="katman-tutamac" aria-hidden />
            <div className="katman-baslik">
              <div className="katman-baslik-metin">
                <Drawer.Title className="katman-ad">Süzgeç</Drawer.Title>
                <Drawer.Description className="katman-bilgi" aria-live="polite">
                  Seçime uyan soru: <span className="tabular-nums">{onizleme}</span> / <span className="tabular-nums">{sorular.length}</span>
                </Drawer.Description>
              </div>
              <button id="suzgec-kapat" type="button" aria-label="Kapat" onClick={() => setAcik(false)} className="katman-kapat">
                <X aria-hidden />
              </button>
            </div>
            <div id="suzgec-govde" tabIndex={-1} data-base-ui-swipe-ignore="y" className="katman-govde">
              <Grup baslik="Sırala">
                {SIRALAMALAR.filter((x) => cikmisVar || (x !== "cikma" && x !== "yeni" && x !== "eski")).map((x) => (
                  <Cip key={x} secili={sira === x} onClick={() => setSira(x)}>
                    {SIRALAMA_ADI[x]}
                  </Cip>
                ))}
              </Grup>
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
            <div className="katman-alt">
              <button
                type="button"
                onClick={() => {
                  setTaslak({ ...VARSAYILAN_SUZGEC });
                  setSira(VARSAYILAN_SIRALAMA);
                }}
                className="katman-dugme"
              >
                Sıfırla
              </button>
              <button type="button" onClick={uygula} className="katman-dugme katman-dugme-birincil">
                Uygula
              </button>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
