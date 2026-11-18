import {api,el,notice,options,listen,identity,localDay,bookingList,loadNotices} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';
let catalog=[],slotRequest=0,retryKey=null;
const selected=()=>catalog.find(b=>b.id===el('negocio').value);
async function appointments(){const r=await api('bookings/?scope=client');bookingList(el('citas'),r.bookings,false,async()=>{await appointments();await slots();});await loadNotices('scope=client');}
async function slots(){
  const request=++slotRequest,b=selected();
  options(el('hora'),[]);
  if(!b||!el('servicio').value||!el('recurso').value||!el('fecha').value)return;
  const q=new URLSearchParams({service:el('servicio').value,resource:el('recurso').value,date:el('fecha').value});
  const r=await api('catalog/'+b.id+'/slots/?'+q);
  if(request!==slotRequest)return;options(el('hora'),r.slots,'start','label');
  el('zona').textContent=(r.slots.length?'Horario del negocio · ':'Sin horarios disponibles para esta fecha · ')+r.timezone;
}
async function select(){
  const b=selected();options(el('servicio'),b?.services||[]);options(el('recurso'),b?.resources||[]);
  if(!b){notice('Todavía no hay negocios publicados.');return;}
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
identity(async()=>{
  const r=await api('catalog/');catalog=r.businesses;options(el('negocio'),catalog);
  const requested=new URLSearchParams(location.search).get('negocio');
  if(catalog.some(b=>b.id===requested))el('negocio').value=requested;
  await select();await appointments();
}).catch(e=>notice(e.message));
