import { mexicanDate } from '@/lib/auth'
import { cn } from '@/lib/utils'

type DateFieldProps = {
  id?: string
  value: string
  onChange: (iso: string) => void
}

export function DateField({ id = 'session-date', value, onChange }: DateFieldProps) {
  const chosen = mexicanDate(value)

  return (
    <label className="relative block min-h-24 cursor-pointer rounded-[1.75rem] bg-card ring-1 ring-white/10">
      <span className="flex min-h-24 flex-col items-center justify-center gap-1 px-4">
        <span className="text-sm text-muted-foreground">Fecha</span>
        <span
          className={cn(
            'text-3xl leading-none font-medium tabular-nums',
            chosen ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {chosen || 'dd/mm/aaaa'}
        </span>
      </span>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={chosen ? `Fecha, ${chosen}` : 'Elige la fecha'}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  )
}
