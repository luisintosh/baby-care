import { KINDS } from '@/lib/kinds'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EventKind } from '@/lib/types'

type ActionPadProps = {
  onSelect: (kind: EventKind) => void
  openSleepSince: Date | null
}

export function ActionPad({ onSelect, openSleepSince }: ActionPadProps) {
  const feed = KINDS[0]
  const rest = KINDS.slice(1)

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onSelect(feed.id)}
        aria-label={feed.label}
        className="pad-glow flex min-h-24 w-full items-center justify-center rounded-[2rem] bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        <span className="text-5xl leading-none" aria-hidden>
          {feed.emoji}
        </span>
      </button>
      <div className="grid grid-cols-3 gap-3 px-4">
        {rest.map((kind) => {
          const sleeping = kind.id === 'sleep' && openSleepSince
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => onSelect(kind.id)}
              aria-label={
                sleeping ? `Sueño, durmiendo desde ${formatClock(openSleepSince)}` : kind.label
              }
              className={cn(
                'pad-glow flex min-h-16 items-center justify-center rounded-[1.35rem] bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
                sleeping && 'is-sleeping ring-1 ring-lamp/50',
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {kind.emoji}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
