/**
 * Tracks the visible area so bottom-anchored panels sit right above the on-screen keyboard.
 *
 * Sets on <html>:
 *  - --app-height: height of the visual viewport in px
 *  - --klavye: space the keyboard takes below the layout viewport in px (0 when closed)
 *  - data-keyboard: present while the keyboard is open
 *
 * Chrome on Android resizes the layout viewport itself (interactive-widget=resizes-content), so
 * --klavye stays 0 there. iOS Safari only shrinks the visual viewport and scrolls it, so the gap
 * is window.innerHeight - vv.height - vv.offsetTop.
 */
export function startViewport(): void {
  const vv = window.visualViewport
  if (!vv) return
  const root = document.documentElement
  const sync = () => {
    const gap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    root.style.setProperty('--app-height', `${Math.round(vv.height)}px`)
    root.style.setProperty('--klavye', `${gap}px`)
    // A visual viewport much shorter than the window means the on-screen keyboard is up.
    root.toggleAttribute('data-keyboard', gap > 120)
  }
  // Third-party keyboards (SwiftKey) and the iOS form bar settle after the first resize event,
  // so the height is read again once the animation ends; focus changes trigger the same pass.
  let timers: Array<ReturnType<typeof setTimeout>> = []
  const settle = () => {
    sync()
    for (const id of timers) clearTimeout(id)
    timers = [120, 400, 800].map((ms) => setTimeout(sync, ms))
  }
  vv.addEventListener('resize', settle)
  vv.addEventListener('scroll', sync)
  window.addEventListener('focusin', settle)
  window.addEventListener('focusout', settle)
  sync()
}
