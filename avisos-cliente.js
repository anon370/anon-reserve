export function configurarAvisos(api) {
  const button = document.getElementById('activar-avisos');
  const status = document.getElementById('estado-avisos');
  if (!navigator.serviceWorker || !('PushManager' in window) || !('Notification' in window)) {
    button.hidden = true;
    status.textContent = 'En iPhone, añade ANON Reserva a la pantalla de inicio y ábrela desde su icono para activar los avisos.';
    return;
  }
  button.onclick = async () => {
    button.disabled = true;
    try {
      if (await Notification.requestPermission() !== 'granted') {
        status.textContent = 'Para recibir avisos, permite las notificaciones en los ajustes del teléfono.';
        return;
      }
      const {key} = await api('push/devices/');
      await navigator.serviceWorker.register('./reserva-sw.js');
      const registration = await navigator.serviceWorker.ready;
      const encoded = key.replace(/-/g, '+').replace(/_/g, '/');
      const applicationServerKey = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey});
      await api('push/devices/', 'POST', subscription.toJSON());
      status.textContent = 'Los avisos de reserva están activados en este teléfono.';
    } catch {
      status.textContent = 'No se pudieron activar los avisos. Puedes volver a intentarlo y consultar tus reservas aquí.';
    } finally {
      button.disabled = false;
    }
  };
}
