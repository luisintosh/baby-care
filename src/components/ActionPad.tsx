import { KINDS } from '@/lib/kinds'
import { formatAgo, formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EventKind } from '@/lib/types'

type ActionPadProps = {
  onSelect: (kind: EventKind) => void
  openSleepSince: Date | null
  lastAtByKind: Partial<Record<EventKind, Date>>
}

function sinceLabel(lastAt: Date | undefined) {
  if (!lastAt) return null
  return formatAgo(lastAt)
}

export function ActionPad({ onSelect, openSleepSince, lastAtByKind }: ActionPadProps) {
  const feed = KINDS[0]
  const rest = KINDS.slice(1)
  const feedSince = sinceLabel(lastAtByKind[feed.id])

  return (
    <div className="track-pad flex shrink-0 flex-col gap-3">
      <button
        type="button"
        onClick={() => onSelect(feed.id)}
        aria-label={feedSince ? `${feed.label}, ${feedSince}` : feed.label}
        className="track-pad-main pad-glow flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-[2rem] bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        <span className="track-pad-emoji text-5xl leading-none" aria-hidden>
          {feed.emoji}
        </span>
        {feedSince ? (
          <span className="text-[11px] leading-none text-muted-foreground">{feedSince}</span>
        ) : null}
      </button>
      <div className="grid grid-cols-3 gap-3 px-4">
        {rest.map((kind) => {
          const sleeping = kind.id === 'sleep' && openSleepSince
          const since = sinceLabel(lastAtByKind[kind.id])
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => onSelect(kind.id)}
              aria-label={
                sleeping
                  ? `Sueño, durmiendo desde ${formatClock(openSleepSince)}`
                  : since
                    ? `${kind.label}, ${since}`
                    : kind.label
              }
              className={cn(
                'track-pad-key pad-glow flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.35rem] bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
                sleeping && 'is-sleeping ring-1 ring-lamp/50',
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {kind.emoji}
              </span>
              {since ? (
                <span className="text-[11px] leading-none text-muted-foreground">{since}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
