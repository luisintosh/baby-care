import { formatDuration } from './format.ts'

export const FEED_TIME_ZONE = 'America/Mexico_City'
export const DAY_START_HOUR = 7
export const NIGHT_START_HOUR = 22
export const DEFAULT_DAY_MINUTES = 240
export const DEFAULT_NIGHT_MINUTES = 300
export const DEFAULT_DAY_MS = DEFAULT_DAY_MINUTES * 60 * 1000
export const DEFAULT_NIGHT_MS = DEFAULT_NIGHT_MINUTES * 60 * 1000
export const MIN_INTERVAL_MINUTES = 30
export const MAX_INTERVAL_MINUTES = 480
export const INTERVAL_STEP_MINUTES = 15
export const PREP_BEFORE_MS = 15 * 60 * 1000
export const FOLLOWUP_AFTER_MS = 30 * 60 * 1000

export type FeedPeriod = 'day' | 'night'

export type FeedIntervals = {
  dayMinutes: number
  nightMinutes: number
}

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

export const DEFAULT_FEED_INTERVALS: FeedIntervals = {
  dayMinutes: DEFAULT_DAY_MINUTES,
  nightMinutes: DEFAULT_NIGHT_MINUTES,
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

export function clampIntervalMinutes(minutes: number) {
  const stepped = Math.round(minutes / INTERVAL_STEP_MINUTES) * INTERVAL_STEP_MINUTES
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, stepped))
}

export function intervalMsFor(period: FeedPeriod, intervals: FeedIntervals) {
  const minutes = period === 'day' ? intervals.dayMinutes : intervals.nightMinutes
  return clampIntervalMinutes(minutes) * 60 * 1000
}

export function nextFeedLabel(next: NextFeed, now = new Date()) {
  const clock = formatFeedClock(next.dueAt)
  const period = periodLabel(next.period)
  if (now.getTime() >= next.dueAt.getTime()) return `Toca comida desde ${clock} · ${period}`
  return `Próxima comida ${clock} · ${period}`
}

export function nextFeed(
  points: FeedPoint[],
  intervals: FeedIntervals = DEFAULT_FEED_INTERVALS,
  now = new Date(),
): NextFeed | null {
  const feeds = points
    .filter((point) => point.occurredAt.getTime() <= now.getTime())
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
  const last = feeds.at(-1)
  if (!last) return null

  const period = feedPeriod(last.occurredAt)
  const intervalMs = intervalMsFor(period, intervals)
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
  if (!next || now.getTime() < next.dueAt.getTime() - PREP_BEFORE_MS) return null

  const elapsed = formatDuration(now.getTime() - next.last.occurredAt.getTime())
  if (state.notifiedFeedId !== next.last.id) {
    const early = now.getTime() < next.dueAt.getTime()
    const clock = formatFeedClock(next.dueAt)
    return {
      kind: 'due',
      feedId: next.last.id,
      title: early ? 'Prepara la comida' : 'Toca comida',
      body: early
        ? `Toca a las ${clock}, horario de ${periodLabel(next.period)}: cada ${formatDuration(next.intervalMs)}.`
        : `Han pasado ${elapsed} desde la última. Horario de ${periodLabel(next.period)}: cada ${formatDuration(next.intervalMs)}.`,
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
