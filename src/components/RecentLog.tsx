import { Link } from 'react-router-dom'
import { caregiverName } from '@/lib/caregiver'
import { formatClock } from '@/lib/format'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent } from '@/lib/types'

type RecentLogProps = {
  events: BabyEvent[]
  loading: boolean
  onSelect: (event: BabyEvent) => void
}

export function RecentLog({ events, loading, onSelect }: RecentLogProps) {
  const recent = events.slice(0, 3)
  const hasEarlier = events.length > 3

  if (loading) {
    return <div className="h-36 rounded-[1.75rem] bg-card/70" aria-hidden />
  }

  return (
    <section className="rounded-[1.75rem] bg-card px-4 py-3">
      {recent.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-muted-foreground">
          Aún no hay registros. Un toque en un emoji y queda.
        </p>
      ) : (
        <ul className="flex flex-col">
          {recent.map((event) => {
            const meta = kindMeta(event.kind)
            const start = new Date(event.occurred_at)
            const open = event.kind === 'sleep' && !event.ended_at
            const ended = event.ended_at ? new Date(event.ended_at) : null
            const when = open
              ? `${formatClock(start)} — …`
              : ended
                ? `${formatClock(start)}–${formatClock(ended)}`
                : formatClock(start)

            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-clock text-lg leading-none tracking-tight">{when}</span>
                    {event.note ? (
                      <span className="ml-2 text-sm text-muted-foreground">{event.note}</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-foreground/80">{caregiverName(event.caregiver)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {hasEarlier ? (
        <Link
          to="/historial"
          className="mt-1 block border-t border-white/10 py-3 text-center text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Ver anteriores
        </Link>
      ) : null}
    </section>
  )
}
