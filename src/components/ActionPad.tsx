import { PAD_KINDS, kindMeta } from '@/lib/kinds'
import { formatAgo, formatElapsed } from '@/lib/format'
import type { EventKind } from '@/lib/types'

type ActionPadProps = {
  onSelect: (kind: EventKind) => void
  lastAtByKind: Partial<Record<EventKind, Date>>
  busyKinds: ReadonlySet<EventKind>
}

export function ActionPad({ onSelect, lastAtByKind, busyKinds }: ActionPadProps) {
  const feed = kindMeta('feed')
  const feedLast = lastAtByKind.feed
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
        {PAD_KINDS.map((id) => {
          const kind = kindMeta(id)
          const last = lastAtByKind[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-busy={busyKinds.has(id)}
              aria-label={`Registrar ${kind.label.toLowerCase()}${last ? `, la última fue ${formatAgo(last)}` : ''}`}
              className="pad-glow flex min-h-16 flex-col items-center justify-center gap-1 rounded-[1.35rem] bg-card px-1 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px aria-busy:opacity-60"
            >
              <span className="kind-emoji text-3xl leading-none" aria-hidden>
                {kind.emoji}
              </span>
              {last ? (
                <span className="text-label text-center text-balance text-foreground/75">
                  {formatElapsed(last)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
