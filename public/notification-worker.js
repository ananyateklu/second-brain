self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  const options = {
    body: event.data ? event.data.text() : 'Notification from Second Brain',
    icon: '/brain-top.png',
    badge: '/brain-top.png',
    data: event.data ? event.data.json() : {},
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification('Second Brain', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);

  event.notification.close();

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        if (event.notification.data && event.notification.data.reminderId) {
          return clients.openWindow('/dashboard/reminders');
        }
        return clients.openWindow('/');
      }
    })
  );
}); 