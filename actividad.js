// Observe authenticated activity without extending the existing session.
(() => {
  const api = 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/';
  const entry = document.getElementById('platform-nav');
  let active;
  function clear() {
    active?.abort();
    if (entry) entry.hidden = true;
  }
  async function report() {
    if (document.hidden || active) return;
    const controller = new AbortController();
    active = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
    const options = {credentials: 'include', cache: 'no-store', signal: controller.signal};
    try {
      const response = await fetch(api + 'auth/presence/', options);
      const state = response.ok && await response.json();
      if (document.hidden || controller.signal.aborted) return;
      if (entry) entry.hidden = !(state?.authenticated && state.platformAdmin);
      if (state?.authenticated && state.platformActivityEnabled) {
        const pulse = await fetch(api + 'platform-activity/', {...options, method: 'POST', headers: {'X-CSRFToken': state.csrf}});
        if (!pulse.ok && entry) entry.hidden = true;
      }
    } catch {
      if (entry) entry.hidden = true;
    } finally {
      clearTimeout(timer);
      active = null;
    }
  }
  window.addEventListener('pageshow', report);
  window.addEventListener('pagehide', clear);
  window.addEventListener('anon:authenticated', report);
  document.addEventListener('visibilitychange', () => document.hidden ? clear() : report());
  setInterval(report, 45000);
  report();
})();
