import {configurarAvisos} from './avisos-cliente.js';
import {ratingForm} from './valoraciones.js';
import {categoryPhoto, money} from './servicio-visual.js';
import {api, el, identity, localDay, notice, options, node, listen, bookingList, loadNotices} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';

const route = new URLSearchParams(location.search);
const bookingMode = route.get('paso') === 'horario' && route.has('negocio');
const businessId = route.get('negocio');
const profileURL = './citas.html?vista=perfil';
const dayInput = el('fecha');
const dateFormat = fields => new Intl.DateTimeFormat('es-DO', {timeZone: 'UTC', ...fields});
const weekday = dateFormat({weekday: 'short'});
const fullDay = dateFormat({dateStyle: 'full'});
const month = dateFormat({month: 'long', year: 'numeric'});
let business, openingDay, firstVisibleDay, slots = [], chosenStart = '';
let slotRequest = 0, expanded = false, saving = false, retry = null;

function businessURL() {
  const params = new URLSearchParams({negocio: businessId});
  const service = el('servicio').value || route.get('servicio');
  if (service) params.set('servicio', service);
  return './ficha.html?' + params;
}
if (businessId && !bookingMode) location.replace(businessURL());
if (bookingMode) {
  el('atras').href = businessURL();
  el('atras').setAttribute('aria-label', 'Volver a la ficha del negocio');
}

function view(name, title) {
  document.body.dataset.view = name;
  document.title = title + ' · ANON Reserva';
  el('page-title').hidden = name === 'access';
  el('page-title').textContent = title;
  el('perfil-enlace').hidden = name !== 'booking' && name !== 'receipt';
  el('booking-section').hidden = name !== 'booking';
  el('customer-profile').hidden = name !== 'profile';
  el('history').hidden = name !== 'profile';
  el('receipt').hidden = name !== 'receipt';
}

function showBookings(target) {
  el('all-bookings').open = true;
  target.tabIndex = -1;
  target.focus();
  target.scrollIntoView({block: 'center'});
}

el('show-bookings').onclick = () => showBookings(el('all-bookings').querySelector('summary'));

function renderUpcoming(bookings) {
  const box = el('next-booking');
  const index = bookings.findIndex(b => ['pending', 'confirmed'].includes(b.status) && Date.parse(b.start) >= Date.now());
  if (index < 0) {
    box.textContent = 'No tienes próximas citas.';
    return;
  }
  const b = bookings[index];
  const format = options => new Intl.DateTimeFormat('es', {timeZone: b.timezone, ...options}).format(new Date(b.start));
  const date = node('div');
  date.className = 'profile-date';
  date.append(node('small', format({month: 'short'})), node('strong', format({day: 'numeric'})));
  const info = node('div');
  info.append(node('strong', b.service), node('div', b.business),
    node('div', format({hour: 'numeric', minute: '2-digit', hour12: true}) + ' · ' + b.resource));
  const status = node('span', b.status === 'pending' ? 'Pendiente' : 'Confirmada');
  status.className = 'profile-status';
  const details = node('button', 'Ver detalles →');
  details.type = 'button';
  details.onclick = () => showBookings(el('citas').children[index]);
  box.replaceChildren(date, info, status, details);
}

async function appointments() {
  const {bookings} = await api('bookings/?scope=client');
  bookingList(el('citas'), bookings, false, appointments);
  renderUpcoming(bookings);
  const reviews = el('valoraciones');
  reviews.replaceChildren();
  const businesses = new Set();
  for (const booking of bookings) {
    if (!booking.can_rate || businesses.has(booking.business_id)) continue;
    businesses.add(booking.business_id);
    reviews.append(node('h3', 'Valorar mi visita a ' + booking.business),
      ratingForm(booking.my_rating, (stars, comment) => api('bookings/' + booking.id + '/rating/', 'POST', {stars,comment}),booking.my_comment));
  }
  await loadNotices('scope=client');
}
listen(el('actualizar'), 'click', appointments);

