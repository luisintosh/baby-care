import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { FUTURE_SLACK_MS } from '@/hooks/use-selected-time'
import { addMinutes, formatAgo, formatClock, formatDayLabel, formatWhen, withTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type TimeStampProps = {
  value: Date
  live: boolean
  onOpen: () => void
  onNow: () => void
}

/**
 * The time the next log will carry. Live, it is a quiet "now". Moved off now,
 * it turns into an amber chip that says so, with a clear way back.
 */
export function TimeStamp({ value, live, onOpen, onNow }: TimeStampProps) {
  if (live) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Hora actual, ${formatClock(value)}. Toca para registrar a otra hora`}
        className="flex min-h-11 items-center gap-2 rounded-2xl px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-foreground/5"
      >
        <span className="font-clock text-xl leading-none font-medium text-foreground/85">
          {formatClock(value)}
        </span>
        <span className="text-sm text-muted-foreground">cambiar hora</span>
      </button>
    )
  }

  return (
    <div className="flex min-h-12 items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Hora elegida, ${formatWhen(value)}, ${formatAgo(value)}. Toca para cambiarla`}
        className="flex min-h-12 flex-1 items-center justify-between gap-2 rounded-2xl border border-lamp/50 bg-lamp/15 px-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        <span className="text-sm text-lamp">Registrar a las</span>
        <span className="flex items-baseline gap-2">
          <span className="font-clock text-xl leading-none font-semibold text-lamp">{formatWhen(value)}</span>
          <span className="text-xs text-muted-foreground">{formatAgo(value)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onNow}
        aria-label="Volver a la hora actual"
        className="min-h-12 shrink-0 rounded-2xl bg-secondary px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        Ahora
      </button>
    </div>
  )
}

type TimeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Date
  onShift: (minutes: number) => void
  onChange: (next: Date) => void
  onNow?: () => void
  live?: boolean
  title?: string
  raised?: boolean
}

export function TimeSheet({
  open,
  onOpenChange,
  value,
  onShift,
  onChange,
  onNow,
  live = false,
  title = 'Elegir hora',
  raised = false,
}: TimeSheetProps) {
  const ahead = (minutes: number) =>
    addMinutes(value, minutes).getTime() > Date.now() + FUTURE_SLACK_MS

  return (
    <NightSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Los cambios se aplican al momento. Toca las flechas o escribe la hora."
      raised={raised}
      compact
      cancelLabel={null}
      footer={
        <div className={cn('grid gap-2', !live && onNow ? 'grid-cols-2' : 'grid-cols-1')}>
          {!live && onNow ? (
            <SheetButton tone="secondary" onClick={onNow} aria-label="Volver a la hora actual">
              Ahora
            </SheetButton>
          ) : null}
          <SheetButton onClick={() => onOpenChange(false)}>Listo</SheetButton>
        </div>
      }
    >
      {open ? (
        <>
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {formatDayLabel(value)} · {formatAgo(value)}
          </p>
          <TimeFields value={value} onChange={onChange} />
          <div className="grid grid-cols-4 gap-2">
            <ShiftKey label="−1 h" name="1 hora antes" onClick={() => onShift(-60)} />
            <ShiftKey label="−10 min" name="10 minutos antes" onClick={() => onShift(-10)} />
            <ShiftKey label="+10 min" name="10 minutos después" disabled={ahead(10)} onClick={() => onShift(10)} />
            <ShiftKey label="+1 h" name="1 hora después" disabled={ahead(60)} onClick={() => onShift(60)} />
          </div>
        </>
      ) : null}
    </NightSheet>
  )
}

type TimeFieldsProps = {
  value: Date
  onChange: (next: Date) => void
}

/** Hour and minute steppers. Every step applies at once; there is no draft to lose. */
function TimeFields({ value, onChange }: TimeFieldsProps) {
  const hours = value.getHours()
  const minutes = value.getMinutes()

  return (
    <div className="flex items-center justify-center gap-3">
      <TimePart
        label="Hora"
        value={hours}
        max={23}
        onStep={(delta) => onChange(withTime(value, wrap(hours + delta, 24), minutes))}
        onCommit={(next) => onChange(withTime(value, wrap(next, 24), minutes))}
      />
      <span className="font-clock pb-5 text-4xl font-semibold text-lamp" aria-hidden>
        :
      </span>
      <TimePart
        label="Min"
        value={minutes}
        max={59}
        onStep={(delta) => onChange(withTime(value, hours, wrap(minutes + delta, 60)))}
        onCommit={(next) => onChange(withTime(value, hours, wrap(next, 60)))}
      />
    </div>
  )
}

function ShiftKey({
  label,
  name,
  onClick,
  disabled,
}: {
  label: string
  name: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={name}
      className="font-clock min-h-12 rounded-2xl bg-secondary text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-35"
    >
      {label}
    </button>
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
      <button
        type="button"
        className="flex size-12 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
        aria-label={`${label}, subir`}
        onClick={() => onStep(1)}
      >
        <ChevronUp className="size-6" />
      </button>
      <label className="flex flex-col items-center gap-1">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          autoComplete="off"
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
          className="font-clock h-14 w-20 rounded-2xl bg-secondary text-center text-4xl font-semibold text-lamp caret-lamp outline-none selection:bg-lamp/30 focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-xs text-muted-foreground">{label}</span>
      </label>
      <button
        type="button"
        className="flex size-12 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
        aria-label={`${label}, bajar`}
        onClick={() => onStep(-1)}
      >
        <ChevronDown className="size-6" />
      </button>
    </div>
  )
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function wrap(n: number, max: number) {
  return ((n % max) + max) % max
}
