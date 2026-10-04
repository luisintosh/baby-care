import { formatDuration } from './format.ts'

export const FEED_TIME_ZONE = 'America/Mexico_City'
export const DAY_START_HOUR = 7
export const NIGHT_START_HOUR = 20
export const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000
export const MIN_GAP_MS = 20 * 60 * 1000
export const MAX_GAP_MS = 8 * 60 * 60 * 1000
export const MIN_GAPS = 3
export const DEFAULT_DAY_MS = 3 * 60 * 60 * 1000
export const DEFAULT_NIGHT_MS = 4 * 60 * 60 * 1000
export const FOLLOWUP_AFTER_MS = 30 * 60 * 1000

export type FeedPeriod = 'day' | 'night'

export type FeedPoint = {
  id: number
  occurredAt: Date
}

export type NextFeed = {
  last: FeedPoint
  dueAt: Date
  period: FeedPeriod
  intervalMs: number
}

export type FeedAlertState = {
  notifiedFeedId: number | null
  followupFeedId: number | null
}

export type FeedAlert = {
  kind: 'due' | 'followup'
  feedId: number
  title: string
  body: string
  tag: 'feed-due'
}

export function mexicoCityHour(date: Date) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: FEED_TIME_ZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour')?.value
  const value = Number(hour)
  if (!Number.isFinite(value)) return 0
  return value === 24 ? 0 : value
}

export function feedPeriod(date: Date): FeedPeriod {
  const hour = mexicoCityHour(date)
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'day' : 'night'
}

export function periodLabel(period: FeedPeriod) {
  return period === 'day' ? 'día' : 'noche'
}

export function formatFeedClock(date: Date) {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FEED_TIME_ZONE,
  })
}

export function nextFeedLabel(next: NextFeed, now = new Date()) {
  const clock = formatFeedClock(next.dueAt)
  const period = periodLabel(next.period)
  if (now.getTime() >= next.dueAt.getTime()) return `Toca comida desde ${clock} · ${period}`
  return `Próxima comida ${clock} · ${period}`
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function intervalFor(period: FeedPeriod, dayGaps: number[], nightGaps: number[]) {
  const own = period === 'day' ? dayGaps : nightGaps
  const other = period === 'day' ? nightGaps : dayGaps
  if (own.length >= MIN_GAPS) return median(own)
  if (other.length >= MIN_GAPS) return median(other)
  return period === 'day' ? DEFAULT_DAY_MS : DEFAULT_NIGHT_MS
}

export function nextFeed(points: FeedPoint[], now = new Date()): NextFeed | null {
  const feeds = points
    .filter((point) => point.occurredAt.getTime() <= now.getTime())
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
  const last = feeds.at(-1)
  if (!last) return null

  const windowStart = now.getTime() - LOOKBACK_MS
  const dayGaps: number[] = []
  const nightGaps: number[] = []
  for (let index = 1; index < feeds.length; index += 1) {
    const earlier = feeds[index - 1]
    const later = feeds[index]
    if (earlier.occurredAt.getTime() < windowStart) continue
    const gap = later.occurredAt.getTime() - earlier.occurredAt.getTime()
    if (gap < MIN_GAP_MS || gap > MAX_GAP_MS) continue
    const bucket = feedPeriod(earlier.occurredAt) === 'day' ? dayGaps : nightGaps
    bucket.push(gap)
  }

  const period = feedPeriod(last.occurredAt)
  const intervalMs = intervalFor(period, dayGaps, nightGaps)
  return {
    last,
    dueAt: new Date(last.occurredAt.getTime() + intervalMs),
    period,
    intervalMs,
  }
}

export function dueFeedAlert(
  next: NextFeed | null,
  state: FeedAlertState,
  now = new Date(),
): FeedAlert | null {
  if (!next || now.getTime() < next.dueAt.getTime()) return null

  const elapsed = formatDuration(now.getTime() - next.last.occurredAt.getTime())
  if (state.notifiedFeedId !== next.last.id) {
    return {
      kind: 'due',
      feedId: next.last.id,
      title: 'Toca comida',
      body: `Han pasado ${elapsed} desde la última. Ritmo de ${periodLabel(next.period)}: cada ${formatDuration(next.intervalMs)}.`,
      tag: 'feed-due',
    }
  }

  if (
    now.getTime() >= next.dueAt.getTime() + FOLLOWUP_AFTER_MS &&
    state.followupFeedId !== next.last.id
  ) {
    return {
      kind: 'followup',
      feedId: next.last.id,
      title: 'Sigue sin comida',
      body: `La última fue hace ${elapsed}.`,
      tag: 'feed-due',
    }
  }

  return null
}
