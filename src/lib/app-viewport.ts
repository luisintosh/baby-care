/**
 * Size the app to the visible viewport and stop the document from scrolling.
 *
 * On iPhone, Safari's layout viewport is taller than the screen while the
 * toolbars are up. A fixed bottom bar plus `env(safe-area-inset-bottom)` then
 * leaves an empty band, and swiping the toolbars away makes the page scroll.
 * Tracking `visualViewport` and cancelling drags that are not inside a
 * scrolling region keeps Registrar still.
 */
export function bindAppViewport() {
  const root = document.documentElement
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)

  if (standalone) root.classList.add('standalone')

  const apply = () => {
    const viewport = window.visualViewport
    const height = viewport?.height ?? window.innerHeight
    const offsetTop = viewport?.offsetTop ?? 0
    root.style.setProperty('--app-height', `${height}px`)
    root.style.setProperty('--app-top', `${offsetTop}px`)
  }

  apply()
  window.visualViewport?.addEventListener('resize', apply)
  window.visualViewport?.addEventListener('scroll', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}
