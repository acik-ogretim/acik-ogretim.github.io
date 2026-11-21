// One short notice at the bottom of the screen with an optional action ("Geri al", "Süzgeci kaldır").
// A polite live region announces it; a new notice replaces the old one. Styled with the theme
// utilities only (no global.css block): it sits above the player bar and the safe area.

export type BildirimSecenek = {
  metin: string;
  eylem?: { etiket: string; calistir: () => void };
  /** Milliseconds before it closes by itself (default 8000). */
  sure?: number;
  /** Runs when it closes without the action being used. */
  kapaninca?: () => void;
};

let kapat: (() => void) | null = null;

function alan(): HTMLElement {
  let el = document.getElementById("bildirim-alani");
  if (!el) {
    el = document.createElement("div");
    el.id = "bildirim-alani";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.className = "pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4 print:hidden";
    el.style.bottom = "calc(env(safe-area-inset-bottom) + 92px)";
    document.body.append(el);
  }
  return el;
}

/** Shows the notice and returns a function that closes it. */
export function bildir(s: BildirimSecenek): () => void {
  kapat?.();
  const kok = alan();
  const kutu = document.createElement("div");
  kutu.className =
    "pointer-events-auto flex w-full max-w-[480px] items-center gap-2 rounded-2xl border border-line-strong bg-raised py-2 pl-4 pr-2 text-ink shadow-lg";
  kutu.dataset.testid = "bildirim";
  const metin = document.createElement("span");
  metin.className = "min-w-0 flex-1 text-[15px] leading-snug";
  metin.textContent = s.metin;
  kutu.append(metin);

  let kullanildi = false;
  let zamanlayici = 0;
  const bitir = () => {
    window.clearTimeout(zamanlayici);
    kutu.remove();
    if (kapat === bitir) kapat = null;
    if (!kullanildi) s.kapaninca?.();
  };

  if (s.eylem) {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "min-h-11 shrink-0 rounded-xl px-3 text-[15px] font-semibold text-accent-ink hover:bg-control";
    d.textContent = s.eylem.etiket;
    d.addEventListener("click", () => {
      kullanildi = true;
      bitir();
      s.eylem?.calistir();
    });
    kutu.append(d);
  }
  const x = document.createElement("button");
  x.type = "button";
  x.className = "grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-control";
  x.setAttribute("aria-label", "Bildirimi kapat");
  x.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  x.addEventListener("click", bitir);
  kutu.append(x);

  kok.replaceChildren(kutu);
  zamanlayici = window.setTimeout(bitir, s.sure ?? 8000);
  kapat = bitir;
  return bitir;
}
