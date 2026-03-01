// Service Worker — incoming call push notifications

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const from = data.from || 'Unknown number';

  e.waitUntil(
    self.registration.showNotification('Incoming Call', {
      body: from,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'incoming-call',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        { action: 'answer',  title: '✅ Answer'  },
        { action: 'decline', title: '❌ Decline' },
      ],
      data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();

  const action = e.action; // 'answer' | 'decline' | '' (body click)
  const type = action === 'decline' ? 'decline-call' : 'answer-call';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Find an open SMQ tab
      const smqClient = list.find(c => c.url.includes(self.location.origin));

      if (smqClient) {
        smqClient.focus();
        smqClient.postMessage({ type, data: e.notification.data });
      } else {
        // No tab open — open the app then answer
        clients.openWindow(self.registration.scope).then(newClient => {
          if (newClient) newClient.postMessage({ type, data: e.notification.data });
        });
      }
    })
  );
});

self.addEventListener('notificationclose', e => {
  // Notification dismissed without clicking — treat as decline
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    list.forEach(c => c.postMessage({ type: 'decline-call', data: e.notification.data }));
  });
});
