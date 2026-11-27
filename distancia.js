window.businessDirections = (() => {
  const key = 'anon-reserva-location';
  let position, pending = false, error = '';
  const valid = (v, max) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) &&
    Number.isFinite(Number(v)) && Math.abs(Number(v)) <= max;
  const hasPoint = point => point && valid(point.latitude,90) && valid(point.longitude,180);
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (hasPoint(saved) && Date.now() - saved.time < 60000) position = saved;
    else sessionStorage.removeItem(key);
  } catch {}
  const button = document.getElementById('activate-location');
  function refresh() {
    if (button) {
      const en = document.documentElement.lang === 'en';
      button.disabled = pending;
      button.querySelector('span').textContent = pending ? (en ? 'Locating…' : 'Localizando…') :
        position ? (en ? 'Location active' : 'Ubicación activa') : (en ? 'Use my location' : 'Activar mi ubicación');
      const status = document.getElementById('location-status');
      status.textContent = error;
      status.hidden = !error;
    }
    document.querySelectorAll('[data-anon-distance]').forEach(group => group.renderDistance());
  }
  if (button) {
    new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    button.onclick = () => {
      const en = document.documentElement.lang === 'en';
      function fail(reason) {
        position = null; pending = false;
        try { sessionStorage.removeItem(key); } catch {}
        error = reason?.code === 1 ? (en ? 'Allow location in your browser to see distances.' : 'Permite la ubicación en tu navegador para ver las distancias.') :
          (en ? 'Location unavailable. Try again.' : 'Ubicación no disponible. Inténtalo otra vez.');
        refresh();
        window.dispatchEvent(new Event('anon:location-change'));
      }
      pending = true; error = ''; refresh();
      if (!navigator.geolocation) return fail();
      try {
        navigator.geolocation.getCurrentPosition(({coords}) => {
          if (!hasPoint(coords)) return fail();
          position = {latitude:coords.latitude,longitude:coords.longitude,time:Date.now()};
          try { sessionStorage.setItem(key,JSON.stringify(position)); } catch {}
          pending = false; refresh();
          window.dispatchEvent(new Event('anon:location-change'));
        },fail,{timeout:10000,maximumAge:60000});
      } catch { fail(); }
    };
    refresh();
  }
  function kilometers(b) {
    if (!position || !hasPoint(b)) return Infinity;
    const rad = n => n * Math.PI / 180;
    const h = Math.sin(rad(b.latitude - position.latitude)/2)**2 + Math.cos(rad(position.latitude)) *
      Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - position.longitude)/2)**2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function directions(b, english = false, distanceOnly = false) {
    const pin = hasPoint(b);
    if (!pin && !b.address?.trim()) return null;
    const dest = pin ? [b.latitude,b.longitude] : [b.address,b.city,b.country];
    const link = document.createElement('a');
    link.href = 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',destination:dest.filter(v => v != null && v !== '').join(', ')});
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'business-directions';
    link.textContent = english ? 'Get directions' : 'Cómo llegar';
    if (!pin) return distanceOnly ? null : link;
    const group = document.createElement('div');
    group.dataset.anonDistance = '';
    const distance = document.createElement('small');
    group.append(distance);
    if (!distanceOnly) group.append(link);
    group.renderDistance = () => {
      distance.hidden = !position;
      if (!position) return;
      const km = kilometers(b);
      const fmt = n => n.toLocaleString(english ? 'en-US' : 'es-DO',{maximumFractionDigits:1});
      const units = b.country === 'US' ? fmt(km/1.609344)+' mi' : fmt(km)+' km';
      distance.textContent = units+' '+(english ? 'straight-line' : 'en línea recta') + (distanceOnly ? '' : ' · ');
    };
    group.renderDistance();
    return group;
  }
  directions.hasLocation = () => Boolean(position);
  directions.kilometers = kilometers;
  return directions;
})();
