self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Focus the app window when the user clicks the notification card on Android
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Listen to incoming Web Push notifications from the server in the background
self.addEventListener('push', (event) => {
  let data = { title: "Docket Assistant", message: "You have a new check-in." };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Docket Assistant", message: event.data.text() };
    }
  }

  const options = {
    body: data.message || data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Docket Assistant", options)
  );
});
