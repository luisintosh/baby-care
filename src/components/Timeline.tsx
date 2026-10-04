import { formatClock, formatDayLabel, formatDuration, startOfLocalDay } from '@/lib/format'
import { caregiverName } from '@/lib/caregiver'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent } from '@/lib/types'

type TimelineProps = {
  events: BabyEvent[]
  onSelect: (event: BabyEvent) => void
}

export function Timeline({ events, onSelect }: TimelineProps) {
  const groups = groupByDay(events)

  if (events.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        Aún no hay registros. Un toque en un emoji y queda.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-2 text-sm text-muted-foreground">
            {group.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.events.map((event) => {
              const meta = kindMeta(event.kind)
              const start = new Date(event.occurred_at)
              const open = event.kind === 'sleep' && !event.ended_at
              const ended = event.ended_at ? new Date(event.ended_at) : null
              const duration =
                event.kind === 'sleep' && ended
                  ? formatDuration(ended.getTime() - start.getTime())
                  : null

              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card/70 px-3 py-3 text-left ring-1 ring-white/6 transition active:bg-card"
                  >
                    <span className="text-2xl" aria-hidden>
                      {meta.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {open
                          ? `${formatClock(start)} — …`
                          : ended
                            ? `${formatClock(start)} – ${formatClock(ended)}`
                            : formatClock(start)}
                        {duration ? ` · ${duration}` : ''}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {open ? 'Durmiendo' : meta.past} · {caregiverName(event.caregiver)}
                        {event.note ? ` · ${event.note}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function groupByDay(events: BabyEvent[]) {
  const map = new Map<number, BabyEvent[]>()
  for (const event of events) {
    const key = startOfLocalDay(new Date(event.occurred_at)).getTime()
    const list = map.get(key) ?? []
    list.push(event)
    map.set(key, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([key, dayEvents]) => ({
      key: String(key),
      label: formatDayLabel(new Date(key)),
      events: dayEvents,
    }))
}
