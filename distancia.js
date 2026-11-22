window.businessDirections = (() => {
  const endpoint = 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/locations/drive/';
  const storageKey = 'anon-reserva-drive-location-v1';
  const lifetime = 5 * 60 * 1000;
  const businessId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  const coordinate = (v, limit) => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') &&
    Number.isFinite(Number(v)) && Math.abs(Number(v)) <= limit;
  const hasPoint = p => p && coordinate(p.latitude, 90) && coordinate(p.longitude, 180);
  const routeViews = new WeakMap();
  const visible = new Set();
  const routes = new Map();
  const requests = new Map();
  let position = null, finding = false, error = '', expiry, pausedUntil = 0;
  let watcher;

  function isRecent(p) {
    return hasPoint(p) && Number.isFinite(p.time) && p.time <= Date.now() && Date.now() - p.time < lifetime;
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    if (isRecent(stored)) position = stored;
    else sessionStorage.removeItem(storageKey);
  } catch {}

  function setPosition(p) {
    clearTimeout(expiry);
    for (const controller of requests.values()) controller.abort();
    requests.clear();
    routes.clear();
    position = p;
    try {
      if (p) sessionStorage.setItem(storageKey, JSON.stringify(p));
      else sessionStorage.removeItem(storageKey);
    } catch {}
    if (p) expiry = setTimeout(() => { setPosition(null); refresh(); }, Math.max(1, p.time + lifetime - Date.now()));
  }

  function link(text, url) {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function disclosure(note, en) {
    note.replaceChildren(
      en ? 'Activate to share your approximate location with ' : 'Al activar, compartes tu ubicación aproximada con ',
      link('Geoapify', 'https://www.geoapify.com/'),
      en ? ' to estimate driving routes. Map data ' : ' para estimar rutas en auto. Datos de ',
      link('© OpenStreetMap', 'https://www.openstreetmap.org/copyright'), '.'
    );
  }

  function activate() {
    if (finding) return;
    finding = true;
    error = '';
    refresh();
    function fail(failure) {
      finding = false;
      error = failure?.code === 1 ? 'permission' : failure?.code === 3 ? 'timeout' : 'unavailable';
      setPosition(null);
      refresh();
    }
    if (!navigator.geolocation) return fail();
    try {
      navigator.geolocation.getCurrentPosition(({coords}) => {
        finding = false;
        if (!hasPoint(coords)) return fail();
        // About 100 metres of precision is sufficient for these travel estimates.
        setPosition({latitude: Number(coords.latitude.toFixed(3)), longitude: Number(coords.longitude.toFixed(3)), time: Date.now()});
        refresh();
      }, fail, {timeout: 12000, maximumAge: 60000});
    } catch { fail(); }
  }
  const messages = {
    permission: ['Permite la ubicación en tu navegador y vuelve a tocar el botón.', 'Allow location in your browser and try again.'],
    timeout: ['No recibimos tu ubicación a tiempo. Puedes volver a intentarlo.', 'Location timed out. You can try again.'],
    unavailable: ['Ubicación no disponible. Puedes intentarlo otra vez.', 'Location unavailable. You can try again.']
  };
  function controls(button, note, status, en) {
    button.onclick = activate;
    button.disabled = finding;
    button.querySelector('span').textContent = finding ? (en ? 'Locating…' : 'Localizando…') :
      position ? (en ? 'Location active' : 'Ubicación activa') : (en ? 'Use my location' : 'Activar mi ubicación');
    if (note && note.dataset.language !== String(en)) {
      disclosure(note, en);
      note.dataset.language = String(en);
    }
    if (status) {
      status.textContent = error ? messages[error][Number(en)] : '';
      status.hidden = !error;
    }
  }
  function straightLine(b, en, fmt) {
    const rad = n => n * Math.PI / 180;
    const h = Math.sin(rad(b.latitude - position.latitude) / 2) ** 2 + Math.cos(rad(position.latitude)) *
      Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - position.longitude) / 2) ** 2;
    const km = 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
    return fmt(km) + ' km · ' + fmt(km / 1.609344) + ' mi ' + (en ? 'straight-line' : 'en línea recta');
  }
  function travelTime(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return minutes + ' min';
    return Math.floor(minutes / 60) + ' h' + (minutes % 60 ? ' ' + minutes % 60 + ' min' : '');
  }
  function draw(group) {
    const view = routeViews.get(group);
    if (!view) return;
    const {b, en, routeId, result} = view;
    const route = routes.get(routeId);
    let line = '';
    if (position) {
      const fmt = n => n.toLocaleString(en ? 'en-US' : 'es-DO', {maximumFractionDigits: 1});
      if (route && route.ok) {
        const km = route.distance_m / 1000;
        line = '≈ ' + travelTime(route.duration_s) + (en ? ' by car · ' : ' en auto · ') + fmt(km) + ' km · ' + fmt(km / 1.609344) + ' mi';
      } else {
        if (hasPoint(b)) line = straightLine(b, en, fmt);
        if (routeId && (route || pausedUntil > Date.now())) line += (line ? ' · ' : '') + (en ? 'Driving estimate unavailable' : 'Estimación en auto no disponible');
        else if (routeId && visible.has(group)) line += (line ? ' · ' : '') + (en ? 'Estimating drive…' : 'Calculando ruta en auto…');
      }
    }
    if (result.textContent !== line) result.textContent = line;
    result.hidden = !line;
    if (view.button) controls(view.button, view.note, view.status, en);
  }
  function refresh() {
    const button = document.getElementById('activate-location');
    if (button) controls(button, document.getElementById('location-disclosure'), document.getElementById('location-status'), document.documentElement.lang === 'en');
    for (const group of document.querySelectorAll('[data-anon-distance]')) draw(group);
    pump();
  }

  async function requestRoute(id, origin) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);
    requests.set(id, controller);
    let route = {ok: false};
    try {
      const response = await fetch(endpoint, {method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({business_id: id, latitude: origin.latitude, longitude: origin.longitude})});
      if (origin !== position) return;
      if (response.status === 429 || response.status === 503) pausedUntil = Date.now() + 60000;
      if (response.ok) {
        const data = await response.json();
        if (Number.isFinite(data.distance_m) && data.distance_m >= 0 && Number.isFinite(data.duration_s) && data.duration_s >= 0)
          route = {ok: true, distance_m: data.distance_m, duration_s: data.duration_s};
      }
    } catch {
      // Keep address directions and any straight-line distance usable while routing is offline.
    } finally {
      clearTimeout(timeout);
      if (requests.get(id) === controller) {
        requests.delete(id);
        routes.set(id, route);
        refresh();
      }
    }
  }
  function pump() {
    if (!position || finding || document.hidden || pausedUntil > Date.now()) return;
    if (!isRecent(position)) { setPosition(null); refresh(); return; }
    for (const group of visible) {
      if (requests.size >= 2) break;
      const id = routeViews.get(group)?.routeId;
      if (id && group.isConnected && !routes.has(id) && !requests.has(id)) void requestRoute(id, position);
    }
  }
  if (typeof IntersectionObserver === 'function') {
    watcher = new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (isIntersecting && target.isConnected) visible.add(target);
        else visible.delete(target);
        draw(target);
      }
      pump();
    });
  }
  function track(group, attached) {
    if (!routeViews.has(group)) return;
    if (attached) {
      if (watcher) watcher.observe(group);
      else if (routeViews.get(group).button) visible.add(group);
      draw(group);
    } else {
      watcher?.unobserve(group);
      visible.delete(group);
    }
  }
  new MutationObserver(records => {
    let changed = false;
    for (const record of records) {
      for (const nodes of [record.addedNodes, record.removedNodes]) for (const node of nodes) {
        if (node.nodeType !== 1) continue;
        const groups = node.matches('[data-anon-distance]') ? [node] : node.querySelectorAll('[data-anon-distance]');
        for (const group of groups) { track(group, group.isConnected); changed = true; }
      }
    }
    if (changed) pump();
  }).observe(document.body, {subtree: true, childList: true});
  new MutationObserver(refresh).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  if (position) setPosition(position);
  refresh();

  return function directions(b, english = false, distanceOnly = false, localBusiness = true) {
    const pin = hasPoint(b);
    if (!pin && !b.address?.trim()) return null;
    const dest = pin ? [b.latitude, b.longitude] : [b.address, b.city, b.country];
    const query = new URLSearchParams({api: '1', destination: dest.filter(v => v != null && v !== '').join(', '), travelmode: 'driving'});
    const maps = link(english ? 'Get directions' : 'Cómo llegar', 'https://www.google.com/maps/dir/?' + query);
    maps.className = 'business-directions';
    if (!localBusiness) return distanceOnly ? null : maps;
    const routeId = ['US','DO'].includes(b.country) && businessId.test(b.id) ? b.id : null;
    if (!pin && !routeId) return distanceOnly ? null : maps;
    const group = document.createElement('div'), result = document.createElement('small');
    group.dataset.anonDistance = '';
    group.className = 'route-estimate';
    group.append(result);
    const view = {b, en: english, routeId, result};
    if (!distanceOnly) {
      group.append(maps);
      if (routeId) {
        const button = document.createElement('button'), note = document.createElement('small'), status = document.createElement('small');
        button.type = 'button';
        button.className = 'route-locate';
        button.append(document.createElement('span'));
        button.setAttribute('aria-describedby', 'profile-route-disclosure');
        note.id = 'profile-route-disclosure';
        note.className = 'route-note';
        status.setAttribute('role', 'status');
        group.append(button, note, status);
        Object.assign(view, {button, note, status});
      }
    }
    routeViews.set(group, view);
    draw(group);
    return group;
  };
})();
