import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { bindAppViewport } from '@/lib/app-viewport'
import { feedPeriod } from '@/lib/feed-schedule'
import App from './App.tsx'
import './index.css'

bindAppViewport()

// Night (22:00–07:00) dims the palette; see index.css.
function markPeriod() {
  document.documentElement.dataset.period = feedPeriod(new Date())
}
markPeriod()
window.setInterval(markPeriod, 60_000)
document.addEventListener('visibilitychange', markPeriod)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
