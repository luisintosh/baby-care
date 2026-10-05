/**
 * Pin the shell to the screen the person can actually see.
 *
 * On an iPhone home-screen app, `100svh`, `100dvh`, and `visualViewport.height`
 * are short by the top safe area. A box that tall, stuck to the top of the
 * screen, hides the name under the status bar and leaves a dead band above
 * the home indicator. `100lvh` (or the screen, when iOS reports `lvh` short)
 * is the full display; the header and the tab bar pad themselves out of the
 * insets.
 *
 * Safari is the opposite: the large viewport is taller than the page you can
 * see while the toolbars are up, so the shell follows `visualViewport` there.
 */

const KEYBOARD_GAP = 120

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isEditableFocused() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

function measureLargeHeight() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none;'
  document.documentElement.appendChild(probe)
  const value = probe.offsetHeight
  probe.remove()
  return value
}

function cssScreenHeight() {
  const { width, height } = window.screen
  return window.matchMedia('(orientation: portrait)').matches
    ? Math.max(width, height)
    : Math.min(width, height)
}

function readInset(edge: 'top' | 'bottom') {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;left:0;visibility:hidden;pointer-events:none;padding-${edge}:env(safe-area-inset-${edge},0px);`
  document.documentElement.appendChild(probe)
  const value = parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${edge}`))
  probe.remove()
  return Number.isFinite(value) ? value : 0
}

export function bindAppViewport() {
  const root = document.documentElement
  const standalone = isStandalone()
  if (standalone) root.classList.add('standalone')

  let fullHeight = 0
  let measuredWidth = -1

  const refreshScreen = () => {
    const large = measureLargeHeight()
    const screen = cssScreenHeight()
    // A home-screen app can report lvh an inset short of the display. The
    // screen is only trusted for that gap, not for a desktop monitor.
    fullHeight =
      standalone && screen > large && screen - large < KEYBOARD_GAP + 40 ? screen : large || screen
    measuredWidth = window.innerWidth

    const viewport = window.visualViewport
    const visibleBottom = viewport ? viewport.height + viewport.offsetTop : fullHeight
    const omitted = Math.max(0, fullHeight - visibleBottom)
    const envTop = readInset('top')
    const safeTop =
      standalone && omitted > 0 && omitted < KEYBOARD_GAP ? Math.max(envTop, omitted) : envTop
    root.style.setProperty('--safe-top', `${Math.round(Math.min(safeTop, KEYBOARD_GAP))}px`)
  }

  const apply = () => {
    if (window.innerWidth !== measuredWidth) refreshScreen()

    const viewport = window.visualViewport
    const offsetTop = viewport?.offsetTop ?? 0
    const visual = viewport?.height ?? window.innerHeight
    const keyboard =
      standalone && isEditableFocused() && fullHeight - (visual + offsetTop) > KEYBOARD_GAP

    if (standalone && !keyboard) {
      root.style.setProperty('--app-top', '0px')
      root.style.setProperty('--app-height', `${Math.round(fullHeight)}px`)
      return
    }

    root.style.setProperty('--app-top', `${offsetTop}px`)
    root.style.setProperty('--app-height', `${Math.round(visual)}px`)
  }

  refreshScreen()
  apply()
  window.visualViewport?.addEventListener('resize', apply)
  window.visualViewport?.addEventListener('scroll', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
  document.addEventListener('focusin', apply)
  document.addEventListener('focusout', apply)
  requestAnimationFrame(() => {
    refreshScreen()
    apply()
    requestAnimationFrame(apply)
  })
}
