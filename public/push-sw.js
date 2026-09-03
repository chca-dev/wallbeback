self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    return
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'Wall Be Back', {
    body: payload.body || 'Une nouvelle publication familiale est disponible.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url || '/wall' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/wall', self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existingWindow = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (existingWindow) {
      await existingWindow.navigate(targetUrl)
      return existingWindow.focus()
    }
    return self.clients.openWindow(targetUrl)
  })())
})
