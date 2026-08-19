import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TimeAdjuster } from '@/components/TimeAdjuster'
import { addMinutes } from '@/lib/format'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!event) return
    setStart(new Date(event.occurred_at))
    setEnd(event.ended_at ? new Date(event.ended_at) : new Date())
  }, [event])

  if (!event) return null

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Sueño 😴</SheetTitle>
          <SheetDescription>Ajusta el inicio y registra cuándo despertó.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <TimeAdjuster
            label="Inicio"
            value={start}
            onShift={(minutes) => setStart(addMinutes(start, minutes))}
            onNow={() => setStart(new Date())}
          />
          <TimeAdjuster
            label="Despertar"
            value={end ?? new Date()}
            onShift={(minutes) => setEnd(addMinutes(end ?? new Date(), minutes))}
            onNow={() => setEnd(new Date())}
          />
        </div>
        <SheetFooter className="gap-2">
          <Button
            className="h-12 rounded-2xl"
            disabled={saving}
            onClick={() => void save(end ?? new Date())}
          >
            Guardar despertar
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl"
            disabled={saving}
            onClick={() => void save(null)}
          >
            Sigue durmiendo
          </Button>
          <Button
            variant="destructive"
            className="h-12 rounded-2xl"
            disabled={saving}
            onClick={() => void remove()}
          >
            Borrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
