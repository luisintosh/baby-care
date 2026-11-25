import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

/** A load failure, said plainly, with a retry. Never an empty log. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false)
  return (
    <section
      role="alert"
      className="flex shrink-0 items-center gap-3 rounded-[1.6rem] border border-destructive/40 bg-destructive/10 py-2.5 pr-2.5 pl-4"
    >
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-medium text-foreground">{message}.</span>{' '}
        <span className="text-muted-foreground">Lo de abajo puede estar incompleto.</span>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void Promise.resolve(onRetry()).finally(() => setBusy(false))
        }}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-50"
      >
        <RefreshCw className={busy ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'} aria-hidden />
        Reintentar
      </button>
    </section>
  )
}
