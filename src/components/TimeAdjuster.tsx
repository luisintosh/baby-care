import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatClock, withTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type TimeAdjusterProps = {
  value: Date
  live?: boolean
  onShift: (minutes: number) => void
  onNow: () => void
  onChange: (next: Date) => void
  label?: string
}

function ShiftKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-11 rounded-2xl px-1 text-sm"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function wrap(n: number, max: number) {
  return ((n % max) + max) % max
}

export function TimeAdjuster({
  value,
  live = false,
  onShift,
  onNow,
  onChange,
  label,
}: TimeAdjusterProps) {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState(value.getHours())
  const [minutes, setMinutes] = useState(value.getMinutes())

  function openPicker() {
    setHours(value.getHours())
    setMinutes(value.getMinutes())
    setOpen(true)
  }

  function apply() {
    onChange(withTime(value, hours, minutes))
    setOpen(false)
  }

  return (
    <section className="rounded-[1.75rem] bg-card px-4 py-5">
      {label ? <p className="mb-2 text-center text-sm text-muted-foreground">{label}</p> : null}
      <button
        type="button"
        className="w-full rounded-2xl py-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
        onClick={openPicker}
        aria-label={`Elegir hora, ${formatClock(value)}`}
      >
        <p className="font-clock text-5xl leading-none font-semibold tracking-tight text-lamp">
          {formatClock(value)}
        </p>
      </button>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <ShiftKey label="−1 h" onClick={() => onShift(-60)} />
        <ShiftKey label="+1 h" onClick={() => onShift(60)} />
        <ShiftKey label="−10" onClick={() => onShift(-10)} />
        <ShiftKey label="+10" onClick={() => onShift(10)} />
      </div>
      {live ? null : (
        <Button
          type="button"
          variant="ghost"
          className={cn('mt-3 h-11 w-full rounded-2xl text-lamp')}
          onClick={onNow}
        >
          Ahora
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Elegir hora</DialogTitle>
            <DialogDescription>Toca las flechas o escribe la hora.</DialogDescription>
          </DialogHeader>
          <form
            key={open ? 'open' : 'idle'}
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              apply()
            }}
          >
            <div className="flex items-center justify-center gap-3 py-2">
              <TimePart
                label="Hora"
                value={hours}
                onStep={(delta) => setHours((h) => wrap(h + delta, 24))}
                onCommit={(n) => setHours(wrap(n, 24))}
                max={23}
              />
              <span className="font-clock pb-5 text-4xl font-semibold text-lamp">:</span>
              <TimePart
                label="Min"
                value={minutes}
                onStep={(delta) => setMinutes((m) => wrap(m + delta, 60))}
                onCommit={(n) => setMinutes(wrap(n, 60))}
                max={59}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="h-11 rounded-xl">
                Listo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

type TimePartProps = {
  label: string
  value: number
  max: number
  onStep: (delta: number) => void
  onCommit: (n: number) => void
}

function TimePart({ label, value, max, onStep, onCommit }: TimePartProps) {
  const [draft, setDraft] = useState(pad2(value))
  const [focused, setFocused] = useState(false)

  const shown = focused ? draft : pad2(value)

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        className="size-14 rounded-2xl"
        aria-label={`${label}, subir`}
        onClick={() => onStep(1)}
      >
        <ChevronUp className="size-6" />
      </Button>
      <label className="flex flex-col items-center gap-1">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          aria-label={label}
          value={shown}
          onFocus={(event) => {
            setFocused(true)
            setDraft(pad2(value))
            event.currentTarget.select()
          }}
          onBlur={() => {
            const parsed = Number.parseInt(draft, 10)
            onCommit(Number.isNaN(parsed) ? 0 : Math.min(max, Math.max(0, parsed)))
            setFocused(false)
          }}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, '').slice(0, 2)
            setDraft(next)
            const parsed = Number.parseInt(next, 10)
            if (!Number.isNaN(parsed)) onCommit(Math.min(max, parsed))
          }}
          className="font-clock h-16 w-20 rounded-2xl bg-secondary text-center text-4xl font-semibold tracking-tight text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</span>
      </label>
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        className="size-14 rounded-2xl"
        aria-label={`${label}, bajar`}
        onClick={() => onStep(-1)}
      >
        <ChevronDown className="size-6" />
      </Button>
    </div>
  )
}
