import { Link } from 'react-router-dom'
import { caregiverName, whoLabel } from '@/lib/caregiver'
import { formatAgo, formatClock, formatDuration, formatElapsed, formatWhen } from '@/lib/format'
import { computeHandoff } from '@/lib/handoff'
import { kindMeta } from '@/lib/kinds'
import { cn } from '@/lib/utils'
import type { BabyEvent, Caregiver } from '@/lib/types'

type RecentLogProps = {
  caregiver: Caregiver
  events: BabyEvent[]
  loading: boolean
  failed: boolean
  onSelect: (event: BabyEvent) => void
}

export function RecentLog({ caregiver, events, loading, failed, onSelect }: RecentLogProps) {
  const recent = events.slice(0, 3)
  const hasEarlier = events.length > recent.length

  if (loading) {
    return (
      <section className="rounded-[1.75rem] bg-card px-3 py-2" aria-busy="true" aria-label="Cargando registros">
        <div className="flex flex-col gap-1">
          <div className="h-11 rounded-2xl bg-foreground/5" />
          <div className="h-11 rounded-2xl bg-foreground/5" />
          <div className="h-11 rounded-2xl bg-foreground/5" />
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    if (failed) return null
    return (
      <section className="rounded-[1.75rem] bg-card px-3 py-2">
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Aún no hay registros. Toca un botón de abajo y queda guardado.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[1.75rem] bg-card px-3 py-2" aria-label="Últimos registros">
      <HandoffLine caregiver={caregiver} events={events} />
      <ul className="flex flex-col">
        {recent.map((event) => (
          <li key={event.id}>
            <LogRow event={event} caregiver={caregiver} onSelect={onSelect} />
          </li>
        ))}
      </ul>
      {hasEarlier ? (
        <Link
          to="/historial"
          className="mt-1 flex min-h-11 items-center justify-center border-t border-border text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Ver historial
        </Link>
      ) : null}
    </section>
  )
}

function HandoffLine({ caregiver, events }: { caregiver: Caregiver; events: BabyEvent[] }) {
  const handoff = computeHandoff(events, caregiver)
  if (!handoff) return null

  const parts = [
    handoff.feeds ? `${handoff.feeds} 🍼` : null,
    handoff.solids ? `${handoff.solids} 🥣` : null,
    handoff.poops ? `${handoff.poops} 💩` : null,
    handoff.medicines ? `${handoff.medicines} 💊` : null,
    handoff.sleepMs >= 60_000 ? `😴 ${formatDuration(handoff.sleepMs)}` : null,
  ].filter(Boolean)
  const when = handoff.since ? `Desde tu último registro (${formatAgo(handoff.since)})` : 'En las últimas 12 h'

  return (
    <p className="mb-1 border-b border-border px-1 pt-1.5 pb-2.5 text-sm leading-snug text-muted-foreground">
      {when}, <span className="font-medium text-foreground">{caregiverName(handoff.by)}</span> registró:{' '}
      {parts.map((part, index) => (
        <span key={index} className="whitespace-nowrap text-foreground">
          {index > 0 ? ' · ' : ''}
          {part}
        </span>
      ))}
    </p>
  )
}

function LogRow({
  event,
  caregiver,
  onSelect,
}: {
  event: BabyEvent
  caregiver: Caregiver
  onSelect: (event: BabyEvent) => void
}) {
  const meta = kindMeta(event.kind)
  const start = new Date(event.occurred_at)
  const open = event.kind === 'sleep' && !event.ended_at
  const ended = event.ended_at ? new Date(event.ended_at) : null
  const when = ended ? `${formatWhen(start)}–${formatClock(ended)}` : formatWhen(start)
  const who = whoLabel(event.caregiver, caregiver)
  const note = event.note?.trim() || null
  const detail = event.pending
    ? 'Guardando…'
    : open
      ? `Durmiendo · ${formatElapsed(start)}`
      : ended
        ? `Durmió ${formatDuration(ended.getTime() - start.getTime())}`
        : note

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      disabled={event.pending}
      aria-label={[meta.label, open ? `durmiendo desde ${when}` : when, who, detail].filter(Boolean).join(', ')}
      className={cn(
        'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-1 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-foreground/5',
        event.pending && 'opacity-60',
      )}
    >
      <span className={cn('kind-emoji text-2xl leading-none', detail && 'row-span-2')} aria-hidden>
        {meta.emoji}
      </span>
      <span className="font-clock text-base leading-tight font-medium">{when}</span>
      <span
        className={cn(
          'text-right text-sm',
          who === 'Tú' ? 'text-muted-foreground' : 'font-medium text-foreground',
          detail && 'row-span-2 self-center',
        )}
      >
        {who}
      </span>
      {detail ? (
        <span
          className={cn(
            'col-start-2 line-clamp-2 text-sm leading-snug break-words',
            open ? 'font-medium text-sleep' : 'text-muted-foreground',
          )}
        >
          {detail}
        </span>
      ) : null}
    </button>
  )
}
