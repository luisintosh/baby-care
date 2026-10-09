import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { UserGate } from '@/components/UserGate'
import { Toaster } from '@/components/ui/sonner'
import { useEvents } from '@/hooks/use-events'
import { useReminders } from '@/hooks/use-reminders'
import { useSession } from '@/hooks/use-session'
import { caregiverFromSession, signOutCaregiver } from '@/lib/auth'
import type { Caregiver } from '@/lib/types'
import { HistoryPage } from '@/pages/HistoryPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { RemindersPage } from '@/pages/RemindersPage'
import { TrackPage } from '@/pages/TrackPage'

export default function App() {
  const session = useSession()

  if (session === undefined) {
    return <main className="w-full max-w-md flex-1" />
  }

  const caregiver = caregiverFromSession(session)
  if (!session || !caregiver) {
    return (
      <>
        <UserGate />
        <Toaster theme="dark" />
      </>
    )
  }

  return <SignedIn caregiver={caregiver} />
}

function SignedIn({ caregiver }: { caregiver: Caregiver }) {
  const eventsApi = useEvents()
  const remindersApi = useReminders()

  return (
    <HashRouter>
      <Routes>
        <Route
          element={
            <AppShell caregiver={caregiver} onChangeUser={() => void signOutCaregiver()} />
          }
        >
          <Route
            index
            element={
              <TrackPage
                caregiver={caregiver}
                eventsApi={eventsApi}
                remindersApi={remindersApi}
              />
            }
          />
          <Route path="historial" element={<HistoryPage eventsApi={eventsApi} />} />
          <Route
            path="metricas"
            element={<MetricsPage events={eventsApi.events} loading={eventsApi.loading} />}
          />
          <Route
            path="recordatorios"
            element={
              <RemindersPage
                caregiver={caregiver}
                reminders={remindersApi.reminders}
                active={remindersApi.active}
                onCreate={remindersApi.createReminder}
                onComplete={remindersApi.completeReminder}
                onDelete={remindersApi.deleteReminder}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster theme="dark" />
    </HashRouter>
  )
}
