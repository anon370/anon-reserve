import {ratingForm} from './valoraciones.js';
import {api, el, identity, listen, node, notice} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';

const filters = el('filtros'), form = el('solicitud'), list = el('directorio');
list.className = 'offerlist';
let displayedProfessionals = new Set();
let signedIn = false, selected, requestKey, next, generation = 0, typingTimer;


const languageKey = 'anon.web.clientes.idioma';
let english = false;
try { english = localStorage.getItem(languageKey) === 'en'; } catch {}
const translations = {
  "Plomería": "Plumbing",
  "Electricidad": "Electrical work",
  "Clases particulares": "Tutoring",
  "Entrenamiento personal": "Personal training",
  "Aire acondicionado": "Air conditioning",
  "Limpieza": "Cleaning",
  "Pintura": "Painting",
  "Albañilería": "Masonry",
  "Carpintería": "Carpentry",
  "Jardinería": "Gardening",
  "Mecánica": "Auto repair",
  "Reparación de equipos": "Equipment repair",
  "Desarrollo web": "Web development",
  "Diseño gráfico": "Graphic design",
  "Fotografía y video": "Photography and video",
  "Eventos y decoración": "Events and décor",
  "Belleza a domicilio": "At-home beauty",
  "Costura": "Sewing",
  "Cocina y repostería": "Cooking and baking",
  "Cuidado de mascotas": "Pet care",
  "Traducción": "Translation",
  "Mudanzas": "Moving",
  "Contabilidad": "Accounting",
  "Servicios financieros": "Financial services",
  "Otro servicio": "Other service",
  "Todas": "All",
  "Todas las ciudades": "All cities",
  "Todas las categorías": "All categories",
  "hora": "hour",
  "visita": "visit",
  "clase": "class",
  "servicio": "service",
  "Ver servicios": "View services",
  "Precio a convenir": "Price on request",
  "Sin valoraciones": "No reviews",
  "Recomendado": "Recommended",
  "Atendida": "Handled",
  "Pendiente": "Pending",
  "Aún no has enviado solicitudes.": "You haven’t sent any requests yet.",
  "No se encontraron servicios con estos filtros.": "No services match these filters.",
  "Todavía no hay servicios con esa valoración para estos filtros.": "No services match this rating and these filters.",
  "Entra o crea tu cuenta para enviar la solicitud.": "Sign in or create an account to send your request.",
  "El servicio ya no está publicado.": "This service is no longer listed."
};
const translate = label => english ? translations[label] || label : label;
function applyLanguage() {
  document.documentElement.lang = english ? 'en' : 'es';
  document.title = (english ? 'Independent services' : 'Servicios independientes') + ' · ANON Reserva';
  for (const item of document.querySelectorAll('[data-en]')) {
    item.dataset.es ??= item.textContent;
    item.textContent = english ? item.dataset.en : item.dataset.es;
  }
  el('language').textContent = english ? 'ES' : 'EN';
  el('language').setAttribute('aria-label',english ? 'Español' : 'English');
  filters.elements.q.placeholder = english ? 'Service name or description' : 'Nombre o descripción del servicio';
  el('chips').setAttribute('aria-label',english ? 'Categories' : 'Categorías');
  document.querySelector('.reserva-dock').setAttribute('aria-label',english ? 'Main navigation' : 'Navegación principal');
  document.querySelector('.reserva-brand').setAttribute('aria-label',english ? 'ANON Reserva, home' : 'ANON Reserva, inicio');
  for (const select of filters.querySelectorAll('.picker select'))
    select.nextElementSibling.textContent = select.selectedOptions[0]?.textContent || '';
}
function showSection() {
  const searching = location.hash === '#buscar';
  el('buscar').hidden = !searching;
  el(searching ? 'dock-search' : 'dock-home').setAttribute('aria-current','page');
  el(searching ? 'dock-home' : 'dock-search').removeAttribute('aria-current');
  if (searching) filters.elements.q.focus();
  else if (location.hash === '#inicio') {
    if (filters.elements.q.value) { filters.elements.q.value = ''; search(); }
    window.scrollTo(0,0);
  }
}
window.addEventListener('hashchange',showSection);
el('dock-search').addEventListener('click',() => { if (location.hash === '#buscar') showSection(); });
applyLanguage();
showSection();

