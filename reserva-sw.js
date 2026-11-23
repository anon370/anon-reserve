self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('ANON Reserva', {
    body: 'Tienes un aviso de reserva. Toca para ver los detalles.',
    icon: './anon-marca.svg'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./citas.html?vista=perfil'));
});
