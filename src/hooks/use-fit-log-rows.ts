import { useLayoutEffect, useState, type RefObject } from 'react'

const FALLBACK_ROW = 48
const FALLBACK_LINK = 48

type LogFit = {
  rows: number
  archive: boolean
}

const INITIAL_FIT: LogFit = { rows: 3, archive: true }

/**
 * How many recent-log rows fit in the flexible slot above the action pad.
 * The count grows and shrinks with the slot. A row wins over the archive
 * link when only one of them fits.
 */
export function useFitLogRows(slotRef: RefObject<HTMLElement | null>, eventCount: number) {
  const [fit, setFit] = useState<LogFit>(INITIAL_FIT)

  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return

    let frame = 0
    let cancelled = false

    const measure = () => {
      const next = eventCount === 0 ? { rows: 0, archive: false } : fitRows(slot, eventCount)
      setFit((current) =>
        current.rows === next.rows && current.archive === next.archive ? current : next,
      )
    }

    measure()
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    observer.observe(slot)
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [eventCount, slotRef])

  return fit
}

function fitRows(slot: HTMLElement, eventCount: number): LogFit {
  const available = slot.clientHeight
  if (available < 1) return { rows: 0, archive: false }

  const card = slot.querySelector<HTMLElement>('[data-log-card]')
  const row = card?.querySelector<HTMLElement>('[data-log-row]')
  const link = card?.querySelector<HTMLElement>('[data-log-more]')
  const pad = card ? verticalPadding(card) : 24
  const rowHeight = row ? outerHeight(row) : FALLBACK_ROW
  const linkHeight = link ? outerHeight(link) : FALLBACK_LINK

  const countFor = (reserveLink: boolean) => {
    const space = available - pad - (reserveLink ? linkHeight : 0)
    if (rowHeight < 1 || space < rowHeight) return 0
    return Math.floor(space / rowHeight)
  }

  const bare = Math.min(eventCount, countFor(false))
  if (eventCount <= bare) return { rows: bare, archive: false }

  const withLink = Math.min(eventCount, countFor(true))
  if (withLink > 0) return { rows: withLink, archive: true }
  if (bare > 0) return { rows: bare, archive: false }
  return { rows: 0, archive: true }
}

function verticalPadding(element: HTMLElement) {
  const style = getComputedStyle(element)
  return parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
}

function outerHeight(element: HTMLElement) {
  const style = getComputedStyle(element)
  return (
    element.getBoundingClientRect().height +
    parseFloat(style.marginTop) +
    parseFloat(style.marginBottom)
  )
}
