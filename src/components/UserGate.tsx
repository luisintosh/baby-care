import { CAREGIVERS } from '@/lib/caregiver'
import type { Caregiver } from '@/lib/types'

type UserGateProps = {
  onChoose: (caregiver: Caregiver) => void
}

export function UserGate({ onChoose }: UserGateProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] pb-10">
      <p className="text-xs tracking-[0.28em] text-lamp uppercase">Cuna</p>
      <h1 className="mt-3 font-heading text-4xl leading-tight">¿Quién registra?</h1>
      <p className="mt-3 text-muted-foreground">
        Elige tu nombre. Queda en este teléfono hasta que lo cambies.
      </p>
      <div className="mt-10 flex flex-col gap-3">
        {CAREGIVERS.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onChoose(person.id)}
            className="pad-glow min-h-24 rounded-[1.75rem] bg-card text-2xl font-medium ring-1 ring-white/10 transition active:translate-y-px"
          >
            {person.name}
          </button>
        ))}
      </div>
    </main>
  )
}
