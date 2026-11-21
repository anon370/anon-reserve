import {categoryPhoto, money} from "./servicio-visual.js";
const base='https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/';
const q=new URLSearchParams(location.search), pro=q.get('profesional'), id=pro||q.get('negocio');
const root=document.querySelector('#profile'), foot=document.querySelector('#action');
const list=x=>Array.isArray(x)?x:[];
const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function node(tag,text,cl){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cl)n.className=cl;return n;}
function button(text,action,cl){const n=node('button',text,cl);n.type='button';n.onclick=action;return n;}
function img(src){if(typeof src!=='string'||!(/^(https:\/\/|data:image\/jpeg;base64,)/i).test(src))return null;const n=node('img');n.alt='';n.loading='lazy';n.referrerPolicy='no-referrer';n.src=src;n.onerror=()=>n.remove();return n;}
async function read(path){const r=await fetch(base+path,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Object.assign(Error('No se pudo abrir esta ficha.'),{status:r.status});return r.json();}
function modal(title,content){document.querySelector('#dialog-title').textContent=title;document.querySelector('#detail-body').replaceChildren(...content);document.querySelector('#details').showModal();}
document.querySelector('#dismiss').onclick=()=>document.querySelector('#details').close();
function itemList(rows){return rows.map(row=>{const a=node('article');a.append(node('strong',row.name||row.title));for(const t of [row.price!=null?money(row.price):'',row.description,row.validity,row.end?'Hasta '+row.end:'',row.uses?row.uses+' visitas':''])if(t)a.append(node('p',t));return a;});}
async function load(){
 if(!id)throw Error('Elige una ficha desde el directorio.');
 if(!pro){
   const b=await read('catalog/'+encodeURIComponent(id)+'/');
   if(b.country!=='DO')throw Error('Esta ficha está fuera del catálogo dominicano.');
   if(!b.listing){const all=await read('catalog/?country=DO');Object.assign(b,all.businesses.find(x=>x.id===b.id)||{});}
   return b;
 }
 try{return await read('independents/'+encodeURIComponent(pro)+'/profile/');}catch(error){
   if(error.status!==404)throw error;
   let offset=0;
   while(offset!=null){const page=await read('independents/?country=DO&offset='+offset);const o=page.offers.find(x=>x.id===pro);if(o)return {id:o.id,name:o.public_name,city:o.city,phone:o.phone,title:page.categories[o.category],services:[o],rating_count:o.rating_count,rating_average:o.rating_average};offset=page.next;}
   throw Error('Este profesional ya no está publicado.');
 }
}
const labels={barberia:'Barbería',salon:'Salón',mixto:'Barbería y salón',cafeteria:'Cafetería',bar_restaurante:'Bar y restaurante',bar:'Bar',restaurante:'Restaurante',suplidora:'Suplidora',otro:'Negocio'};
function render(b){
 document.title=b.name+' · ANON Reserva';root.replaceChildren();if(pro)document.querySelector('#back').href='./independientes.html';
 const offers=list(pro?b.offers:b.listing?.offers),plans=list(pro?b.plans:b.listing?.plans);
 const drinks=list(b.listing?.drinks),products=list(b.products),services=list(b.services);
 const phone=pro?b.phone:b.listing?.phone;
 const title=node('div',null,'identity'),desc=node('div');const portrait=img(b.profile_photo||b.photo);if(portrait){portrait.className='store-cover';title.append(portrait);}title.classList.add('store-identity');
 desc.append(node('h1',b.name),node('p',[pro?(b.title||'Profesional independiente'):(labels[b.category]||b.category),b.city].filter(Boolean).join(' · ')));
 const stars=b.rating_count?('★ '+Number(b.rating_average).toFixed(1)+' · '+b.rating_count+' reseñas'):'Sin reseñas todavía';
 desc.append(node('p',stars,'rating'));title.append(desc);root.append(title);
 const head=node('div',null,'section-head');
 if(plans.length)head.append(button('Membresía ›',()=>modal('Membresías',itemList(plans)),'pill'));root.append(head);
 const serviceGrid=node('div',null,'grid');const servicePanel=node('section');servicePanel.append(serviceGrid);root.append(servicePanel);let selected=services.find(s=>s.id===q.get('servicio'))||services[0];
 function showAction(){
  foot.replaceChildren();foot.hidden=!selected;if(!selected)return;
  const name=selected.name||selected.title;foot.append(node('span',name+' · '+money(selected.price),'action-label'));
  const link=node('a',pro?'Solicitar servicio':'Ver horarios','cta');
  link.href=pro?'./independientes.html?'+new URLSearchParams({solicitar:selected.id,profesional:pro}):'./citas.html?'+new URLSearchParams({negocio:b.id,servicio:selected.id,paso:'horario'});
  foot.append(link);
 }
 let expanded=services.indexOf(selected)>3;
 function cards(){
  serviceGrid.replaceChildren();for(const s of expanded?services:services.slice(0,4)){
   const name=s.name||s.title;
   const tile=button('',()=>{selected=s;for(const n of serviceGrid.children)n.setAttribute('aria-pressed',String(n===tile));showAction();},'tile');
   tile.setAttribute('aria-pressed',String(s===selected));const pic=img(s.photo);tile.append(pic||categoryPhoto(name,s.category||b.category),node('span','✓','check'));
   const body=node('span',null,'tile-text');body.append(node('strong',name),node('small',[money(s.price),s.minutes?s.minutes+' min':s.unit?'por '+s.unit:''].filter(Boolean).join(' · ')));tile.append(body);serviceGrid.append(tile);
  }
 }
 cards();if(!services.length && !products.length && !drinks.length)servicePanel.append(node('p','Este perfil todavía no tiene servicios disponibles.','sub'));
 if(services.length>4){const more=button(expanded?'Mostrar menos':'Ver todos los servicios',()=>{expanded=!expanded;cards();more.textContent=expanded?'Mostrar menos':'Ver todos los servicios';},'more');servicePanel.append(more);}
 const promo=node('div',null,'grid promo-grid');
 const catalog=[...products,...drinks];
 const productPanel=node('section');
 root.append(productPanel);
 let productMode=!services.length && catalog.length>0;
 const basket=new Map();
 const tabs=node('div',null,'store-tabs');
 head.prepend(tabs);
 function switchMode(value){
   productMode=value;
   productPanel.hidden=!value;
   servicePanel.hidden=!!value;
   for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.mode===(value?'products':'services')));
   updateFooter();
 }
 function updateFooter(){
   if(!productMode){showAction();return;}
   foot.replaceChildren();foot.hidden=!basket.size;
   if(!basket.size)return;
   let units=0;
   const lines=[];
   for(const [item,quantity] of basket){
     units+=quantity;
     const line=node('article');
     line.append(node('strong',quantity+' × '+item.name),node('p',money(item.price==null?null:Number(item.price)*quantity)));
     line.append(button('Quitar',()=>{basket.delete(item);updateFooter();document.querySelector('#details').close();},'pill'));
     lines.push(line);
   }
   foot.append(node('strong',units+(units===1?' artículo':' artículos')),button('Ver mi pedido',()=>modal('Mi pedido',lines),'cta'));
 }
 function addTab(label,mode){
   const tab=button(label,()=>switchMode(mode==='products'));
   tab.dataset.mode=mode;tabs.append(tab);
 }
 if(services.length)addTab('Servicios','services');
 if(catalog.length)addTab('Productos','products');
 const filters=node('div',null,'store-filters'),grid=node('div',null,'grid');
 productPanel.append(filters,grid);
 function openProduct(item){
   const content=[],photo=img(item.photo);
   if(photo){photo.className='product-detail-photo';content.push(photo);}
   content.push(node('strong',money(item.price)));
   if(item.description)content.push(node('p',item.description));
   let quantity=1;
   const count=node('span','1'),step=node('div',null,'store-step');
   step.append(node('span','Cantidad'),button('−',()=>{quantity=Math.max(1,quantity-1);count.textContent=quantity;}),count,button('+',()=>{quantity++;count.textContent=quantity;}));
   content.push(step,button('Agregar al pedido',()=>{basket.set(item,(basket.get(item)||0)+quantity);document.querySelector('#details').close();updateFooter();},'cta'));
   modal(item.name,content);
 }
 function drawProducts(category){
   grid.replaceChildren();
   for(const control of filters.children)control.setAttribute('aria-pressed',String(control.dataset.category===category));
   for(const item of catalog){
     if(category && (item.category||'General')!==category)continue;
     const tile=button('',()=>openProduct(item),'tile'),photo=img(item.photo),body=node('span',null,'tile-text');
     if(photo)tile.append(photo);
     body.append(node('strong',item.name),node('small',money(item.price)));tile.append(body);grid.append(tile);
   }
 }
 if(catalog.length){
   const categories=new Set(catalog.map(item=>item.category||'General'));
   for(const label of ['',...categories]){
     const control=button(label||'Todos',()=>drawProducts(label),'pill');control.dataset.category=label;filters.append(control);
   }
   filters.hidden=categories.size===1 && categories.has('General');drawProducts('');
 }
 switchMode(productMode);
 if(offers.length>1){const sample=offers[1],tile=button('',()=>modal('Oferta',itemList([sample])),'tile');const v=node('span',null,'tile-text');v.append(node('strong',sample.name),node('small',sample.description||'Ver promoción'));tile.append(v);promo.append(tile);}
 if(promo.childElementCount)root.append(promo);
 if(offers.length){const coupon=button('',()=>modal('Ofertas',itemList(offers)),'coupon');const copy=node('span');copy.append(node('small','Ofertas'),node('strong',offers[0].name));coupon.append(copy,node('b','Ver ofertas →'));root.append(coupon);}
 const facts=node('div',null,'facts');const reviews=button('',()=>{const lines=[node('p',stars)];for(let i=5;i>=1;i--)if(b.review_stars?.[i])lines.push(node('p',i+' ★ · '+b.review_stars[i]));modal('Reseñas',lines);});
 reviews.append(node('strong','Reseñas'),node('small',stars));
 let distance='';const summary=node('small',b.address||b.mode||b.city);
 const info=button('',()=>{
  const entries=[b.description,b.mode,b.address,b.city].filter(Boolean).map(s=>node('p',s));
  if(phone){const a=node('a',phone);a.href='tel:'+phone.replace(/[^0-9+]/g,'');entries.push(a);}
  for(const [idx,time] of Object.entries(b.hours||{}))entries.push(node('p',days[idx]+' · '+time.join(' – ')));
  if(b.latitude!=null&&b.longitude!=null){
   const msg=node('p',distance);const locate=button('Calcular mi distancia',()=>{if(!navigator.geolocation){msg.textContent='La ubicación no está disponible en este navegador.';return;}msg.textContent='Buscando tu ubicación…';navigator.geolocation.getCurrentPosition(({coords})=>{const rad=n=>n*Math.PI/180;const h=Math.sin(rad(b.latitude-coords.latitude)/2)**2+Math.cos(rad(coords.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-coords.longitude)/2)**2;const km=12742*Math.asin(Math.min(1,Math.sqrt(h)));distance='A '+km.toLocaleString('es-DO',{maximumFractionDigits:1})+' km en línea recta';msg.textContent=distance;summary.textContent=[b.address||b.city,distance].filter(Boolean).join(' · ');},()=>{msg.textContent='Puedes consultar la dirección y reservar aunque no compartas tu ubicación.';},{timeout:12000,maximumAge:60000});},'more');entries.push(locate,msg);
  }
  modal('Información',entries);
 });info.append(node('strong','Información'),summary);if(phone)info.append(node('small',phone));facts.append(reviews,info);root.append(facts);updateFooter();
}
async function offerOwnerEditor(b){
 if(pro)return;
 try{
  const response=await fetch(base+'auth/session/',{credentials:'include',cache:'no-store'});
  if(!response.ok)return;
  const session=await response.json();
  if(session.workspaces?.some(w=>w.id===b.id && w.role==='owner')){
   const link=node('a','Editar mi catálogo','profile-link');link.href='./editar-ficha.html?negocio='+encodeURIComponent(b.id);root.append(link);
  }
 }catch{}
}
load().then(b=>{render(b);offerOwnerEditor(b);}).catch(e=>{root.replaceChildren(node('p',e.message),button('Volver a intentar',()=>location.reload(),'more'));});
