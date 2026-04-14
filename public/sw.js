self.addEventListener('push', function(event) {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url, notifId: data.notifId },
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const notifId = event.notification.data?.notifId
  const url = '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const target = clientList.find(c => c.url.includes(self.location.origin))
      if (target) {
        target.postMessage({ type: 'OPEN_NOTIFICATION', notifId })
        return target.focus()
      }
      return clients.openWindow(url + '?tab=notifications' + (notifId ? `&notifId=${notifId}` : ''))
    })
  )
})