function categoryChips(categories) {
  const choices = [['','Todas'], ...Object.entries(categories)];
  const rail = el('chips');
  if (!rail.children.length) {
    for (const [value, label] of choices) {
      const chip = node('button',translate(label));
      chip.type = 'button';
      chip.dataset.category = value;
      chip.onclick = () => {filters.elements.category.value = value; search();};
      rail.append(chip);
    }
  }
  for (const chip of rail.children) {
    chip.setAttribute('aria-pressed', String(chip.dataset.category === filters.elements.category.value));
  }
}

function begin(offer) {
  if (selected?.id !== offer.id) {form.reset(); requestKey = crypto.randomUUID();}
  selected = offer;
  el('servicio-elegido').textContent = offer.title+' · '+offer.public_name;
  el('solicitar').hidden = !signedIn;
  if (signedIn) {
    form.elements.callback.focus();
  } else {
    el('acceso-cliente').hidden = false;
    el('cuenta').querySelector('[name=email]')?.focus();
    notice(translate('Entra o crea tu cuenta para enviar la solicitud.'));
  }
}
function card(offer, categories) {
  const row = node('article'), info = node('p',translate(categories[offer.category])+' · '+offer.city);
  const description = node('p',offer.description), phone = node('a',(english?'Call ':'Llamar al ')+offer.phone);
  const request = node('a',translate('Ver servicios'));
  request.className='profile-link';
  request.href='./ficha.html?'+new URLSearchParams({profesional:offer.professional_id||offer.id,servicio:offer.id});
  const price = offer.price === null ? translate('Precio a convenir') :
    (offer.country === 'DO' ? 'RD$' : 'US$')+new Intl.NumberFormat(english?'en-US':'es-DO').format(Number(offer.price))+' / '+translate(offer.unit);
  info.className = 'status'; description.className = 'description';
  phone.href = 'tel:'+offer.phone.replace(/[^+0-9]/g,'');

  row.append(node('h3',offer.public_name),node('strong',offer.title),info,description,node('p',price));
  if (offer.rating_count) row.append(node('p','★ '+Number(offer.rating_average).toFixed(1)+' · '+offer.rating_count+(english?' reviews':' valoraciones')));
  else if (offer.rating_count===0) row.append(node('p',translate('Sin valoraciones')));
  if (offer.recommended) row.append(node('strong',translate('Recomendado')));
  if (offer.phone) row.append(phone);
  row.append(request);
  return row;
}

