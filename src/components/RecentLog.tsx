import { Link } from 'react-router-dom'
import { caregiverName } from '@/lib/caregiver'
import { formatClock } from '@/lib/format'
import { kindMeta } from '@/lib/kinds'
import { cn } from '@/lib/utils'
import type { BabyEvent } from '@/lib/types'

type RecentLogProps = {
  events: BabyEvent[]
  loading: boolean
  onSelect: (event: BabyEvent) => void
}

export function RecentLog({ events, loading, onSelect }: RecentLogProps) {
  const recent = events.slice(0, 3)
  const hasEarlier = events.length > recent.length

  if (loading) {
    return (
      <section className="rounded-[1.75rem] bg-card px-4 py-3" aria-hidden>
        <div className="flex flex-col gap-1">
          <div className="h-11 rounded-2xl bg-white/5" />
          <div className="h-11 rounded-2xl bg-white/5" />
          <div className="h-11 rounded-2xl bg-white/5" />
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className="rounded-[1.75rem] bg-card px-4 py-3">
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Aún no hay registros. Un toque en un emoji y queda.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[1.75rem] bg-card px-4 py-3">
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
          const who = caregiverName(event.caregiver)
          const note = event.note?.trim() || null

          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event)}
                aria-label={[meta.label, when, who, note].filter(Boolean).join(', ')}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-1 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
              >
                <span className={cn('text-2xl leading-none', note && 'row-span-2')} aria-hidden>
                  {meta.emoji}
                </span>
                <span className="font-clock text-base leading-none tracking-tight tabular-nums">
                  {when}
                </span>
                <span
                  className={cn(
                    'text-right text-sm text-foreground/80',
                    note && 'row-span-2 self-center',
                  )}
                >
                  {who}
                </span>
                {note ? (
                  <span className="col-start-2 truncate text-sm leading-tight text-muted-foreground">
                    {note}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
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
