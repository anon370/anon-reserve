import {ratingForm} from './valoraciones.js';
import {api,el,notice,options,listen,identity,localDay,bookingList,loadNotices} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';
const route = new URLSearchParams(location.search);
let catalog=[],slotRequest=0,retryKey=null;
const bookingMode=route.get('paso')==='horario' && route.has('negocio');
if(route.has('negocio')&&!bookingMode) location.replace('./ficha.html?'+route);
const selected=()=>catalog.find(b=>b.id===el('negocio').value);
async function appointments(){
  const {bookings} = await api('bookings/?scope=client');
  bookingList(el('citas'),bookings,false,async()=>{await appointments(); await slots();});
  const reviews = el('valoraciones');
  reviews.replaceChildren();
  const businesses = new Set();
  for (const booking of bookings) {
    if (!booking.can_rate || businesses.has(booking.business_id)) continue;
    businesses.add(booking.business_id);
    const title = document.createElement('h3');
    title.textContent = 'Valorar mi visita a '+booking.business;
    reviews.append(title,ratingForm(booking.my_rating,stars=>api('bookings/'+booking.id+'/rating/','POST',{stars})));
  }
  await loadNotices('scope=client');
}
async function slots(){
  const request=++slotRequest,b=selected();
  options(el('hora'),[]);
  if(!b||!el('servicio').value||!el('recurso').value||!el('fecha').value)return;
  const q=new URLSearchParams({service:el('servicio').value,resource:el('recurso').value,date:el('fecha').value});
  const r=await api('catalog/'+b.id+'/slots/?'+q);
  if(request!==slotRequest)return;options(el('hora'),r.slots,'start','label');
  el('zona').textContent=(r.slots.length?'Horario del negocio · ':'Sin horarios disponibles para esta fecha · ')+r.timezone;
}
async function select(initialService){
  const b=selected();options(el('servicio'),b?.services||[]);options(el('recurso'),b?.resources||[]);
  if(!b){notice('Todavía no hay negocios publicados.');return;}
  if (initialService && b.services.some(item=>item.id===initialService))
    el('servicio').value=initialService;
  const today=localDay(b.timezone);el('fecha').min=today;el('fecha').max=localDay(b.timezone,365);
  if(!el('fecha').value||el('fecha').value<today)el('fecha').value=today;
  await slots();
}
listen(el('negocio'),'change',select);for(const id of ['servicio','recurso','fecha'])listen(el(id),'change',slots);
listen(el('reservar'),'submit',async()=>{
  const d={business_id:el('negocio').value,resource_id:el('recurso').value,service_id:el('servicio').value,start:el('hora').value};
  const sig=JSON.stringify(d);if(retryKey?.sig!==sig)retryKey={sig,id:crypto.randomUUID()};
  await api('bookings/','POST',{...d,request_id:retryKey.id});retryKey=null;
  await appointments();await slots();notice('Tu reserva está registrada.');
});
listen(el('actualizar'),'click',appointments);
const account = identity(async(session)=>{
  if (route.get('volver')==='catalogo' && !route.has('negocio')) {
    location.replace('./?vista=catalogo');
    return;
  }
  el('page-title').textContent=bookingMode?'Reservar una cita':'Mi perfil';
  document.querySelector('.booking-header .home-link').hidden=true;
  el('customer-profile').hidden=bookingMode;
  el('booking-section').hidden=!bookingMode;
  if(!bookingMode){
    el('profile-name').textContent=session.user.name;
    el('profile-email').textContent=session.user.email;
    el('profile-phone').textContent=session.user.phone||'';
    const actions=el('manage-profiles');actions.replaceChildren();
    function link(text,href){const p=document.createElement('p'),a=document.createElement('a');a.textContent=text;a.href=href;p.append(a);actions.append(p);}
    link('Mis solicitudes de servicios','./independientes.html?vista=solicitudes');
    const owned=(session.workspaces||[]).filter(w=>w.role==='owner');
    if(session.independent||owned.length){
      const suffix=session.independent?'':encodeURIComponent(owned[0].id)+'/';
      fetch('https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/storefront/settings/'+suffix,{method:'GET',credentials:'include',cache:'no-store'}).then(r=>{
        if(!r.ok)return;
        if(session.independent)link('Editar mi ficha de independiente','./editar-ficha.html');
        for(const item of owned)link('Editar ficha · '+item.name,'./editar-ficha.html?negocio='+encodeURIComponent(item.id));
      }).catch(()=>{});
    }
    await appointments();
    return;
  }
  const requested=route.get('negocio');
  const business=await api('catalog/'+encodeURIComponent(requested)+'/');
  if(business.country!=='DO'){el('booking-section').hidden=true;throw Error('Este negocio no está en el catálogo dominicano.');}
  catalog=[business];options(el('negocio'),catalog);
  await select(route.get('servicio'));await appointments();
});
const session = el('sesion');
const exit = el('salir');
const menu = document.createElement('details');
menu.className='profile-exit';
const summary=document.createElement('summary');
summary.textContent='Mi perfil';
menu.append(summary,exit);
const home=document.createElement('a');
home.href='./?vista=catalogo';
home.className='home-link';
home.textContent='← Volver al inicio';
session.prepend(home);
session.append(menu);
session.classList.add('account-line');
function showAccessTitle() {
  const registering=!el('etiqueta-nombre').hidden;
  el('page-title').textContent=bookingMode?'Reservar una cita':'Mi perfil';
  el('acceso').querySelector('h2').textContent=registering?'Crear cuenta':'Login';
}
el('alternar').addEventListener('click',showAccessTitle);
if (route.get('acceso')==='registro') el('alternar').click();
showAccessTitle();
account.catch(error=>notice(error.message));
