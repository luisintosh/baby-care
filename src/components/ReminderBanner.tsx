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
    <div className="flex shrink-0 flex-col gap-2">
      {reminders.map((reminder) => (
        <article
          key={reminder.id}
          className="flex items-center gap-3 rounded-[1.6rem] bg-lamp px-3 py-3 text-primary-foreground"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{reminder.title}</p>
            <p className="text-xs text-primary-foreground/70">
              {formatRange(reminder.starts_on, reminder.ends_on)}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-full bg-primary-foreground px-4 text-background hover:bg-primary-foreground/90"
            onClick={() => onComplete(reminder.id)}
          >
            Hecho
          </Button>
        </article>
      ))}
    </div>
  )
}
