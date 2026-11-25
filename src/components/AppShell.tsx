import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, ChartNoAxesColumn, ChevronLeft, NotebookPen, WifiOff } from 'lucide-react'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { useOnline } from '@/hooks/use-online'
import { caregiverName } from '@/lib/caregiver'
import { cn } from '@/lib/utils'
import type { Caregiver } from '@/lib/types'

const TABS = [
  { to: '/', label: 'Registrar', icon: NotebookPen, end: true, also: ['/historial'] },
  { to: '/metricas', label: 'Métricas', icon: ChartNoAxesColumn, end: false, also: [] },
  { to: '/recordatorios', label: 'Pendientes', icon: Bell, end: false, also: [] },
] as const

const TITLES: Record<string, string> = {
  '/': 'Registrar',
  '/historial': 'Historial',
  '/metricas': 'Métricas',
  '/recordatorios': 'Pendientes',
}

type AppShellProps = {
  caregiver: Caregiver
  onSignOut: () => void
}

export function AppShell({ caregiver, onSignOut }: AppShellProps) {
  const { pathname } = useLocation()
  const online = useOnline()
  const [confirmOut, setConfirmOut] = useState(false)
  const track = pathname === '/'
  const history = pathname === '/historial'
  const name = caregiverName(caregiver)

  return (
    <div className="flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
      <header className="safe-pad-top flex shrink-0 items-center justify-between gap-3 px-5 pb-1">
        {history ? (
          <Link
            to="/"
            className="-ml-2 flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronLeft className="size-5 text-lamp" aria-hidden />
            <h1 className="text-lg font-semibold">Historial</h1>
            <span className="sr-only">, volver a Registrar</span>
          </Link>
        ) : (
          <>
            <h1 className={cn('font-semibold', track ? 'sr-only' : 'text-lg')}>{TITLES[pathname] ?? 'Baby'}</h1>
            {/* Registrar puts its live clock here, where the header has room. */}
            {track ? <div id="registrar-clock" className="-ml-3 min-w-0" /> : null}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {online ? null : (
            <span
              role="status"
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-destructive/15 px-3 text-sm text-destructive"
            >
              <WifiOff className="size-4" aria-hidden />
              Sin conexión
            </span>
          )}
          <button
            type="button"
            onClick={() => setConfirmOut(true)}
            aria-label={`${name}. Toca para cerrar sesión`}
            className="min-h-10 rounded-full bg-card px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            {name}
          </button>
        </div>
      </header>
      <main
        className={cn(
          'min-h-0 w-full flex-1 px-5',
          track ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain pb-6',
        )}
      >
        <Outlet />
      </main>
      <nav
        aria-label="Secciones"
        className="hide-on-keyboard safe-pad-bottom shrink-0 border-t border-border/60 bg-background/90 px-3 pt-1.5 backdrop-blur-md"
      >
        <ul className="grid grid-cols-3 gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                aria-current={
                  tab.also.some((path) => path === pathname) ? 'page' : undefined
                }
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isActive || tab.also.some((path) => path === pathname)
                      ? 'text-lamp'
                      : 'text-muted-foreground',
                  )
                }
              >
                <tab.icon className="size-5" aria-hidden />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <NightSheet
        open={confirmOut}
        onOpenChange={setConfirmOut}
        title={`¿Cerrar la sesión de ${name}?`}
        description="Para volver a entrar necesitas elegir tu nombre y escribir la fecha."
      >
        <SheetButton
          tone="danger"
          onClick={() => {
            setConfirmOut(false)
            onSignOut()
          }}
        >
          Cerrar sesión
        </SheetButton>
      </NightSheet>
    </div>
  )
}
