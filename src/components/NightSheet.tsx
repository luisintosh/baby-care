import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type NightSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  children: ReactNode
  raised?: boolean
  autoFocus?: boolean
  /** A small action beside the title, e.g. a quiet Borrar. */
  headerAction?: ReactNode
  /** Pinned to the bottom of the sheet so it stays reachable on short screens. */
  footer?: ReactNode
  /** Label for the close button at the bottom; `null` hides it. */
  cancelLabel?: string | null
  /** Hide the description on short screens (it stays for screen readers). */
  compact?: boolean
}

export function NightSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  raised = false,
  autoFocus = true,
  headerAction,
  footer,
  cancelLabel = 'Cancelar',
  compact = false,
}: NightSheetProps) {
  const [frame, setFrame] = useState<{ bottom: number; maxHeight: number } | null>(null)

  useEffect(() => {
    if (!open) return

    // Keep the sheet inside the visible viewport, including above the keyboard.
    function lift() {
      const next = window.visualViewport
      if (!next) return
      const bottom = Math.max(0, window.innerHeight - next.height - next.offsetTop)
      const maxHeight = Math.max(180, next.height - 12)
      setFrame((prev) =>
        prev && prev.bottom === bottom && prev.maxHeight === maxHeight ? prev : { bottom, maxHeight },
      )
    }

    lift()
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', lift)
    viewport?.addEventListener('scroll', lift)
    window.addEventListener('resize', lift)
    return () => {
      viewport?.removeEventListener('resize', lift)
      viewport?.removeEventListener('scroll', lift)
      window.removeEventListener('resize', lift)
    }
  }, [open])

  const layer = raised ? 'z-[60]' : 'z-50'
  // Lifted above the keyboard, the home-indicator padding is wasted space.
  const onKeyboard = Boolean(frame && frame.bottom > 0)

  const cancel = cancelLabel ? (
    <DialogPrimitive.Close asChild>
      <button
        type="button"
        className="min-h-11 w-full rounded-2xl text-base text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-foreground/5"
      >
        {cancelLabel}
      </button>
    </DialogPrimitive.Close>
  ) : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 bg-background/70 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none',
            layer,
          )}
        />
        <DialogPrimitive.Content
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            if (autoFocus) return
            event.preventDefault()
            if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
          }}
          style={
            frame
              ? { bottom: frame.bottom, maxHeight: frame.maxHeight, paddingBottom: onKeyboard ? 12 : undefined }
              : undefined
          }
          className={cn(
            'night-sheet fixed bottom-0 flex flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-card px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-card-foreground shadow-[0_-16px_40px_oklch(0.1_0.02_55/0.55)] outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-10 duration-200 motion-reduce:animate-none',
            layer,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="text-xl leading-tight font-semibold">{title}</DialogPrimitive.Title>
            {headerAction ? <div className="-mt-2 -mr-2 shrink-0">{headerAction}</div> : null}
          </div>
          <DialogPrimitive.Description
            className={cn(
              'mt-1.5 text-sm leading-snug text-muted-foreground',
              compact && '[@media(max-height:700px)]:sr-only',
            )}
          >
            {description}
          </DialogPrimitive.Description>
          <div className="mt-4 flex flex-col gap-3">{children}</div>
          {footer ? (
            <div className="sticky bottom-0 -mx-5 mt-3 flex flex-col gap-2 bg-card px-5 pt-2">
              {footer}
              {cancel}
            </div>
          ) : cancel ? (
            <div className="mt-2">{cancel}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type SheetButtonProps = ComponentProps<'button'> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'quiet-danger'
}

const tones = {
  primary: 'bg-primary text-primary-foreground font-medium',
  secondary: 'bg-secondary text-secondary-foreground',
  danger: 'bg-destructive/10 text-destructive',
  'quiet-danger': 'bg-transparent text-destructive',
}

export function SheetButton({ tone = 'primary', className, type = 'button', ...props }: SheetButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'min-h-12 w-full rounded-2xl px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

/** Two taps to delete: the first arms it for 3 s. For a quiet header action. */
export function ConfirmDelete({
  onConfirm,
  disabled,
  label = 'Borrar',
}: {
  onConfirm: () => void
  disabled?: boolean
  label?: string
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(id)
  }, [armed])

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) onConfirm()
        else setArmed(true)
      }}
      className={cn(
        'min-h-11 rounded-full px-3 text-sm text-destructive outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40',
        armed && 'bg-destructive/15 font-medium',
      )}
      aria-live="polite"
    >
      {armed ? '¿Borrar? Toca otra vez' : label}
    </button>
  )
}
