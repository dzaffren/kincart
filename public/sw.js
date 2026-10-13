// Registered once per secret link, with that link as its scope (D28). No fetch handler, so nothing is cached.

self.addEventListener("push", (event) => {
  const { title, body } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, { body, icon: "/icon-192.png", badge: "/badge-96.png" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const page = self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(page));
      return open ? open.focus() : self.clients.openWindow(page);
    }),
  );
});