function profile(session) {
  view('profile', 'Mi perfil');
  configurarAvisos(api);
  el('profile-name').textContent = session.user.name;
  el('profile-initial').textContent = [...session.user.name.trim()][0]?.toUpperCase() || '';
  el('profile-logout').append(el('salir'));
  new MutationObserver(() => {
    const count = parseInt(el('avisos').firstElementChild?.textContent, 10);
    el('unread-count').textContent = count > 0 ? String(count) : '';
  }).observe(el('avisos'), {childList: true});
  el('profile-email').textContent = session.user.email;
  el('profile-phone').textContent = session.user.phone || '';
  const actions = el('manage-profiles');
  actions.replaceChildren();
  function link(text, href) {
    const a = node('a', text);
    a.className = 'profile-row';
    a.href = href;
    actions.append(a);
  }
  const owned = (session.workspaces || []).filter(w => w.role === 'owner');
  if (session.independent || owned.length) {
    const suffix = session.independent ? '' : encodeURIComponent(owned[0].id) + '/';
    api('storefront/settings/' + suffix).then(() => {
      if (session.independent) link('Editar mi ficha de independiente', './editar-ficha.html');
      for (const item of owned) link('Editar ficha · ' + item.name, './editar-ficha.html?negocio=' + encodeURIComponent(item.id));
    }).catch(() => {});
  }
  const purchaseBox = el('profile-purchases');
  api('purchases/').then(({purchases})=>{
    purchaseBox.append(node('p','Sin pagos realizados en la plataforma.'));
    for(const p of purchases)purchaseBox.append(node('p',p.business__name+' · '+p.name+' · '+p.currency+' '+p.amount+' · Pendiente de pago'));
  }).catch(error=>purchaseBox.append(node('p',error.message)));
  return appointments();
}

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const utcDay = s => new Date(s + 'T12:00:00Z');
function offsetDay(s, offset) {
  const date = utcDay(s);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function timeLabel(start) {
  return new Intl.DateTimeFormat('es-DO', {timeZone: business.timezone, hour: 'numeric', minute: '2-digit', hour12: true})
    .format(new Date(start)).replace(/\ba\.?\s*m\.?/i, 'a. m.').replace(/\bp\.?\s*m\.?/i, 'p. m.');
}
function mark(group, value) {
  for (const button of group.children) button.setAttribute('aria-pressed', String(button.value === value));
}
function drawDays() {
  const value = dayInput.value;
  if (!firstVisibleDay || value < firstVisibleDay || value > offsetDay(firstVisibleDay, 4)) {
    firstVisibleDay = offsetDay(value, 4) > dayInput.max ? offsetDay(dayInput.max, -4) : value;
  }
  el('month').textContent = capitalize(month.format(utcDay(value)).replace(' de ', ' '));
  const buttons = [];
  for (let i = 0; i < 5; i++) {
    const day = offsetDay(firstVisibleDay, i), date = utcDay(day);
    const button = node('button');
    button.type = 'button';
    button.value = day;
    button.setAttribute('aria-label', fullDay.format(date));
    button.append(node('span', capitalize(weekday.format(date).replace('.', ''))), node('strong', String(date.getUTCDate())));
    buttons.push(button);
  }
  el('dias').replaceChildren(...buttons);
  mark(el('dias'), value);
}

function drawSlots() {
  const group = el('horarios');
  group.replaceChildren();
  const visible = expanded ? slots : slots.filter((slot, index) => index < 4 || slot.start === chosenStart);
  for (const slot of visible) {
    const button = node('button', timeLabel(slot.start));
    button.type = 'button';
    button.value = slot.start;
    group.append(button);
  }
  mark(group, chosenStart);
  const more = el('mas-horas');
  more.hidden = slots.length <= 4;
  more.textContent = expanded ? 'Ver menos horarios' : 'Ver más horarios';
  more.setAttribute('aria-expanded', String(expanded));
  el('confirmar').disabled = saving || !chosenStart;
}

function getService() { return business?.services.find(s => s.id === el('servicio').value); }

function fillCard() {
  const service = getService();
  el('service-photo').replaceChildren();
  el('local').textContent = [business.name, business.city].filter(Boolean).join(' · ');
  el('service-terms').textContent = '';
  el('total').textContent = '';
  el('atras').href = businessURL();
  if (!service) return;
  const fallback = categoryPhoto(service.name, service.category || business.category);
  const src = service.photo;
  if (typeof src === 'string' && /^(https:\/\/|data:image\/jpeg;base64,)/i.test(src)) {
    const image = node('img');
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.onerror = () => image.replaceWith(fallback);
    image.src = src;
    el('service-photo').append(image);
  } else {
    el('service-photo').append(fallback);
  }
  const price = money(service.price, business.country);
  el('total').textContent = price;
  el('service-terms').textContent = [price, service.minutes && service.minutes + ' min'].filter(Boolean).join(' · ');
}

async function loadSlots(refresh = false) {
  const background = refresh === true;
  const request = ++slotRequest;
  if (!background) {
    chosenStart = '';
    slots = [];
    expanded = false;
    drawSlots();
  }
  const service = getService();
  if (!service || !el('recurso').value) {
    el('slot-status').textContent = service ? 'Este servicio todavía no tiene un profesional o una mesa disponible.' : 'Elige un servicio disponible.';
    return;
  }
  if (!dayInput.validity.valid || !dayInput.value || dayInput.value < openingDay || dayInput.value > dayInput.max) {
    el('slot-status').textContent = 'Elige una fecha dentro del período de reserva.';
    return;
  }
  if (!background) el('slot-status').textContent = 'Buscando horarios…';
  const q = new URLSearchParams({service: service.id, resource: el('recurso').value, date: dayInput.value});
  try {
    const result = await api('catalog/' + encodeURIComponent(business.id) + '/slots/?' + q);
    if (request !== slotRequest) return;
    slots = result.slots;
    chosenStart = background ? (slots.some(slot => slot.start === chosenStart) ? chosenStart : '') : slots[0]?.start || '';
    el('slot-status').textContent = slots.length ? '' : 'No quedan horas disponibles para este día. Prueba con otra fecha.';
    if(result.busy_until && dayInput.value===localDay(business.timezone)){
      el('slot-status').textContent='Ocupado hasta '+new Date(result.busy_until).toLocaleTimeString('es',{timeZone:business.timezone,hour:'2-digit',minute:'2-digit'})+'. '+el('slot-status').textContent;
    }
    drawSlots();
  } catch (err) {
    if (request !== slotRequest) return;
    if (background) return;
    el('slot-status').textContent = err.message;
    const again = node('button', 'Volver a buscar');
    again.type = 'button';
    again.className = 'text-button';
    again.onclick = loadSlots;
    el('slot-status').append(' ', again);
  }
}

function refreshAvailability(){
  if(!document.hidden && !saving && business && document.body.dataset.view === 'booking') loadSlots(true);
}
if(bookingMode){
  setInterval(refreshAvailability, 30000);
  document.addEventListener('visibilitychange',refreshAvailability);
}

el('dias').onclick = event => {
  const button = event.target.closest('button');
  if (!button || saving || !business) return;
  dayInput.value = button.value;
  mark(el('dias'), dayInput.value);
  el('month').textContent = capitalize(month.format(utcDay(dayInput.value)).replace(' de ', ' '));
  loadSlots();
};
dayInput.onchange = () => {
  if (dayInput.value && dayInput.validity.valid) drawDays();
  loadSlots();
};
dayInput.onclick = () => { if (dayInput.showPicker) { try { dayInput.showPicker(); } catch {} } };
el('mas-horas').onclick = () => {
  expanded = !expanded;
  drawSlots();
};
el('horarios').onclick = event => {
  const button = event.target.closest('button');
  if (!button || saving) return;
  chosenStart = button.value;
  mark(el('horarios'), chosenStart);
};
el('recurso').onchange = loadSlots;
el('servicio').onchange = () => { fillCard(); loadSlots(); };

function showBarbers(resources, barberia) {
  const select = el('recurso');
  select.closest('.resource-row').hidden = true;
  let group = el('barber-choice');
  if (!group) {
    group = document.createElement('fieldset');
    group.id = 'barber-choice';
    select.parentElement.after(group);
  }
  group.replaceChildren(node('legend',barberia?'Elige tu barbero':'Elige quién te atenderá'));
  for (const person of resources) {
    const label = node('label');
    const input = node('input');
    input.type = 'radio';
    input.name = 'barbero';
    input.value = person.id;
    input.checked = select.value === person.id;
    const face = node('span',person.name.trim().split(/\s+/u).map(word => word[0]).slice(0,2).join('').toUpperCase());
    face.className = 'barber-portrait';
    if (person.photo) {
      const photo = node('img');
      photo.alt = '';
      photo.src = person.photo;
      photo.onerror = () => photo.remove();
      face.append(photo);
    }
    label.append(input, face, node('span',person.name));
    input.onchange = () => {
      if (saving) return;
      select.value = person.id;
      loadSlots();
    };
    group.append(label);
  }
}

async function openBooking() {
  view('booking', 'Reservar una cita');
  el('booking-section').hidden = true;
  business = await api('catalog/' + encodeURIComponent(businessId) + '/');
  if (!['DO','US'].includes(business.country)) throw Error('Este negocio está fuera de los países disponibles.');
  const serviceSelect = el('servicio');
  options(serviceSelect, business.services);
  const requested = route.get('servicio');
  if (requested) serviceSelect.value = requested;
  if (requested && !serviceSelect.value) {
    notice('El servicio elegido ya no está disponible. Puedes seleccionar otro.');
    serviceSelect.prepend(new Option('Elegir servicio', '', true, true));
  }
  serviceSelect.disabled = serviceSelect.options.length === 1 && !!serviceSelect.value;
  options(el('recurso'), business.resources);
  if (['bar', 'bar_restaurante', 'restaurante', 'cafeteria'].includes(business.category)) el('resource-label').textContent = 'Mesa';
  if (business.resources.length && (business.category === 'barberia' || business.resources.some(person=>person.photo))) showBarbers(business.resources,business.category === 'barberia');
  openingDay = localDay(business.timezone);
  dayInput.min = openingDay;
  dayInput.max = localDay(business.timezone, 365);
  dayInput.value = openingDay;
  el('zona').textContent = business.city ? 'Hora de ' + business.city : 'Hora local del negocio';
  fillCard();
  drawDays();
  el('booking-section').hidden = false;
  await loadSlots();
}

el('reservar').addEventListener('submit', async event => {
  event.preventDefault();
  if (saving || !chosenStart || !business || !slots.some(s => s.start === chosenStart)) return;
  const data = {business_id: business.id, resource_id: el('recurso').value, service_id: el('servicio').value, start: chosenStart};
  const signature = JSON.stringify(data);
  if (retry?.signature !== signature) retry = {signature, id: crypto.randomUUID()};
  const serviceName = getService().name;
  saving = true;
  el('reservar').inert = true;
  el('confirmar').disabled = true;
  notice('Registrando tu cita…');
  try {
    const booking = await api('bookings/', 'POST', {...data, request_id: retry.id});
    retry = null;
    view('receipt', 'Cita registrada');
    notice('');
    const date = new Intl.DateTimeFormat('es-DO', {dateStyle:'long', timeZone:business.timezone}).format(new Date(data.start));
    const status = {pending:'Pendiente de confirmación del negocio.', confirmed:'Confirmada por el negocio.', cancelled:'Cancelada.'};
    el('receipt-detail').textContent = [serviceName, business.name, date, timeLabel(data.start), status[booking.status]].filter(Boolean).join(' · ');
    el('page-title').tabIndex = -1;
    el('page-title').focus();
  } catch (error) {
    notice(error.message);
    if (/ocupado|durante ese horario|fuera del horario/.test(error.message)) await loadSlots();
  } finally {
    saving = false;
    el('reservar').inert = false;
    el('confirmar').disabled = !chosenStart;
  }
});

const account = identity(async session => {
  if (route.get('volver') === 'catalogo' && !businessId) { location.replace('./?vista=catalogo'); return; }
  if (bookingMode) await openBooking();
  else await profile(session);
});
const access = el('acceso');
const heading = node('h1');
access.querySelector('h2').replaceWith(heading);
const intro = node('p', 'Accede a tus reservas y a tu perfil.');
intro.className = 'access-intro';
heading.after(intro);
const email = access.elements.email;
email.parentElement.firstChild.textContent = 'Correo electrónico';
email.placeholder = 'tu@correo.com';
const password = access.elements.password;
const label = password.parentElement;
label.htmlFor = password.id = 'clave';
const wrapper = node('div');
wrapper.className = 'password-field';
label.after(wrapper);
password.classList.add('with-eye');
wrapper.append(password, el('ver-clave').content.cloneNode(true));
const eye = wrapper.querySelector('button');
eye.onclick = () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  eye.setAttribute('aria-pressed', String(visible));
  eye.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
};
el('recuperar').textContent = '¿Olvidaste tu contraseña?';
access.querySelector('[type=submit]').before(el('recuperar'));
function accessTitle() {
  const register = !el('etiqueta-nombre').hidden;
  heading.textContent = register ? 'Crear una cuenta' : 'Iniciar sesión';
  intro.textContent = register ? 'Crea tu cuenta de ANON Reserva.' : 'Accede a tus reservas y a tu perfil.';
  el('alternar').textContent = register ? 'Ya tengo una cuenta' : 'Crear una cuenta';
  password.type = 'password';
  eye.setAttribute('aria-pressed','false');
  eye.setAttribute('aria-label','Mostrar contraseña');
  if (document.body.dataset.view === 'access') view('access', heading.textContent);
}
el('alternar').addEventListener('click', accessTitle);
if (route.get('acceso') === 'registro') el('alternar').click();
accessTitle();
account.catch(error => notice(error.message)).finally(() => {
  if (document.body.dataset.view === 'loading') view('access', heading.textContent);
});
