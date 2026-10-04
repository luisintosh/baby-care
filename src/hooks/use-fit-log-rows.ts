import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const MAX_LOG_ROWS = 3
const MIN_LOG_ROWS = 1

type Fit = {
  rows: number
  gap: '5' | '2' | '1'
}

const LOOSE: Fit = { rows: MAX_LOG_ROWS, gap: '5' }

/**
 * How many recent-log rows fit in a height-locked column.
 * Starts at three and drops one row at a time, never below one.
 * If one row still overflows, the column gap tightens.
 */
export function useFitLogRows<T extends HTMLElement>(ref: RefObject<T | null>, layoutKey: string) {
  const [fit, setFit] = useState<Fit>(LOOSE)
  const [fontsReady, setFontsReady] = useState(() => document.fonts.status === 'loaded')
  const [epoch, setEpoch] = useState(0)
  const fitKey = `${layoutKey}:${fontsReady ? 1 : 0}:${epoch}`
  const fitKeyRef = useRef(fitKey)

  useEffect(() => {
    if (fontsReady) return
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [fontsReady])

  useEffect(() => {
    const onResize = () => setEpoch((current) => current + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const keyChanged = fitKeyRef.current !== fitKey
    fitKeyRef.current = fitKey
    if (keyChanged && (fit.rows !== LOOSE.rows || fit.gap !== LOOSE.gap)) {
      setFit(LOOSE)
      return
    }

    const stepDown = () => {
      if (el.clientHeight < 1) return
      if (el.scrollHeight - el.clientHeight <= 1) return
      setFit((current) => {
        if (current.rows > MIN_LOG_ROWS) return { ...current, rows: current.rows - 1 }
        if (current.gap === '5') return { ...current, gap: '2' }
        if (current.gap === '2') return { ...current, gap: '1' }
        return current
      })
    }

    stepDown()

    let lastHeight = el.clientHeight
    const observer = new ResizeObserver(() => {
      const height = el.clientHeight
      if (height > lastHeight + 1) {
        lastHeight = height
        setFit(LOOSE)
        return
      }
      lastHeight = height
      stepDown()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fit.gap, fit.rows, fitKey, ref])

  return fit
}
