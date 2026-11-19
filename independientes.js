import {api, el, identity, listen, node, notice} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';

const filters = el('filtros'), form = el('solicitud'), list = el('directorio');
list.className = 'offerlist';
let signedIn = false, selected, requestKey, next, generation = 0, typingTimer;

function categoryChips(categories) {
  const choices = [['','Todas'], ...Object.entries(categories)];
  const rail = el('chips');
  if (!rail.children.length) {
    for (const [value, label] of choices) {
      const chip = node('button',label);
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
    notice('Entra o crea tu cuenta para enviar la solicitud.');
  }
}
function card(offer, categories) {
  const row = node('article'), info = node('p',categories[offer.category]+' · '+offer.city);
  const description = node('p',offer.description), phone = node('a','Llamar al '+offer.phone);
  const request = node('button','Solicitar servicio');
  const price = offer.price === null ? 'Precio a convenir' :
    (offer.country === 'DO' ? 'RD$' : 'US$')+new Intl.NumberFormat('es-DO').format(Number(offer.price))+' / '+offer.unit;
  info.className = 'status'; description.className = 'description';
  phone.href = 'tel:'+offer.phone.replace(/[^+0-9]/g,'');
  request.onclick = () => begin(offer);
  row.append(node('h3',offer.title),node('strong',offer.public_name),info,description,node('p',price),phone,request);
  return row;
}

async function search(append=false) {
  const current = ++generation, q = new URLSearchParams(new FormData(filters));
  if (append && next != null) q.set('offset',next);
  el('mas').hidden = true;
  if (!append) list.replaceChildren();
  try {
    const result = await api('independents/?'+q);
    if (current !== generation) return;
    if (!append) {
      filters.elements.city.replaceChildren(new Option('Todas las ciudades',''),...result.cities.map(c=>new Option(c,c)));
      filters.elements.city.value = result.cities.includes(q.get('city')) ? q.get('city') : '';
      filters.elements.category.replaceChildren(new Option('Todas las categorías',''),...Object.entries(result.categories).map(([v,n])=>new Option(n,v)));
      filters.elements.category.value = q.get('category') || '';
    }
    categoryChips(result.categories);
    list.append(...result.offers.map(o => card(o,result.categories)));
    if (!list.children.length) list.append(node('p','No se encontraron servicios con estos filtros.'));
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
    row.append(node('strong',r.title),node('p',r.handled?'Atendida':'Pendiente'));
    return row;
  }));
  if (!requests.length) el('enviadas').append(node('p','Aún no has enviado solicitudes.'));
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
filters.elements.city.onchange = filters.elements.category.onchange = () => search();
el('mas').onclick = () => search(true);
el('cancelar').onclick = () => {selected=null;el('solicitar').hidden=true;};
el('perfil').onclick = () => {
  el('acceso-cliente').hidden = false;
  el('acceso-cliente').scrollIntoView();
  if(signedIn) outbox().catch(e=>notice(e.message));
};
listen(form,'submit',async () => {
  const offer = selected;
  await api('independents/requests/','POST',{
    ...Object.fromEntries(new FormData(form)),offer:offer.id,request_key:requestKey
  });
  selected=null;
  el('solicitar').hidden=true;
  el('acceso-cliente').hidden=false;
  notice('Solicitud enviada a '+offer.public_name+'.');
  await outbox();
});
search();
identity(async () => {
  signedIn=true;
  el('perfil').textContent='Perfil';
  await outbox();
  if (selected) begin(selected);
}).catch(error=>notice(error.message));
