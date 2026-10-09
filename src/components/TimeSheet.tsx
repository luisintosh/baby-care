import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { addMinutes, formatClock, withTime } from '@/lib/format'

type TimeStampProps = {
  value: Date
  live: boolean
  onOpen: () => void
  onNow: () => void
}

export function TimeStamp({ value, live, onOpen, onNow }: TimeStampProps) {
  return (
    <div className="grid min-h-12 grid-cols-[1fr_auto_1fr] items-center">
      <span />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Elegir hora, ${formatClock(value)}`}
        className="font-clock min-h-12 rounded-2xl px-3 text-2xl leading-none font-semibold tracking-tight text-lamp tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
      >
        {formatClock(value)}
      </button>
      {live ? (
        <span />
      ) : (
        <button
          type="button"
          onClick={onNow}
          className="min-h-12 justify-self-end rounded-2xl px-2 text-sm text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
        >
          Ahora
        </button>
      )}
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
  return (
    <NightSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Toca las flechas o escribe la hora."
      raised={raised}
    >
      {open ? (
        <TimeFields
          value={value}
          live={live}
          onShift={onShift}
          onChange={onChange}
          onNow={onNow}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </NightSheet>
  )
}

type TimeFieldsProps = {
  value: Date
  live: boolean
  onShift: (minutes: number) => void
  onChange: (next: Date) => void
  onNow?: () => void
  onClose: () => void
}

function TimeFields({ value, live, onShift, onChange, onNow, onClose }: TimeFieldsProps) {
  const [hours, setHours] = useState(() => value.getHours())
  const [minutes, setMinutes] = useState(() => value.getMinutes())
  const [dirty, setDirty] = useState(false)

  function shift(delta: number) {
    const base = dirty ? withTime(value, hours, minutes) : value
    const next = addMinutes(base, delta)
    setHours(next.getHours())
    setMinutes(next.getMinutes())
    setDirty(false)
    if (dirty) onChange(next)
    else onShift(delta)
  }

  function apply() {
    if (dirty) onChange(withTime(value, hours, minutes))
    onClose()
  }

  function jumpToNow() {
    const next = new Date()
    setHours(next.getHours())
    setMinutes(next.getMinutes())
    setDirty(false)
    onNow?.()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="flex items-center justify-center gap-3 py-1">
        <TimePart
          label="Hora"
          value={hours}
          max={23}
          onStep={(delta) => {
            setHours((current) => wrap(current + delta, 24))
            setDirty(true)
          }}
          onCommit={(next) => {
            setHours(wrap(next, 24))
            setDirty(true)
          }}
        />
        <span className="font-clock pb-5 text-4xl font-semibold text-lamp">:</span>
        <TimePart
          label="Min"
          value={minutes}
          max={59}
          onStep={(delta) => {
            setMinutes((current) => wrap(current + delta, 60))
            setDirty(true)
          }}
          onCommit={(next) => {
            setMinutes(wrap(next, 60))
            setDirty(true)
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ShiftKey label="−1 h" onClick={() => shift(-60)} />
        <ShiftKey label="+1 h" onClick={() => shift(60)} />
        <ShiftKey label="−10" onClick={() => shift(-10)} />
        <ShiftKey label="+10" onClick={() => shift(10)} />
      </div>
      {!live && onNow ? (
        <button
          type="button"
          onClick={jumpToNow}
          className="min-h-12 w-full rounded-2xl text-base text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
        >
          Ahora
        </button>
      ) : null}
      <SheetButton type="submit">Listo</SheetButton>
    </form>
  )
}

function ShiftKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-2xl bg-secondary text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
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
        className="flex size-14 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
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
          className="font-clock h-16 w-20 rounded-2xl bg-secondary text-center text-4xl font-semibold tracking-tight text-lamp tabular-nums caret-lamp outline-none selection:bg-lamp/30 focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-xs text-muted-foreground">{label}</span>
      </label>
      <button
        type="button"
        className="flex size-14 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
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
