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
function modal(title,content){document.querySelector('#dialog-title').textContent=title;document.querySelector('#detail-body').replaceChildren(...content);if(!document.querySelector('#details').open)document.querySelector('#details').showModal();}
document.querySelector('#dismiss').onclick=()=>document.querySelector('#details').close();
function itemList(rows,country){const format=country==='US'?value=>'US$'+Number(value).toLocaleString('es-US',{maximumFractionDigits:2}):money;return rows.map(row=>{const a=node('article');a.append(node('strong',row.name||row.title));for(const t of [row.price!=null?format(row.price):'',row.description,row.validity,row.end?'Hasta '+row.end:'',row.uses?row.uses+' visitas':'',...(row.services||[]),...(row.extras||[]),(row.original??row.regular)!=null?'Valor regular '+format(row.original??row.regular):'',row.discount!=null?'Ahorras '+format(row.discount):row.original!=null?'Ahorras '+format(Math.max(0,row.original-row.price)):''])if(t)a.append(node('p',t));return a;});}
async function load(){
 if(!id)throw Error('Elige una ficha desde el directorio.');
 if(!pro){
   const b=await read('catalog/'+encodeURIComponent(id)+'/');
   if(!['DO','US'].includes(b.country))throw Error('Esta ficha está fuera de los países disponibles.');
   if(!b.listing){const all=await read('catalog/?country='+b.country);Object.assign(b,all.businesses.find(x=>x.id===b.id)||{});}
   return b;
 }
 try{return await read('independents/'+encodeURIComponent(pro)+'/profile/');}catch(error){
   if(error.status!==404)throw error;
   let offset=0;
   while(offset!=null){const page=await read('independents/?offset='+offset);const o=page.offers.find(x=>x.id===pro);if(o)return {id:o.id,name:o.public_name,country:o.country,city:o.city,phone:o.phone,title:page.categories[o.category],services:[o],rating_count:o.rating_count,rating_average:o.rating_average};offset=page.next;}
   throw Error('Este profesional ya no está publicado.');
 }
}
const labels={barberia:'Barbería',salon:'Salón',mixto:'Barbería y salón',cafeteria:'Cafetería',bar_restaurante:'Bar y restaurante',bar:'Bar',restaurante:'Restaurante',suplidora:'Suplidora',otro:'Negocio'};
function barberPhoto(service,name){
 const hint=(name||'').toLowerCase();
 const style=/ceja|brow/.test(hint)?'cejas':/barba|beard/.test(hint)?'barba':/corte|cabello|pelo|fade|haircut/.test(hint)?'corte':null;
 function illustration(){
  const photo=categoryPhoto('', 'barberia');
  if(style)photo.src='./imagenes/servicio-'+style+'.webp';
  photo.alt='';
  return photo;
 }
 const photo=img(service.photo);
 if(!photo)return illustration();
 photo.onerror=()=>photo.replaceWith(illustration());
 return photo;
}
function render(b){
 const formatPrice = value => money(value, b.country);
 document.title=b.name+' · ANON Reserva';root.replaceChildren();if(pro)document.querySelector('#back').href='./independientes.html';
 if(!pro && b.country==='US'){
   const back=new URLSearchParams({vista:'catalogo',country:'US'});
   if(['FL','NY'].includes(q.get('state')))back.set('state',q.get('state'));
   if(q.get('city'))back.set('city',q.get('city'));
   document.querySelector('#back').href='./?'+back;
 }
 const offers=list(pro?b.offers:b.listing?.offers),plans=list(pro?b.plans:b.listing?.plans);
 const drinks=list(b.listing?.drinks),products=list(b.products),services=list(b.services);
 const phone=pro?b.phone:b.listing?.phone;
 const title=node('div',null,'identity'),desc=node('div');const portrait=img(b.profile_photo||b.photo);if(portrait){portrait.className='store-cover';}title.classList.add('store-identity');
 desc.append(node('h1',b.name));if(portrait)desc.append(portrait);desc.append(node('p',[pro?(b.title||'Profesional independiente'):(labels[b.category]||b.category),b.city].filter(Boolean).join(' · ')));
 const stars=b.rating_count?('★ '+Number(b.rating_average).toFixed(1)+' · '+b.rating_count+' reseñas'):'Sin reseñas todavía';
 const region=b.country==='US' ? [b.state_code || b.listing?.state_code,b.listing?.postal].filter(Boolean).join(' ') : '';
 const fullAddress=[b.address,region].filter(Boolean).join(', ');
 if(fullAddress) desc.append(node('p',fullAddress));
 const directions=window.businessDirections({...b,address:fullAddress});
 if(directions) desc.append(directions);
 if(phone){
   const line=node('p'),call=node('a',phone);
   call.href='tel:'+phone.replace(/[^0-9+]/g,'');
   line.append(call);desc.append(line);
 }
 desc.append(node('p',stars,'rating'));title.append(desc);root.append(title);
 const photos=list(b.business_photos);
 if(photos.length>1){
   const group=node('div',null,'store-gallery');group.setAttribute('aria-label','Fotos del negocio');
   for(const [i,photo] of photos.entries()){
     const thumb=img(photo.src);
     if(!thumb)continue;
     const label=photo.label || 'Foto '+(i+1);
     const show=button('',()=>{const full=img(photo.src);full.alt=label;full.className='gallery-full';modal(label,[full]);});
     show.setAttribute('aria-label','Ampliar '+label);show.append(thumb);group.append(show);
   }
   desc.append(group);
 }
 const head=node('div',null,'section-head');

 root.append(head);
 const barber=!pro && b.category==='barberia';
 const serviceGrid=node('div',null,barber?'service-list':'grid');const servicePanel=node('section');servicePanel.append(serviceGrid);root.append(servicePanel);let selected=services.find(s=>s.id===q.get('servicio'))||services[0];
 function checkout(lines, total, actions=[]) {
   const pay=node('button','Pagar','cta');
   pay.type='button';
   pay.disabled=true;
   modal('Resumen de compra',[
     node('p',b.name),...lines,node('strong',total),
     node('p','Los pagos están deshabilitados por el momento.'),pay,...actions
   ]);
 }
 function showAction(){
  foot.replaceChildren();foot.hidden=!selected;if(!selected)return;
  const name=selected.name||selected.title;foot.append(node('span',name+' · '+formatPrice(selected.price),'action-label'));
  const link=node('a',pro?'Solicitar servicio':'Ver horarios','cta');
  link.href=pro?'./independientes.html?'+new URLSearchParams({solicitar:selected.id,profesional:pro}):'./citas.html?'+new URLSearchParams({negocio:b.id,servicio:selected.id,paso:'horario'});
  foot.append(link);
 }
 let expanded=services.indexOf(selected)>3;
 function cards(){
  serviceGrid.replaceChildren();for(const s of expanded?services:services.slice(0,4)){
   const name=s.name||s.title;
   const tile=button('',()=>{selected=s;for(const n of serviceGrid.children)n.setAttribute('aria-pressed',String(n===tile));showAction();},barber?'service-row':'tile');
   tile.setAttribute('aria-pressed',String(s===selected));
   if(!barber){
    tile.append(img(s.photo)||categoryPhoto(name,s.category||b.category),node('span','✓','check'));
    const body=node('span',null,'tile-text');
    body.append(node('strong',name),node('small',[formatPrice(s.price),s.minutes?s.minutes+' min':s.unit?'por '+s.unit:''].filter(Boolean).join(' · ')));
    tile.append(body);serviceGrid.append(tile);continue;
   }
   const indicator=node('span','✓','service-choice');
   indicator.setAttribute('aria-hidden','true');
   tile.append(indicator);
   tile.append(barberPhoto(s,name));
   const body=node('span',null,'service-copy');
   body.append(node('strong',name));
   const duration=s.minutes?s.minutes+' min':s.unit?'por '+s.unit:'';
   if(duration)body.append(node('small',duration));
   tile.append(body,node('span',formatPrice(s.price),'service-price'));
   serviceGrid.append(tile);
  }
 }
 cards();if(!services.length && !products.length && !drinks.length)servicePanel.append(node('p','Este perfil todavía no tiene servicios disponibles.','sub'));
 if(services.length>4){const more=button(expanded?'Mostrar menos':'Ver todos los servicios',()=>{expanded=!expanded;cards();more.textContent=expanded?'Mostrar menos':'Ver todos los servicios';},'more');servicePanel.append(more);}
 if(services.length) {
   servicePanel.append(button('Comprar servicio',()=>{
     const service=selected;
     const details=[node('p',service.name||service.title)];
     if(service.minutes)details.push(node('p',service.minutes+' min'));
     if(service.unit)details.push(node('p','Por '+service.unit));
     checkout(details,service.price==null?'Precio por consultar':'Total · '+formatPrice(service.price));
   },'more'));
 }
 const catalog=[...products,...drinks];
 const productPanel=node('section');
 root.append(productPanel);
 let productMode=!services.length && (!pro || catalog.length>0);
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
   let totalCents=0;
   let allPriced=true;
   const lines=[],summary=[];
   for(const [item,quantity] of basket){
     const priced=item.price!=null && item.price!=='' && Number.isFinite(Number(item.price));
     const cents=priced?Math.round(Number(item.price)*100)*quantity:0;
     if(priced)totalCents+=cents;
     else allPriced=false;
     const line=node('article');
     line.append(node('strong',quantity+' × '+item.name),node('p',priced?formatPrice(cents/100):"Precio por consultar"));
     summary.push(line.cloneNode(true));
     line.append(button('Quitar',()=>{basket.delete(item);updateFooter();document.querySelector('#details').close();},'pill'));
     lines.push(line);
   }
   const total=allPriced?formatPrice(totalCents/100):'Total por confirmar';
   const totalLabel=allPriced?'Total · '+total:'Total por confirmar';
   lines.push(node('strong',totalLabel),button('Continuar al pago',()=>{
     checkout(summary,totalLabel,[button('Volver al pedido',()=>modal('Mi pedido',lines),'pill')]);
   },'cta'));
   foot.append(button('Ver pedido · '+total,()=>modal('Mi pedido',lines),'cta product-order'));
 }
 function addTab(label,mode){
   const tab=button(label,()=>switchMode(mode==='products'));
   tab.dataset.mode=mode;tabs.append(tab);
 }
 if(services.length)addTab('Servicios','services');
 if(!pro || catalog.length)addTab('Productos','products');
 const filters=node('div',null,'store-filters'),grid=node('div',null,'grid');
 productPanel.append(filters,grid);
 function openProduct(item){
   const content=[],photo=img(item.photo);
   if(photo){photo.className='product-detail-photo';content.push(photo);}
   content.push(node('strong',formatPrice(item.price)));
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
     const tile=node('article',null,'tile product-card');
     const detail=button('',()=>openProduct(item),'product-preview');
     const photo=img(item.photo);
     if(photo)detail.append(photo);
     const body=node('span',null,'tile-text');
     body.append(node('strong',item.name),node('small',formatPrice(item.price)+(item.unit?' / '+item.unit:'')));
     detail.append(body);
     const add=button('+',()=>{
       basket.set(item,(basket.get(item)||0)+1);
       updateFooter();
     },'product-add');
     add.setAttribute('aria-label','Agregar '+item.name+' al pedido');
     tile.append(detail,add);grid.append(tile);
   }
 }
 if(catalog.length){
   const categories=new Set(catalog.map(item=>item.category||'General'));
   for(const label of ['',...categories]){
     const control=button(label||'Todos',()=>drawProducts(label),'pill');control.dataset.category=label;filters.append(control);
   }
   filters.hidden=categories.size===1 && categories.has('General');drawProducts('');
 }
 if(!catalog.length && !pro){
   filters.hidden=true;
   productPanel.append(node('p','Todavía no hay productos publicados.','sub'));
 }
 switchMode(productMode);
 const sections=node('div',null,'catalog-sections');
 function section(label,items,empty,icon){
   if(pro && !items.length)return;
   const row=button('',()=>{
     const cards=itemList(items,b.country);
     cards.forEach((card,i)=>{
       const item=items[i],kind=icon==='offer-tag'?'offers':'plans';
       card.append(button(kind==='offers'?'Comprar oferta':'Comprar membresía',()=>{
         const total=item.price==null?'Precio por consultar':'Total · '+formatPrice(item.price);
         const actions=[];
         const lines=[node('p',item.name||item.title)];
         const regular=item.original??item.regular;
         if(regular!=null)lines.push(node('p','Valor regular · '+formatPrice(regular)));
         const saving=item.discount??(regular!=null && item.price!=null?Math.max(0,Number(regular)-Number(item.price)):null);
         if(saving!=null && saving>0)lines.push(node('p','Ahorras · '+formatPrice(saving)));
         if(item.uses)lines.push(node('p',item.uses+' visitas'));
         if(!pro && item.purchase_key && item.price!=null){
           const save=button('Guardar como pendiente',async()=>{
             save.disabled=true;
             try{
               const {api}=await import('https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/ui/mercado.js');
               const session=await api('auth/session/');
               if(!session.authenticated){const sign=node('a','Iniciar sesión');sign.href='./citas.html?vista=perfil';save.after(sign);return;}
               await api('purchases/','POST',{business:b.id,kind,key:item.purchase_key});
               save.textContent='Guardada en Mi perfil';
             }catch(error){save.after(node('p',error.message));save.disabled=false;}
           });
           actions.push(save);
         }
         checkout(lines,total,actions);
       }));
     });
     modal(label,cards.length?cards:[node('p',empty)]);
   },'catalog-row');
   const mark=node('span',null,'catalog-icon '+icon);
   mark.setAttribute('aria-hidden','true');
   const copy=node('span',null,'catalog-copy');
   copy.append(node('strong',label),node('small',items[0]?.name || items[0]?.title || empty));
   const arrow=node('span','›','catalog-arrow');
   arrow.setAttribute('aria-hidden','true');
   row.append(mark,copy,arrow);sections.append(row);
 }
 section('Ofertas',offers,'Aún no hay ofertas','offer-tag');
 section('Membresías',plans,'Aún no hay membresías','member-card');
 if(sections.childElementCount)root.append(sections);
 const facts=node('div',null,'facts');const reviews=button('',()=>{const lines=[node('p',stars)];for(let i=5;i>=1;i--)if(b.review_stars?.[i])lines.push(node('p',i+' ★ · '+b.review_stars[i]));for(const review of b.review_comments||[])lines.push(node('p',review.stars+' ★ · '+review.comment));modal('Reseñas',lines);});
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
