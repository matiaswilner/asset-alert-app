self.addEventListener('push', function(event) {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      data: { notifId: data.notifId },
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const notifId = event.notification.data?.notifId
  const targetUrl = '/?tab=notifications' + (notifId ? `&notifId=${notifId}` : '')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
