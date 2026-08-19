import { KINDS } from '@/lib/kinds'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EventKind } from '@/lib/types'

type ActionPadProps = {
  onSelect: (kind: EventKind) => void
  openSleepSince: Date | null
}

export function ActionPad({ onSelect, openSleepSince }: ActionPadProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {KINDS.map((kind) => {
        const sleeping = kind.id === 'sleep' && openSleepSince
        return (
          <button
            key={kind.id}
            type="button"
            onClick={() => onSelect(kind.id)}
            className={cn(
              'pad-glow flex min-h-28 flex-col items-center justify-center gap-2 rounded-[1.75rem] bg-card px-3 py-4 text-center ring-1 ring-white/8 transition active:translate-y-px',
              sleeping && 'is-sleeping ring-lamp/50',
            )}
          >
            <span className="text-5xl leading-none" aria-hidden>
              {kind.emoji}
            </span>
            <span className="text-sm font-medium">
              {sleeping ? `Durmiendo desde ${formatClock(openSleepSince)}` : kind.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
