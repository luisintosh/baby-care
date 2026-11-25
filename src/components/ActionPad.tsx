import { KINDS } from '@/lib/kinds'
import { formatAgo, formatClock, formatElapsed } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EventKind } from '@/lib/types'

type ActionPadProps = {
  onSelect: (kind: EventKind) => void
  openSleepSince: Date | null
  lastAtByKind: Partial<Record<EventKind, Date>>
  busyKinds: ReadonlySet<EventKind>
}

export function ActionPad({ onSelect, openSleepSince, lastAtByKind, busyKinds }: ActionPadProps) {
  const feed = KINDS[0]
  const rest = KINDS.slice(1)
  const feedLast = lastAtByKind[feed.id]
  const feedSince = feedLast ? formatAgo(feedLast) : null

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <button
        type="button"
        onClick={() => onSelect(feed.id)}
        aria-busy={busyKinds.has(feed.id)}
        aria-label={`Registrar comida${feedSince ? `, la última fue ${feedSince}` : ''}`}
        className="pad-glow flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-[2rem] bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px aria-busy:opacity-60 [@media(max-height:700px)]:min-h-[4.5rem]"
      >
        <span className="kind-emoji text-4xl leading-none" aria-hidden>
          {feed.emoji}
        </span>
        {feedSince ? <span className="text-sm leading-none text-foreground/75">{feedSince}</span> : null}
      </button>
      <div className="grid grid-cols-3 gap-3">
        {rest.map((kind) => {
          const sleeping = kind.id === 'sleep' && openSleepSince
          const last = lastAtByKind[kind.id]
          const caption = sleeping
            ? `dormida ${formatElapsed(openSleepSince)}`
            : last
              ? kind.id === 'sleep'
                ? `despierta ${formatElapsed(last)}`
                : formatElapsed(last)
              : null
          const label = sleeping
            ? `Sueño: dormida desde las ${formatClock(openSleepSince)}. Toca para registrar el despertar`
            : `Registrar ${kind.label.toLowerCase()}${last ? `, ${kind.id === 'sleep' ? 'despertó' : 'la última fue'} ${formatAgo(last)}` : ''}`
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => onSelect(kind.id)}
              aria-busy={busyKinds.has(kind.id)}
              aria-label={label}
              className={cn(
                'pad-glow flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.35rem] bg-card px-1 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px aria-busy:opacity-60',
                sleeping && 'is-sleeping',
              )}
            >
              <span className="kind-emoji text-3xl leading-none" aria-hidden>
                {kind.emoji}
              </span>
              {caption ? (
                <span
                  className={cn(
                    'text-label text-center text-balance',
                    sleeping ? 'font-medium text-sleep' : 'text-foreground/75',
                  )}
                >
                  {caption}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
