import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { TimeSheet } from '@/components/TimeSheet'
import { addDays, addMinutes, formatClock, startOfLocalDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BabyEvent } from '@/lib/types'

type SleepEditorProps = {
  event: BabyEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: number, occurredAt: Date, endedAt: Date | null) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function SleepEditor({ event, open, onOpenChange, onSave, onDelete }: SleepEditorProps) {
  const [start, setStart] = useState(() => new Date())
  const [end, setEnd] = useState<Date | null>(null)
  const [endDayOffset, setEndDayOffset] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<'start' | 'end' | null>(null)

  useEffect(() => {
    if (!event) return
    const eventStart = new Date(event.occurred_at)
    const eventEnd = event.ended_at ? new Date(event.ended_at) : new Date()
    setStart(eventStart)
    setEnd(eventEnd)
    const dayDiff = Math.round(
      (startOfLocalDay(eventEnd).getTime() - startOfLocalDay(eventStart).getTime()) / 86_400_000,
    )
    setEndDayOffset(dayDiff)
    setEditing(null)
  }, [event])

  if (!event) return null

  const endValue = end ?? addDays(start, endDayOffset)
  const editingStart = editing === 'start'

  async function save(nextEnd: Date | null) {
    if (!event) return
    if (nextEnd && nextEnd < start) {
      toast.error('El despertar no puede ser antes del inicio')
      return
    }
    setSaving(true)
    try {
      await onSave(event.id, start, nextEnd)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!event) return
    setSaving(true)
    try {
      await onDelete(event.id)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar')
    } finally {
      setSaving(false)
    }
  }

  function shiftEndDay(delta: number) {
    const next = endDayOffset + delta
    setEndDayOffset(next)
    if (end) setEnd(addDays(end, delta))
  }

  function dayLabel() {
    if (endDayOffset === 0) return 'Mismo día'
    return `+${endDayOffset} día${endDayOffset > 1 ? 's' : ''}`
  }

  return (
    <>
      <NightSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setEditing(null)
          onOpenChange(next)
        }}
        title="Sueño 😴"
        description="Ajusta el inicio y registra cuándo despertó."
      >
        <TimeRow label="Inicio" value={start} onClick={() => setEditing('start')} />
        <TimeRow label="Despertar" value={endValue} onClick={() => setEditing('end')} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={endDayOffset <= 0 || saving}
            onClick={() => shiftEndDay(-1)}
            className="min-h-12 flex-1 rounded-2xl bg-secondary text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40"
          >
            −1 día
          </button>
          <span className="min-w-20 text-center text-sm text-muted-foreground">{dayLabel()}</span>
          <button
            type="button"
            disabled={endDayOffset >= 3 || saving}
            onClick={() => shiftEndDay(1)}
            className="min-h-12 flex-1 rounded-2xl bg-secondary text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40"
          >
            +1 día
          </button>
        </div>
        <SheetButton disabled={saving} onClick={() => void save(end ?? new Date())}>
          Guardar despertar
        </SheetButton>
        <SheetButton tone="secondary" disabled={saving} onClick={() => void save(null)}>
          Sigue durmiendo
        </SheetButton>
        <SheetButton tone="danger" disabled={saving} onClick={() => void remove()}>
          Borrar
        </SheetButton>
      </NightSheet>
      <TimeSheet
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null)
        }}
        title={editingStart ? 'Inicio' : 'Despertar'}
        raised
        value={editingStart ? start : endValue}
        onShift={(minutes) => {
          if (editingStart) setStart(addMinutes(start, minutes))
          else setEnd(addMinutes(endValue, minutes))
        }}
        onChange={(next) => {
          if (editingStart) setStart(next)
          else setEnd(next)
        }}
        onNow={() => {
          const next = new Date()
          if (editingStart) setStart(next)
          else setEnd(next)
        }}
      />
    </>
  )
}

function TimeRow({ label, value, onClick }: { label: string; value: Date; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full items-center justify-between rounded-2xl bg-secondary px-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
      )}
    >
      <span>{label}</span>
      <span className="font-clock text-2xl leading-none font-semibold text-lamp tabular-nums">
        {formatClock(value)}
      </span>
    </button>
  )
}
