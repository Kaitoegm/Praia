self.addEventListener("push", (event) => {
  const aviso = event.data?.json();
  if (!aviso) return;
  event.waitUntil(self.registration.showNotification("OHANA", {
    body: aviso.texto,
    icon: "/ohana-192.png",
    tag: "foto-" + aviso.id,
    data: { url: "/album?familia=1" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/album?familia=1"));
});