async function search(append=false) {
  const current = ++generation, q = new URLSearchParams(new FormData(filters));
  if (append && next != null) q.set('offset',next);
  el('mas').hidden = true;
  if (!append) list.replaceChildren();
  try {
    let result = await api('independents/?'+q);
    if (current !== generation) return;
    // Early API releases omit ranking fields. Apply price and unit filters to the full matching set.
    if (!result.ratings_available && (['low','high'].includes(q.get('sort')) || q.get('unit') || Number(q.get('stars')))) {
      const rows=[...result.offers];
      let cursor=result.next;
      while (cursor!=null && Number(q.get('stars')||0)===0) {
        const more=new URLSearchParams(q); more.set('offset',cursor);
        const page=await api('independents/?'+more);
        if (current!==generation) return;
        rows.push(...page.offers); cursor=page.next;
      }
      const matches=rows.filter(row=>(!q.get('unit') || row.unit===q.get('unit')) &&
        Number(row.rating_average||0)>=Number(q.get('stars')||0));
      if (['low','high'].includes(q.get('sort'))) matches.sort((a,b)=>{
        if (a.price==null || b.price==null) return Number(a.price==null)-Number(b.price==null);
        return (Number(a.price)-Number(b.price))*(q.get('sort')==='low'?1:-1);
      });
      result={...result,offers:matches,next:null};
    }
    if (!append) {
      const cities=[...new Set([...(q.get('country')==='DO'?['Santiago de los Caballeros','Santo Domingo','La Vega','Moca','Puerto Plata','La Romana','Bonao','Higüey']:[]),...result.cities].map(c=>c.trim().toLowerCase()==='santiago'?'Santiago de los Caballeros':c))].sort((a,b)=>a.localeCompare(b,'es'));
      filters.elements.city.replaceChildren(new Option(translate('Todas las ciudades'),''),...cities.map(c=>new Option(c,c)));
      filters.elements.city.value = cities.includes(q.get('city')) ? q.get('city') : '';
      for (const select of filters.querySelectorAll('.picker select'))
        select.nextElementSibling.textContent=select.selectedOptions[0]?.textContent||'';
      filters.elements.category.replaceChildren(new Option(translate('Todas las categorías'),''),...Object.entries(result.categories).map(([v,n])=>new Option(translate(n),v)));
      filters.elements.category.value = q.get('category') || '';
    }
    categoryChips(result.categories);
    if(!append) displayedProfessionals = new Set();
    for(const offer of result.offers){
      const key=offer.professional_id||offer.id;
      if(!displayedProfessionals.has(key)){list.append(card(offer,result.categories));displayedProfessionals.add(key);}
    }
    if (!list.children.length) list.append(node('p',Number(q.get('stars'))>0?translate('Todavía no hay servicios con esa valoración para estos filtros.'):translate('No se encontraron servicios con estos filtros.')));
    next = result.next;
    el('mas').hidden = next == null;
  } catch (error) {
    if (generation === current) {el('mas').hidden = !append; notice(error.message);}
  }
}
async function outbox() {
  const {requests} = await api('independents/requests/');
  el('enviadas').replaceChildren(...requests.map(r => {
    const row = node('article');
    row.append(node('strong',r.title),node('p',r.handled?translate('Atendida'):translate('Pendiente')));
    if (r.can_rate) row.append(ratingForm(r.my_rating,async stars=>{
      await api('independents/requests/'+r.id+'/rating/','POST',{stars}); await search();
    }));
    return row;
  }));
  if (!requests.length) el('enviadas').append(node('p',translate('Aún no has enviado solicitudes.')));
}
listen(filters,'submit',()=>{clearTimeout(typingTimer);return search();});
filters.elements.q.oninput = () => {clearTimeout(typingTimer);typingTimer = setTimeout(()=>search(),250);};
el('todas').onclick = () => {
  const picker = el('todas-categorias');
  picker.hidden = !picker.hidden;
  el('todas').setAttribute('aria-expanded',String(!picker.hidden));
  if (!picker.hidden) filters.elements.category.focus();
};
filters.elements.country.onchange = () => {filters.elements.city.value = ''; search();};
for (const field of ['city','category','sort','stars','unit'])
  filters.elements[field].onchange = () => search();
el('mas').onclick = () => search(true);
el('cancelar').onclick = () => {selected=null;el('solicitar').hidden=true;};
el('language').onclick = () => {
  english = !english;
  try { localStorage.setItem(languageKey, english ? 'en' : 'es'); } catch {}
  applyLanguage();
  el('chips').replaceChildren();
  search();
  if (signedIn) outbox().catch(error => notice(error.message));
};
listen(form,'submit',async () => {
  const offer = selected;
  await api('independents/requests/','POST',{
    ...Object.fromEntries(new FormData(form)),offer:offer.id,request_key:requestKey
  });
  selected=null;
  el('solicitar').hidden=true;
  el('acceso-cliente').hidden=false;
  notice((english?'Request sent to ':'Solicitud enviada a ')+offer.public_name+'.');
  await outbox();
});
search();
identity(async () => {
  signedIn=true;
  await outbox();
  if(new URLSearchParams(location.search).get('vista')==='solicitudes'){el('acceso-cliente').hidden=false;el('acceso-cliente').scrollIntoView();}
  if (selected) begin(selected);
}).catch(error=>notice(error.message));

el('acceso').querySelector('h2').textContent='ANON Reserva';

const entry = new URLSearchParams(location.search);
if(entry.has('solicitar')){
  (async()=>{
    const id=entry.get('solicitar'), anchor=entry.get('profesional')||id;
    let offer;
    try{const detail=await api('independents/'+encodeURIComponent(anchor)+'/profile/');offer=detail.services.find(row=>row.id===id);}
    catch(error){
      let offset=0;
      while(offset!=null){const page=await api('independents/?country=DO&offset='+offset);offer=page.offers.find(row=>row.id===id);if(offer)break;offset=page.next;}
    }
    if(!offer)throw Error(translate('El servicio ya no está publicado.'));
    begin(offer);
    (signedIn?el('solicitar'):el('acceso-cliente')).scrollIntoView();
  })().catch(error=>notice(error.message));
}
