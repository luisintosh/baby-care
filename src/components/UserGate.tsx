import { useState, type FormEvent } from 'react'
import { DateField } from '@/components/DateField'
import { signInCaregiver } from '@/lib/auth'
import { CAREGIVERS } from '@/lib/caregiver'
import { cn } from '@/lib/utils'
import type { Caregiver } from '@/lib/types'

export function UserGate() {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!caregiver || !date || pending) return
    setPending(true)
    setError(null)
    const message = await signInCaregiver(caregiver, date)
    if (message) setError(message)
    setPending(false)
  }

  return (
    <main className="gate-pad flex min-h-0 w-full max-w-md flex-1 flex-col justify-center overflow-y-auto px-5">
      <h1 className="font-heading text-4xl leading-tight">¿Quién registra?</h1>
      <p className="mt-3 text-muted-foreground">
        Elige tu nombre y la fecha. La sesión queda en este teléfono hasta que toques tu nombre.
      </p>
      <form className="mt-10 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
        {CAREGIVERS.map((person) => (
          <button
            key={person.id}
            type="button"
            aria-pressed={caregiver === person.id}
            onClick={() => setCaregiver(person.id)}
            className={cn(
              'pad-glow min-h-24 rounded-[1.75rem] bg-card text-2xl font-medium ring-1 ring-white/10 transition active:translate-y-px',
              caregiver === person.id && 'ring-2 ring-lamp',
            )}
          >
            {person.name}
          </button>
        ))}
        <DateField value={date} onChange={setDate} />
        {error ? (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!caregiver || !date || pending}
          className="min-h-14 rounded-[1.75rem] bg-primary text-xl font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
