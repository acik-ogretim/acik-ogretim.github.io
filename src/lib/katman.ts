/**
 * Shared behaviour for native overlays (`dialog.katman-yuzey`, DESIGN.md §5 "Ortak katman sözleşmesi").
 * The look, motion, scrim and scroll lock live in src/styles/katman.css; showModal() already gives
 * focus trapping, Esc, inert background and focus return. This adds only what the platform lacks
 * everywhere: closing on a scrim tap (until `closedby="any"` is common) and dragging a phone sheet
 * down by its handle or title row.
 */

const ESIK = 80; // px dragged down before the sheet closes

export function katmanAc(id: string): HTMLDialogElement | null {
  const d = document.getElementById(id);
  if (!(d instanceof HTMLDialogElement)) return null;
  if (!d.open) d.showModal();
  return d;
}

export function katmanKapat(id: string): void {
  const d = document.getElementById(id);
  if (d instanceof HTMLDialogElement && d.open) d.close();
}

function disarida(d: HTMLDialogElement, e: MouseEvent): boolean {
  const r = d.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

export function katmanlariBagla(): void {
  if (document.documentElement.dataset.katman) return;
  document.documentElement.dataset.katman = "1";

  // Scrim tap: the click lands on the dialog element itself, outside its box.
  document.addEventListener("click", (e) => {
    const d = e.target;
    if (d instanceof HTMLDialogElement && d.open && d.classList.contains("katman-yuzey") && disarida(d, e)) d.close();
  });

  // Drag down from the handle or the title row (phones only; wide screens show a window or a drawer).
  let surukle: { d: HTMLDialogElement; y: number; id: number } | null = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !matchMedia("(max-width: 767px)").matches) return;
    const t = e.target as Element | null;
    const tut = t?.closest(".katman-tutamac, .katman-baslik");
    if (!tut || t?.closest("button, a, input, select, textarea")) return;
    const d = tut.closest("dialog.katman-yuzey");
    if (!(d instanceof HTMLDialogElement) || !d.open) return;
    surukle = { d, y: e.clientY, id: e.pointerId };
  });
  document.addEventListener("pointermove", (e) => {
    if (!surukle || e.pointerId !== surukle.id) return;
    const dy = Math.max(0, e.clientY - surukle.y);
    surukle.d.toggleAttribute("data-surukle", dy > 0);
    surukle.d.style.setProperty("--surukle", `${dy}px`); // CSS-degiskeni: finger distance, CSS cannot know it
  });
  const birak = (e: PointerEvent) => {
    if (!surukle || e.pointerId !== surukle.id) return;
    const { d, y } = surukle;
    surukle = null;
    const temizle = () => {
      d.removeAttribute("data-surukle");
      d.style.removeProperty("--surukle");
    };
    if (e.clientY - y > ESIK) {
      d.close(); // the exit transition starts from where the finger left the sheet
      requestAnimationFrame(temizle);
    } else temizle();
  };
  document.addEventListener("pointerup", birak);
  document.addEventListener("pointercancel", birak);
}
