import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Bell, ChartNoAxesColumn, NotebookPen } from 'lucide-react'
import { caregiverName } from '@/lib/caregiver'
import { cn } from '@/lib/utils'
import type { Caregiver } from '@/lib/types'

const TABS = [
  { to: '/', label: 'Registrar', icon: NotebookPen, end: true, also: ['/historial'] },
  { to: '/metricas', label: 'Métricas', icon: ChartNoAxesColumn, end: false, also: [] },
  { to: '/recordatorios', label: 'Avisos', icon: Bell, end: false, also: [] },
] as const

type AppShellProps = {
  caregiver: Caregiver
  onChangeUser: () => void
}

export function AppShell({ caregiver, onChangeUser }: AppShellProps) {
  const { pathname } = useLocation()
  const track = pathname === '/'

  return (
    <div className="flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden">
      <header className="safe-pad-top flex shrink-0 items-center justify-end px-5 pb-2">
        <button
          type="button"
          onClick={onChangeUser}
          className="rounded-full bg-card px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {caregiverName(caregiver)}
        </button>
      </header>
      <main
        className={cn(
          'min-h-0 w-full flex-1 px-5',
          track
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto overscroll-y-contain pb-6',
        )}
      >
        <Outlet />
      </main>
      <nav className="safe-pad-bottom shrink-0 bg-background/90 px-3 pt-2 backdrop-blur-md">
        <ul className="grid grid-cols-3 gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isActive || tab.also.some((path) => path === pathname)
                      ? 'text-lamp'
                      : 'text-muted-foreground',
                  )
                }
              >
                <tab.icon className="size-5" />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
