import { whoLabel } from '@/lib/caregiver'
import { addDays, formatClock, formatDayLabel, formatDuration, formatElapsed, startOfLocalDay } from '@/lib/format'
import { DAY_START_HOUR, NIGHT_START_HOUR } from '@/lib/feed-schedule'
import { kindMeta } from '@/lib/kinds'
import { cn } from '@/lib/utils'
import type { BabyEvent, Caregiver } from '@/lib/types'

type TimelineProps = {
  caregiver: Caregiver
  events: BabyEvent[]
  onSelect: (event: BabyEvent) => void
}

type Shift = {
  key: string
  label: string
  events: BabyEvent[]
}

/**
 * Care runs in shifts, not calendar days: a night (22:00–07:00) stays in one
 * group instead of being cut at midnight.
 */
function shiftOf(date: Date) {
  const hour = date.getHours()
  if (hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR) {
    return { start: startOfLocalDay(date), night: false }
  }
  const base = hour < DAY_START_HOUR ? addDays(startOfLocalDay(date), -1) : startOfLocalDay(date)
  return { start: base, night: true }
}

function shiftLabel(start: Date, night: boolean) {
  const day = formatDayLabel(start)
  if (!night) return day
  if (day === 'Hoy') return 'Esta noche'
  if (day === 'Ayer') return 'Anoche'
  return `Noche del ${day.charAt(0).toLowerCase()}${day.slice(1)}`
}

function groupByShift(events: BabyEvent[]): Shift[] {
  const groups = new Map<string, Shift>()
  for (const event of events) {
    const { start, night } = shiftOf(new Date(event.occurred_at))
    const key = `${start.getTime()}-${night ? 'n' : 'd'}`
    const group = groups.get(key) ?? { key, label: shiftLabel(start, night), events: [] }
    group.events.push(event)
    groups.set(key, group)
  }
  return [...groups.values()]
}

/** Gap since the previous feed, keyed by feed id. */
function feedGaps(events: BabyEvent[]) {
  const feeds = events
    .filter((event) => event.kind === 'feed')
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  const gaps = new Map<number, number>()
  for (let i = 1; i < feeds.length; i += 1) {
    gaps.set(
      feeds[i].id,
      new Date(feeds[i].occurred_at).getTime() - new Date(feeds[i - 1].occurred_at).getTime(),
    )
  }
  return gaps
}

function summary(events: BabyEvent[]) {
  const feeds = events.filter((event) => event.kind === 'feed').length
  const poops = events.filter((event) => event.kind === 'poop').length
  const meds = events.filter((event) => event.kind === 'medicine').length
  const solids = events.filter((event) => event.kind === 'solid').length
  const now = Date.now()
  const sleepMs = events
    .filter((event) => event.kind === 'sleep')
    .reduce((total, event) => {
      const end = event.ended_at ? new Date(event.ended_at).getTime() : now
      return total + Math.max(0, end - new Date(event.occurred_at).getTime())
    }, 0)
  return [
    feeds ? `${feeds} 🍼` : null,
    solids ? `${solids} 🥣` : null,
    poops ? `${poops} 💩` : null,
    meds ? `${meds} 💊` : null,
    sleepMs >= 60_000 ? `😴 ${formatDuration(sleepMs)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function Timeline({ caregiver, events, onSelect }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No hay registros en los últimos 14 días.
      </p>
    )
  }

  const groups = groupByShift(events)
  const gaps = feedGaps(events)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-0 z-10 -mx-5 flex items-baseline justify-between gap-3 bg-background/95 px-5 py-2 backdrop-blur-sm">
            <span className="text-base font-semibold">{group.label}</span>
            <span className="text-sm text-muted-foreground">{summary(group.events)}</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {group.events.map((event) => (
              <li key={event.id}>
                <TimelineRow
                  event={event}
                  caregiver={caregiver}
                  gap={gaps.get(event.id)}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="pb-2 text-center text-sm text-muted-foreground">Mostrando los últimos 14 días</p>
    </div>
  )
}

function TimelineRow({
  event,
  caregiver,
  gap,
  onSelect,
}: {
  event: BabyEvent
  caregiver: Caregiver
  gap: number | undefined
  onSelect: (event: BabyEvent) => void
}) {
  const meta = kindMeta(event.kind)
  const start = new Date(event.occurred_at)
  const open = event.kind === 'sleep' && !event.ended_at
  const ended = event.ended_at ? new Date(event.ended_at) : null
  const time = ended ? `${formatClock(start)}–${formatClock(ended)}` : formatClock(start)
  const extra = open
    ? `Durmiendo · ${formatElapsed(start)}`
    : ended
      ? `Durmió ${formatDuration(ended.getTime() - start.getTime())}`
      : gap
        ? `+${formatDuration(gap)} desde la anterior`
        : null
  const note = event.note?.trim()
  const who = whoLabel(event.caregiver, caregiver)

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      disabled={event.pending}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl bg-card px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-secondary',
        event.pending && 'opacity-60',
      )}
    >
      <span className="kind-emoji pt-0.5 text-2xl leading-none" aria-hidden>
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-clock text-base font-medium">{time}</span>
          <span className={cn('text-sm', who === 'Tú' ? 'text-muted-foreground' : 'font-medium')}>{who}</span>
        </span>
        <span className="block text-sm text-muted-foreground">
          {meta.label}
          {extra ? (
            <>
              {' · '}
              <span className={open ? 'font-medium text-sleep' : undefined}>{extra}</span>
            </>
          ) : null}
        </span>
        {note ? <span className="mt-1 block text-sm leading-snug break-words text-foreground/85">{note}</span> : null}
      </span>
    </button>
  )
}
