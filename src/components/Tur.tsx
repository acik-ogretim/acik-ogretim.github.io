// First-visit tip tour for the course page: four short steps, skippable, shown once (flag in localStorage).
// "Turu yeniden göster" in the menu starts it again through the `tur:baslat` window event.
import { useCallback, useEffect, useRef, useState } from "react";

export const TUR_OLAYI = "tur:baslat";
const ANAHTAR = "tur-goruldu";

type Adim = { hedef: string; baslik: string; metin: string };

const ADIMLAR: Adim[] = [
  { hedef: "#btn-mobil-menu", baslik: "Alt çubuk ve menü", metin: "Menü her işlevi açar. Düzenle ile alt çubuğu kendi sıranla kur." },
  { hedef: "#btn-toggle-reader", baslik: "Soruyu dinle", metin: "Sesli okuma modunu aç; soru ve açıklamalar sesli okunur." },
  { hedef: "#btn-open-settings", baslik: "Yapay zekâ açıklaması", metin: "Ayarlar, Yapay zekâ bölümündeki Anahtar al bağlantısı ücretsiz anahtara götürür." },
  { hedef: "#btn-mobil-menu", baslik: "Kayıtlarını taşı", metin: "Menüden Kayıtlarını taşı ile çözümlerini başka cihaza aktar." },
];

const gorulduYaz = () => {
  try {
    localStorage.setItem(ANAHTAR, "1");
  } catch {
    // Storage unavailable: the tour simply shows again next visit.
  }
};

export default function Tur() {
  const [adim, setAdim] = useState<number | null>(null);
  const [kutu, setKutu] = useState<DOMRect | null>(null);
  const barEkledik = useRef(false);
  const kart = useRef<HTMLDivElement>(null);

  const baslat = useCallback(() => {
    const bar = document.getElementById("quiz-player-bar");
    if (bar && !bar.classList.contains("visible")) {
      bar.classList.add("visible");
      barEkledik.current = true;
    }
    setAdim(0);
  }, []);

  const bitir = useCallback(() => {
    gorulduYaz();
    if (barEkledik.current) document.getElementById("quiz-player-bar")?.classList.remove("visible");
    barEkledik.current = false;
    setAdim(null);
  }, []);

  // First visit: start once the page has settled.
  useEffect(() => {
    let goruldu = false;
    try {
      goruldu = !!localStorage.getItem(ANAHTAR);
    } catch {
      goruldu = false;
    }
    const zaman = goruldu ? 0 : window.setTimeout(baslat, 2500);
    addEventListener(TUR_OLAYI, baslat);
    return () => {
      clearTimeout(zaman);
      removeEventListener(TUR_OLAYI, baslat);
    };
  }, [baslat]);

  // Follow the target while the step shows (resize, scroll, bar trimming).
  useEffect(() => {
    if (adim === null) return;
    const olc = () => {
      const el = document.querySelector<HTMLElement>(ADIMLAR[adim].hedef);
      const r = el?.getBoundingClientRect();
      setKutu(r && r.width > 0 ? r : null);
    };
    olc();
    const aralik = window.setInterval(olc, 400);
    addEventListener("resize", olc);
    return () => {
      clearInterval(aralik);
      removeEventListener("resize", olc);
    };
  }, [adim]);

  useEffect(() => {
    if (adim === null) return;
    kart.current?.querySelector<HTMLElement>("[data-ilk]")?.focus();
    const tus = (e: KeyboardEvent) => e.key === "Escape" && bitir();
    addEventListener("keydown", tus);
    return () => removeEventListener("keydown", tus);
  }, [adim, bitir]);

  if (adim === null) return null;
  const a = ADIMLAR[adim];
  const son = adim === ADIMLAR.length - 1;
  const dugme = "h-11 rounded-lg px-4 text-sm font-semibold active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-color)]";

  return (
    <div className="fixed inset-0 z-[200]" role="presentation">
      {kutu ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl transition-all duration-200 motion-reduce:transition-none"
          style={{
            left: kutu.left - 6,
            top: kutu.top - 6,
            width: kutu.width + 12,
            height: kutu.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 2px var(--primary-color)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/60" />
      )}
      <div
        ref={kart}
        role="dialog"
        aria-label={`İpucu turu, adım ${adim + 1} / ${ADIMLAR.length}`}
        className="fixed left-1/2 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-theme p-4 shadow-2xl"
        style={{
          bottom: "calc(5rem + env(safe-area-inset-bottom) + var(--klavye, 0px))",
          background: "var(--card-bg)",
          color: "var(--text-color)",
        }}
      >
        <p className="text-xs text-muted-theme">
          {adim + 1} / {ADIMLAR.length}
        </p>
        <h2 className="mt-1 line-clamp-1 text-base font-semibold">{a.baslik}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted-theme">{a.metin}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={bitir} className={`${dugme} text-muted-theme`}>
            Atla
          </button>
          <div className="flex gap-2">
            {adim > 0 && (
              <button type="button" onClick={() => setAdim(adim - 1)} className={`${dugme} border border-theme`}>
                Geri
              </button>
            )}
            <button
              type="button"
              data-ilk=""
              onClick={() => (son ? bitir() : setAdim(adim + 1))}
              className={`${dugme} bg-[var(--primary-color)] text-[var(--primary-color-text)]`}
            >
              {son ? "Bitti" : "İleri"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
