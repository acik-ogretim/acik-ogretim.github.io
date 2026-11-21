// The explanation text as it came with the page. Saved or AI-written text replaces an explanation's HTML; "Özgün metne
// dön" needs the first version back. It is kept in memory at the first change (the page no longer carries a hidden copy
// of every explanation), so call sakla() before anything writes to .explanation-content.
const ozgunler = new WeakMap<Element, string>();

/** Remember the element's current HTML once, before its first change. */
export function sakla(el: Element): void {
  if (!ozgunler.has(el)) ozgunler.set(el, el.innerHTML);
}

/** Original HTML (the current HTML when it was never changed). */
export function ozgunHtml(el: Element): string {
  return ozgunler.get(el) ?? el.innerHTML;
}

/** Original text without markup, for prompts. */
export function ozgunMetni(el: Element): string {
  const t = document.createElement("div");
  t.innerHTML = ozgunHtml(el);
  return (t.textContent ?? "").trim();
}
