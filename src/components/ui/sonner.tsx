"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Top, under the header: at the bottom it covered the pad and the tab
      // bar, and "Deshacer" sat where the thumb lands next.
      position="top-center"
      offset={{ top: 'calc(max(env(safe-area-inset-top, 0px), var(--safe-top, 0px)) + 4rem)' }}
      mobileOffset={{ top: 'calc(max(env(safe-area-inset-top, 0px), var(--safe-top, 0px)) + 4rem)', left: '1rem', right: '1rem' }}
      containerAriaLabel="Notificaciones"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast text-base! py-4! gap-3!",
          title: "text-base! font-medium!",
          actionButton: "h-10! px-4! text-sm! font-medium! rounded-xl! bg-primary! text-primary-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
