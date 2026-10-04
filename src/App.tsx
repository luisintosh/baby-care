import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { UserGate } from '@/components/UserGate'
import { Toaster } from '@/components/ui/sonner'
import { useCaregiver } from '@/hooks/use-caregiver'
import { useEvents } from '@/hooks/use-events'
import { useReminders } from '@/hooks/use-reminders'
import { HistoryPage } from '@/pages/HistoryPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { RemindersPage } from '@/pages/RemindersPage'
import { TrackPage } from '@/pages/TrackPage'

export default function App() {
  const { caregiver, choose, reset } = useCaregiver()
  const eventsApi = useEvents()
  const remindersApi = useReminders()

  if (!caregiver) {
    return (
      <>
        <UserGate onChoose={choose} />
        <Toaster theme="dark" />
      </>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell caregiver={caregiver} onChangeUser={reset} />}>
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
