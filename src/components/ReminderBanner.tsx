import { Bell } from 'lucide-react'
import { formatDeadline } from '@/lib/format'
import type { Reminder } from '@/lib/types'

type ReminderBannerProps = {
  reminders: Reminder[]
  onComplete: (id: number) => void
}

/** Active reminders on Registrar: present, but quieter than a due feed. */
export function ReminderBanner({ reminders, onComplete }: ReminderBannerProps) {
  if (reminders.length === 0) return null

  return (
    <div className="flex shrink-0 flex-col gap-2">
      {reminders.map((reminder) => (
        <article
          key={reminder.id}
          className="flex items-center gap-3 rounded-[1.6rem] border border-lamp/40 bg-card px-4 py-2.5"
        >
          <Bell className="size-5 shrink-0 text-lamp" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-medium">{reminder.title}</p>
            <p className="text-sm text-muted-foreground">{formatDeadline(reminder.ends_on)}</p>
          </div>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-full bg-secondary px-4 text-sm font-medium text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
            onClick={() => onComplete(reminder.id)}
            aria-label={`Marcar hecho: ${reminder.title}`}
          >
            Hecho
          </button>
        </article>
      ))}
    </div>
  )
}
