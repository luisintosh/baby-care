import { Button } from '@/components/ui/button'
import { formatRange } from '@/lib/format'
import type { Reminder } from '@/lib/types'

type ReminderBannerProps = {
  reminders: Reminder[]
  onComplete: (id: number) => void
}

export function ReminderBanner({ reminders, onComplete }: ReminderBannerProps) {
  if (reminders.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((reminder) => (
        <article
          key={reminder.id}
          className="flex items-center gap-3 rounded-2xl bg-lamp/12 px-3 py-3 ring-1 ring-lamp/30"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-lamp-foreground">{reminder.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatRange(reminder.starts_on, reminder.ends_on)}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-xl"
            onClick={() => onComplete(reminder.id)}
          >
            Hecho
          </Button>
        </article>
      ))}
    </div>
  )
}
