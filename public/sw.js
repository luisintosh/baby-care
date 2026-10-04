const CACHE_NAME = 'cuna-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('push', (event) => {
  const payload = { title: 'Toca comida', body: '', tag: 'feed-due' }
  try {
    if (event.data) Object.assign(payload, event.data.json())
  } catch {
    if (event.data) payload.body = event.data.text()
  }

  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: new URL('pwa-192x192.png', scope).href,
      badge: new URL('pwa-64x64.png', scope).href,
      tag: payload.tag || 'feed-due',
      renotify: true,
      lang: 'es',
      data: { url: scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL('./', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isAppAsset = url.origin === self.location.origin
  const isFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

  if (!isAppAsset && !isFont) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const fallback = await caches.match('./index.html')
          if (fallback) return fallback
        }
        return Response.error()
      }),
  )
})
