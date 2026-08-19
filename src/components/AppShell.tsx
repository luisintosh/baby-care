import { NavLink, Outlet } from 'react-router-dom'
import { Bell, ChartNoAxesColumn, NotebookPen } from 'lucide-react'
import { caregiverName } from '@/lib/caregiver'
import { cn } from '@/lib/utils'
import type { Caregiver } from '@/lib/types'

const TABS = [
  { to: '/', label: 'Registrar', icon: NotebookPen, end: true },
  { to: '/metricas', label: 'Métricas', icon: ChartNoAxesColumn, end: false },
  { to: '/recordatorios', label: 'Avisos', icon: Bell, end: false },
] as const

type AppShellProps = {
  caregiver: Caregiver
  onChangeUser: () => void
}

export function AppShell({ caregiver, onChangeUser }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="text-[0.7rem] tracking-[0.28em] text-lamp uppercase">Cuna</p>
          <h1 className="font-heading text-xl">Seguimiento</h1>
        </div>
        <button
          type="button"
          onClick={onChangeUser}
          className="rounded-full bg-card px-3 py-2 text-sm ring-1 ring-white/10"
        >
          {caregiverName(caregiver)}
        </button>
      </header>
      <main className="flex-1 px-5 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-white/8 bg-background/90 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <ul className="grid grid-cols-3 gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs',
                    isActive ? 'bg-lamp/15 text-lamp' : 'text-muted-foreground',
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
