import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { isUpcoming } from '@/hooks/use-reminders'
import { caregiverName } from '@/lib/caregiver'
import { friendlyError } from '@/lib/errors'
import { addDays, formatDeadline, formatShortDate, formatStarts, toDateInput } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Caregiver, Reminder } from '@/lib/types'

type RemindersPageProps = {
  caregiver: Caregiver
  reminders: Reminder[]
  active: Reminder[]
  loading: boolean
  onCreate: (input: { title: string; startsOn: string; endsOn: string }) => Promise<void>
  onComplete: (id: number, caregiver: Caregiver) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onRestore: (reminder: Reminder) => Promise<void>
}

const fieldClass =
  'h-12 w-full rounded-2xl bg-secondary px-3 text-base text-foreground caret-lamp outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50'

export function RemindersPage({
  caregiver,
  reminders,
  active,
  loading,
  onCreate,
  onComplete,
  onDelete,
  onRestore,
}: RemindersPageProps) {
  const [formOpen, setFormOpen] = useState(false)
  const upcoming = reminders.filter((reminder) => isUpcoming(reminder))
  const done = reminders
    .filter((reminder) => reminder.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  function complete(reminder: Reminder) {
    void onComplete(reminder.id, caregiver).then(
      () => {
        haptic('success')
        toast.success('Aviso hecho')
      },
      (error: unknown) => toast.error(friendlyError(error, 'No se pudo marcar')),
    )
  }

  function remove(reminder: Reminder) {
    void onDelete(reminder.id).then(
      () => {
        toast.success('Aviso borrado', {
          duration: 7000,
          action: {
            label: 'Deshacer',
            onClick: () => {
              void onRestore(reminder).then(
                () => toast.success('Recuperado'),
                (error: unknown) => toast.error(friendlyError(error, 'No se pudo recuperar')),
              )
            },
          },
        })
      },
      (error: unknown) => toast.error(friendlyError(error, 'No se pudo borrar')),
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-6 pt-1">
      <ReminderSection title="Activos" empty={loading ? 'Cargando…' : 'Nada pendiente hoy.'}>
        {active.map((reminder) => (
          <ReminderRow
            key={reminder.id}
            reminder={reminder}
            detail={formatDeadline(reminder.ends_on)}
            onComplete={() => complete(reminder)}
            onDelete={() => remove(reminder)}
          />
        ))}
      </ReminderSection>

      {upcoming.length > 0 ? (
        <ReminderSection title="Próximos">
          {upcoming.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              detail={formatStarts(reminder.starts_on)}
              onDelete={() => remove(reminder)}
            />
          ))}
        </ReminderSection>
      ) : null}

      {done.length > 0 ? (
        <section aria-labelledby="hechos">
          <h2 id="hechos" className="mb-2 text-base font-semibold">
            Hechos
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {done.map((reminder) => (
              <li key={reminder.id} className="flex items-baseline justify-between gap-3 px-1">
                <span className="min-w-0 text-foreground/85 line-through decoration-foreground/30">
                  {reminder.title}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {[
                    reminder.completed_by ? `Hecho por ${caregiverName(reminder.completed_by)}` : 'Hecho',
                    reminder.completed_at ? formatShortDate(new Date(reminder.completed_at)) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="hide-on-keyboard sticky bottom-0 mt-auto bg-gradient-to-t from-background from-60% to-transparent pt-4">
        <SheetButton onClick={() => setFormOpen(true)} className="flex items-center justify-center gap-2">
          <Plus className="size-5" aria-hidden />
          Nuevo aviso
        </SheetButton>
      </div>

      <NewReminderSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreate={async (input) => {
          await onCreate(input)
          haptic('success')
          toast.success('Aviso creado')
          setFormOpen(false)
        }}
      />
    </div>
  )
}

function ReminderSection({
  title,
  empty,
  children,
}: {
  title: string
  empty?: string
  children: ReactNode[]
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-5 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  )
}

function ReminderRow({
  reminder,
  detail,
  onComplete,
  onDelete,
}: {
  reminder: Reminder
  detail: string
  onComplete?: () => void
  onDelete: () => void
}) {
  const remove = (
    <SheetButton
      tone="quiet-danger"
      className="w-auto shrink-0 px-4"
      onClick={onDelete}
      aria-label={`Borrar ${reminder.title}`}
    >
      Borrar
    </SheetButton>
  )
  return (
    <li className="rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-medium">{reminder.title}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
        {onComplete ? null : remove}
      </div>
      {onComplete ? (
        <div className="mt-3 flex items-center gap-3">
          <SheetButton tone="secondary" className="flex-1 font-medium text-lamp" onClick={onComplete}>
            Hecho
          </SheetButton>
          {remove}
        </div>
      ) : null}
    </li>
  )
}

function NewReminderSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: { title: string; startsOn: string; endsOn: string }) => Promise<void>
}) {
  const today = toDateInput(new Date())
  const week = toDateInput(addDays(new Date(), 7))
  const [title, setTitle] = useState('')
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(week)
  const [saving, setSaving] = useState(false)

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
      setStartsOn(toDateInput(new Date()))
      setEndsOn(toDateInput(addDays(new Date(), 7)))
    } catch (error) {
      toast.error(friendlyError(error, 'No se pudo crear'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <NightSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo aviso"
      description="Se muestra en Registrar entre estas fechas, hasta que alguien lo marque hecho."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Qué hay que recordar</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Agendar pediatra"
            className={fieldClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Desde</span>
            <input
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <SheetButton type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar aviso'}
        </SheetButton>
      </form>
    </NightSheet>
  )
}
