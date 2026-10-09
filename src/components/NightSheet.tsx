import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type NightSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  raised?: boolean
  autoFocus?: boolean
}

export function NightSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  raised = false,
  autoFocus = true,
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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 bg-black/55 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none',
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
          style={frame ? { bottom: frame.bottom, maxHeight: frame.maxHeight } : undefined}
          className={cn(
            'night-sheet fixed bottom-0 flex flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-foreground shadow-[0_-16px_40px_oklch(0.1_0.02_55/0.55)] outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-10 duration-200 motion-reduce:animate-none',
            layer,
          )}
        >
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-foreground/20" aria-hidden />
          <DialogPrimitive.Title className="text-lg leading-none font-medium">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-snug text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
          <div className="mt-4 flex flex-col gap-3">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type SheetButtonProps = ComponentProps<'button'> & {
  tone?: 'primary' | 'secondary' | 'danger'
}

const tones = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  danger: 'bg-destructive/15 text-destructive',
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
