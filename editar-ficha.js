import {api,identity,notice} from 'https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js';
import {positionEditor} from './ubicacion.js';
const form=document.querySelector('#editor'),business=new URLSearchParams(location.search).get('negocio');
const path='storefront/settings/'+(business?encodeURIComponent(business)+'/':'');
const make=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
function action(text,fn){const b=make('button',text);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){notice(e.message);}finally{b.disabled=false;}};return b;}
function field(parent,label,value='',type='text',max){const l=make('label',label),i=make('input');i.type=type;i.value=value??'';if(max)i.maxLength=max;l.append(i);parent.append(l);return i;}
function group(title){const g=make('fieldset');g.append(make('legend',title));form.append(g);return g;}
async function compress(file){
 if(!file.type.startsWith('image/'))throw Error('Selecciona una fotografía.');
 const url=URL.createObjectURL(file);
 try{const im=new Image();im.src=url;await im.decode();const scale=Math.min(1,720/Math.max(im.width,im.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(im.width*scale));canvas.height=Math.max(1,Math.round(im.height*scale));canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);for(const quality of [.78,.62,.48,.34]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=155000)return result;}throw Error('Prueba con una foto más pequeña.');}
 finally{URL.revokeObjectURL(url);}
}
let working=0;
function uploader(parent,label,initial=''){const wrap=make('div'),image=make('img'),l=make('label',label),input=make('input');let value=initial;image.alt='Vista previa';image.className='thumb';input.type='file';input.accept='image/*';
 function display(){image.hidden=!value;if(value)image.src=value;else image.removeAttribute('src');}
 input.onchange=async()=>{if(!input.files[0])return;working++;try{value=await compress(input.files[0]);display();}catch(e){notice('No se pudo preparar la foto. Usa una imagen JPEG o PNG más pequeña.');}finally{working--;input.value='';}};
 const clear=action('Quitar foto',()=>{value='';display();});l.append(input);wrap.append(l,image,clear);parent.append(wrap);display();return ()=>value;
}
function promotions(parent,rows,kind,country='DO'){const offer=kind==="offers",menu=kind==="menu";const readers=new Map();function add(row={}){const line=make('article');const name=field(line,'Nombre',row.name,'text',100),desc=field(line,'Detalle',row.description,'text',400);name.required=true;
 const category=menu?field(line,'Categoría del producto',row.category||'General','text',60):null;
 const picture=menu?uploader(line,'Foto del producto',row.photo):null;
 const price=field(line,country==='US'?'Precio en US$':'Precio en RD$',row.price,'number');if(price){price.min=0;price.step='.01';}
 const start=offer?field(line,'Desde',row.start,'date'):null,end=offer?field(line,'Hasta',row.end,'date'):null;
 line.append(action('Quitar',()=>{readers.delete(line);line.remove();}));parent.append(line);readers.set(line,()=>({name:name.value.trim(),description:desc.value.trim(),...(price.value?{price:price.value}:{}),...(offer?{start:start.value,end:end.value}:{}),...(menu?{price:price.value,category:category.value.trim(),photo:picture()}:{})}));}
 for(const row of rows||[])add(row);parent.append(action(offer?'Añadir oferta':menu?'Añadir producto, plato o bebida':'Añadir membresía',()=>add()));return ()=>Array.from(readers.values(),f=>f());
}
function pointBox(loc){
 const box=group('Ubicación pública'),city=field(box,'Ciudad o municipio',loc.city,'text',100),address=field(box,'Calle, número y sector',loc.address,'text',240);
 city.required=address.required=true;
 const lat=field(box,'Latitud',loc.latitude,'number'),lon=field(box,'Longitud',loc.longitude,'number');lat.step=lon.step='any';lat.min=-90;lat.max=90;lon.min=-180;lon.max=180;
 const read=()=>lat.value&&lon.value?{lat:Number(lat.value),lon:Number(lon.value)}:null;
 const set=p=>{lat.value=p.lat.toFixed(6);lon.value=p.lon.toFixed(6);};
 const maps=make('details'),summary=make('summary','Marcar o corregir el punto en el mapa');maps.append(summary);box.append(maps);let refresh;
 maps.ontoggle=()=>{if(maps.open&&!refresh)refresh=positionEditor(maps,[lat,lon],read,set);};
 const results=make('div');box.append(action('Buscar dirección',async()=>{results.replaceChildren();try{const data=await api('locations/search/','POST',{country:'DO',city:city.value,address:address.value});for(const place of data.matches){results.append(action(place.formatted,()=>{address.value=place.street;city.value=place.city||city.value;const p={lat:place.lat,lon:place.lon};set(p);refresh?.(p);maps.open=true;results.replaceChildren();}));}if(!data.matches.length)results.textContent='Sin coincidencias. Marca el local en el mapa.';}catch{results.textContent='Puedes marcar el local en el mapa o usar su ubicación.';}}),
 action('Usar ubicación del local',()=>{if(!navigator.geolocation)throw Error('Ubicación no disponible. Puedes marcar el punto en el mapa.');navigator.geolocation.getCurrentPosition(({coords})=>{const p={lat:coords.latitude,lon:coords.longitude};set(p);refresh?.(p);maps.open=true;},()=>notice('No se pudo obtener la ubicación. Marca el punto en el mapa.'),{timeout:12000});}),results);
 return ()=>{if(Boolean(lat.value)!==Boolean(lon.value))throw Error('Completa ambas coordenadas o deja las dos vacías.');const out={revision:loc.revision,city:city.value.trim(),address:address.value.trim(),latitude:lat.value?Number(lat.value):null,longitude:lon.value?Number(lon.value):null};return Object.keys(out).some(k=>k!=='revision'&&out[k]!==loc[k])?out:null;};
}
function professionalServices(parent,inventory,session,profileFields){
 const picker=make('select'),legend=make('label','Servicio para administrar');legend.append(picker);parent.append(legend);
 picker.append(new Option('Nuevo servicio',''),...inventory.offers.filter(o=>o.country==='DO').map(o=>new Option(o.title,o.id)));
 const panel=make('details');panel.append(make('summary','Añadir o editar un servicio'));parent.append(panel);
 const name=field(panel,'Nombre del servicio','','text',100),description=field(panel,'Descripción','','text',1800),price=field(panel,'Precio opcional en RD$','','number');price.step='.01';price.min=0;
 const option=(label,rows)=>{const l=make('label',label),f=make('select');for(const [k,v] of rows)f.append(new Option(v,k));l.append(f);panel.append(l);return f;};
 const category=option('Categoría',Object.entries(inventory.categories)),unit=option('Tarifa por',[['servicio','Servicio'],['hora','Hora'],['visita','Visita'],['clase','Clase']]);
 const published=field(panel,'Publicado en Reserva','','checkbox');let editing=null,draft=crypto.randomUUID();
 picker.onchange=()=>{editing=inventory.offers.find(o=>o.id===picker.value);draft=editing?.id||crypto.randomUUID();name.value=editing?.title||'';description.value=editing?.description||'';price.value=editing?.price??'';category.value=editing?.category||'otro';unit.value=editing?.unit||'servicio';published.checked=editing?.published??false;panel.open=true;};
 panel.append(action('Guardar servicio',async()=>{
   const body={id:draft,title:name.value.trim(),description:description.value.trim(),category:category.value,price:price.value,unit:unit.value,country:'DO',published:published.checked};
   for(const [k,key] of [['public_name','name'],['city','city'],['phone','phone']])body[k]=profileFields[key].value.trim()||editing?.[k]||inventory.offers[0]?.[k]||'';
   if(!body.title||!body.description||!body.public_name||!body.city||!body.phone)throw Error('Completa el nombre, ciudad y teléfono del profesional, además del nombre y la descripción del servicio.');
   if(editing)body.revision=editing.revision;
   const saved=await api('independents/offers/'+(editing?editing.id+'/':''),editing?'PATCH':'POST',body);
   const i=inventory.offers.findIndex(o=>o.id===saved.id);if(i<0){inventory.offers.push(saved);picker.append(new Option(saved.title,saved.id));}else{inventory.offers[i]=saved;picker.selectedOptions[0].textContent=saved.title;}
   picker.value=saved.id;editing=saved;
   if(!parent.querySelector('[data-photo-id="'+saved.id+'"]'))parent.dispatchEvent(new CustomEvent('service-added',{detail:saved}));
   notice('Servicio guardado. Puedes añadir su foto y guardar la ficha.');
 }));
}
async function openEditor(session){
 if(business?!session.workspaces?.some(w=>w.id===business&&w.role==='owner'):!session.independent){throw Error('Esta cuenta no tiene acceso a esa ficha.');}
 const r=await api(path),s=r.settings||{};form.replaceChildren();
 const info=group(business?'Foto del negocio':'Datos públicos del profesional'),previewName=make('h2',r.display_name || s.name || (business ? session.workspaces.find(w=>w.id===business)?.name : session.user.name));
 info.append(previewName);
 const portrait=uploader(info,'Foto de portada (opcional)',s.portrait);
 info.querySelector('img').className='preview-cover';
 const fields={};if(!business)for(const [key,label,max] of [['name','Nombre público',100],['title','Profesión u oficio',100],['city','Ciudad',100],['mode','Modalidad de atención',100],['address','Dirección pública o zona de cobertura',240],['phone','Teléfono público',25]])fields[key]=field(info,label,s[key]||(key==='name'?session.user.name:''),'text',max);
 if(fields.name)fields.name.addEventListener('input',()=>{previewName.textContent=fields.name.value;});
 const point=business&&r.location?.country==='DO'?pointBox(r.location):null;
 const portraits = new Map();
 if (business && r.resources?.length) {
   const team = group('Mi equipo');team.id='equipo';
   for (const person of r.resources) {
     const row = make('details');
     row.append(make('summary', person.name));
     team.append(row);
     const mail = field(row,'Correo de la cuenta del profesional','','email',254);
     mail.required = false;
     const result = make('div');
     row.append(action('Crear enlace de invitación', async () => {
       if (!mail.value || !mail.reportValidity()) { mail.focus(); return; }
       const invite = await api('staff/'+business+'/'+person.id+'/invite/','POST',{email:mail.value});
       const url = new URL('https://whale-app-ebihq.ondigitalocean.app/equipo.html');
       url.hash = new URLSearchParams(invite);
       result.replaceChildren();
       const address = field(result,'Enlace personal',url.href);
       address.readOnly = true;
       result.append(action('Copiar enlace',async()=>{await navigator.clipboard.writeText(url.href);}));
     }),action('Desvincular o cancelar invitación',async()=>{
       if(!confirm('¿Desvincular a '+person.name+' de este negocio o cancelar su invitación?'))return;
       await api('staff/'+business+'/'+person.id+'/leave/','POST',{});
       await openEditor(session);
     }),result);
     portraits.set(person.id, uploader(row, 'Foto de '+person.name, s.staff_photos?.[person.id]));
   }
 }
 const services=group('Mis servicios');if(!r.services.length)services.append(make('p','Añade un servicio para poder asociarle una foto.'));
 if(business){const manage=make('a','Administrar servicios en Business');manage.href='https://whale-app-ebihq.ondigitalocean.app/acceso.html';services.append(manage);}
 else{const inventory=await api('independents/offers/');professionalServices(services,inventory,session,fields);}
 const items={};function servicePhoto(item){const row=make('details'),legend=make('summary','Foto · '+item.name);row.dataset.photoId=item.id;row.append(legend);services.append(row);const old=s.items?.[item.id]||{};const getPhoto=uploader(row,'Foto de '+item.name,old.photo),m=business?null:field(row,'Duración en minutos (opcional)',old.minutes,'number');if(m){m.min=1;m.max=1440;}items[item.id]=()=>({photo:getPhoto(),minutes:m?.value?Number(m.value):null});}
 for(const item of r.services)servicePhoto(item);services.addEventListener('service-added',e=>servicePhoto({id:e.detail.id,name:e.detail.title}));
 let menuPhoto,menu;{const section=group('Catálogo de comida y productos');menuPhoto=uploader(section,'Foto de la carta',s.menu_photo);menu=promotions(section,s.menu,'menu',r.location?.country);}
 const offers=promotions(group('Ofertas de la ficha'),s.offers,'offers',r.location?.country),plans=promotions(group('Membresías de la ficha'),s.plans,'plans',r.location?.country);
 const submit=make('button','Guardar ficha');submit.type='submit';submit.className='primary';form.append(submit);
 form.onsubmit=async e=>{e.preventDefault();if(submit.disabled)return;if(working){notice('Espera un momento mientras se prepara la foto.');return;}submit.disabled=true;
 try{const data={revision:r.revision,portrait:portrait(),menu_photo:menuPhoto?.()||'',offers:offers(),plans:plans(),menu:menu?.()||[],items:{}};
 if (portraits.size) data.staff_photos = Object.fromEntries([...portraits].map(([id, read]) => [id, read()]));
 for(const [k,f] of Object.entries(fields))data[k]=f.value.trim();
 for(const [id,get] of Object.entries(items)){const item=get();if(item.photo||item.minutes)data.items[id]=item;}
 const loc=point?.();if(loc)data.location=loc;
 if(new Blob([JSON.stringify(data)]).size>1450000)throw Error('Las fotos superan el espacio de esta ficha. Usa imágenes más pequeñas.');
 await api(path,'PUT',data);notice('Ficha guardada.');await openEditor(session);
 }catch(error){notice(error.message);}finally{submit.disabled=false;}};
}
identity(openEditor).catch(error=>notice(error.message==='not_found'||error.message.includes('backend central')?'La edición de fichas aún no está disponible en este servidor.':error.message));
