import { useState } from 'react'
import { toast } from 'sonner'
import { ReminderBanner } from '@/components/ReminderBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, formatRange, toDateInput } from '@/lib/format'
import { caregiverName } from '@/lib/caregiver'
import type { Caregiver, Reminder } from '@/lib/types'

type RemindersPageProps = {
  caregiver: Caregiver
  reminders: Reminder[]
  active: Reminder[]
  onCreate: (input: { title: string; startsOn: string; endsOn: string }) => Promise<void>
  onComplete: (id: number, caregiver: Caregiver) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function RemindersPage({
  caregiver,
  reminders,
  active,
  onCreate,
  onComplete,
  onDelete,
}: RemindersPageProps) {
  const today = toDateInput(new Date())
  const week = toDateInput(addDays(new Date(), 7))
  const [title, setTitle] = useState('')
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(week)
  const [saving, setSaving] = useState(false)

  const pending = reminders.filter((reminder) => !reminder.completed_at)
  const done = reminders.filter((reminder) => reminder.completed_at)

  async function submit() {
    if (!title.trim()) {
      toast.error('Ponle un título al aviso')
      return
    }
    if (endsOn < startsOn) {
      toast.error('La fecha final no puede ser antes del inicio')
      return
    }
    setSaving(true)
    try {
      await onCreate({ title: title.trim(), startsOn, endsOn })
      setTitle('')
      toast.success('Aviso creado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ReminderBanner
        reminders={active}
        onComplete={(id) => {
          void onComplete(id, caregiver).then(
            () => toast.success('Marcado como hecho'),
            (error: unknown) => toast.error(error instanceof Error ? error.message : 'No se pudo marcar'),
          )
        }}
      />

      <form
        className="flex flex-col gap-3 rounded-3xl bg-card/80 p-4 ring-1 ring-white/8"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 className="text-sm text-muted-foreground">Nuevo aviso</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Qué hay que recordar</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Agendar pediatra"
            className="h-11 rounded-xl text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="starts">Desde</Label>
            <Input
              id="starts"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ends">Hasta</Label>
            <Input
              id="ends"
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
        <Button type="submit" className="h-12 rounded-2xl" disabled={saving}>
          Guardar aviso
        </Button>
      </form>

      <section>
        <h2 className="mb-2 text-sm text-muted-foreground">Pendientes</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay avisos abiertos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((reminder) => (
              <li key={reminder.id} className="rounded-2xl bg-card/70 px-3 py-3 ring-1 ring-white/6">
                <p className="font-medium">{reminder.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRange(reminder.starts_on, reminder.ends_on)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="lg"
                    className="h-10 flex-1 rounded-xl"
                    onClick={() => void onComplete(reminder.id, caregiver)}
                  >
                    Hecho
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="h-10 rounded-xl"
                    onClick={() => void onDelete(reminder.id)}
                  >
                    Borrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm text-muted-foreground">Hechos</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {done.map((reminder) => (
              <li key={reminder.id}>
                {reminder.title} · {reminder.completed_by ? caregiverName(reminder.completed_by) : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
