import { Button } from '@/components/ui/button'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'

type TimeAdjusterProps = {
  value: Date
  live?: boolean
  onShift: (minutes: number) => void
  onNow: () => void
  label?: string
}

export function TimeAdjuster({ value, live = false, onShift, onNow, label }: TimeAdjusterProps) {
  return (
    <section className="rounded-3xl bg-card/80 px-4 py-4 ring-1 ring-white/8">
      {label ? (
        <p className="mb-2 text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-16 min-w-16 rounded-2xl text-lg"
          onClick={() => onShift(-10)}
        >
          −10
        </Button>
        <div className="min-w-0 text-center">
          <p className="font-clock text-4xl leading-none font-semibold tracking-tight text-lamp">
            {formatClock(value)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {live ? 'Hora actual' : 'Hora elegida'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="h-16 min-w-16 rounded-2xl text-lg"
          onClick={() => onShift(10)}
        >
          +10
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        className={cn('mt-3 h-11 w-full rounded-2xl', live && 'text-lamp')}
        onClick={onNow}
      >
        Ahora
      </Button>
    </section>
  )
}
