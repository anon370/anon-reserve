import {categoryPhoto, money} from "./servicio-visual.js";
const base='https://octopus-app-wmb69.ondigitalocean.app/api/plataforma/';
const q=new URLSearchParams(location.search), pro=q.get('profesional'), id=pro||q.get('negocio');
const root=document.querySelector('#profile'), foot=document.querySelector('#action');
const list=x=>Array.isArray(x)?x:[];
const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function englishPreference(){try{return localStorage.getItem('anon.web.clientes.idioma')==='en';}catch{return false;}}
function node(tag,text,cl){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cl)n.className=cl;return n;}
function button(text,action,cl){const n=node('button',text,cl);n.type='button';n.onclick=action;return n;}
function img(src){if(typeof src!=='string'||!(/^(https:\/\/|data:image\/jpeg;base64,)/i).test(src))return null;const n=node('img');n.alt='';n.loading='lazy';n.referrerPolicy='no-referrer';n.src=src;n.onerror=()=>n.remove();return n;}
async function read(path){const r=await fetch(base+path,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Object.assign(Error('No se pudo abrir esta ficha.'),{status:r.status});return r.json();}
function modal(title,content){document.querySelector('#dialog-title').textContent=title;document.querySelector('#detail-body').replaceChildren(...content);document.querySelector('#details').showModal();}
document.querySelector('#dismiss').onclick=()=>document.querySelector('#details').close();
function itemList(rows){return rows.map(row=>{const a=node('article');a.append(node('strong',row.name||row.title));for(const t of [row.price!=null?money(row.price):'',row.description,row.validity,row.end?'Hasta '+row.end:'',row.uses?row.uses+' visitas':''])if(t)a.append(node('p',t));return a;});}
function businessGallery(b, english) {
 const gallery=node('div',null,'business-gallery');
 gallery.setAttribute('role','group');
 gallery.setAttribute('aria-label',english?'Business photos':'Fotos del negocio');
 const seen=new Set();
 const galleryRows=list(b.business_photos);
 const photos=galleryRows.length?galleryRows:[{src:b.profile_photo||b.photo}];
 for(const photo of photos){
   const src=photo?.src?.trim?.();
   if(!src||seen.has(src))continue;
   const image=img(src);
   if(!image)continue;
   seen.add(src);
   const index=seen.size;
   const title=photo.label?.trim?.()||(english?'Photo '+index+' · ':'Foto '+index+' · ')+b.name;
   const view=button('',()=>{
     const enlarged=img(src);
     enlarged.alt=title;
     enlarged.className='business-enlarged-photo';
     modal(title,[enlarged]);
   },'business-photo');
   image.alt=title;
   if(index===1)image.loading='eager';
   image.onerror=()=>view.remove();
   view.setAttribute('aria-label',(english?'Enlarge photo · ':'Ampliar foto · ')+title);
   view.append(image);gallery.append(view);
   if(index===5)break;
 }
 return gallery;
}
function numericPrice(value) {
 if(!['string','number'].includes(typeof value)||String(value).trim()==='')return null;
 const number=Number(value);
 return Number.isFinite(number)&&number>=0?number:null;
}
function businessCommerce(b, english, formatPrice) {
 const container=node('div',null,'business-commerce');
 for(const key of ['offers','plans']){
   const items=list(b.listing?.[key]).filter(item=>item&&(item.name||item.title));
   if(!items.length)continue;
   const isOffer=key==='offers';
   const section=node('section');
   const label=isOffer?(english?'Offers':'Ofertas'):(english?'Memberships':'Membresías');
   section.append(node('h2',label));
   for(const item of items){
     const row=node('article');
     row.append(node('h3',item.name||item.title));
     const terms=node('p',null,'business-terms');
     const price=numericPrice(item.price);
     if(price!==null)terms.append(formatPrice(price));
     const original=numericPrice(item.original);
     if(isOffer&&price!==null&&original!==null&&original>price){
       terms.append(' ',node('span',english?'Original price ':'Precio anterior ','business-sr-only'),node('s',formatPrice(original)));
     }
     const visits=Number(item.uses);
     if(!isOffer&&Number.isInteger(visits)&&visits>0){
       const unit=english?(visits===1?'visit':'visits'):(visits===1?'visita':'visitas');
       terms.append((terms.hasChildNodes()?' · ':'')+visits+' '+unit);
     }
     if(terms.hasChildNodes())row.append(terms);
     for(const detail of [item.description,item.validity,item.end?(english?'Until ':'Hasta ')+item.end:'']){
       if(detail)row.append(node('p',detail,'business-offer-detail'));
     }
     section.append(row);
   }
   container.append(section);
 }
 return container;
}
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
   while(offset!=null){const page=await read('independents/?country=DO&offset='+offset);const o=page.offers.find(x=>x.id===pro);if(o)return {id:o.id,name:o.public_name,city:o.city,phone:o.phone,title:page.categories[o.category],services:[o],rating_count:o.rating_count,rating_average:o.rating_average};offset=page.next;}
   throw Error('Este profesional ya no está publicado.');
 }
}
const labels={barberia:'Barbería',salon:'Salón',mixto:'Barbería y salón',cafeteria:'Cafetería',bar_restaurante:'Bar y restaurante',bar:'Bar',restaurante:'Restaurante',suplidora:'Suplidora',otro:'Negocio'};
const labelsEn={barberia:'Barbershop',salon:'Salon',mixto:'Barbershop and salon',cafeteria:'Café',bar_restaurante:'Bar and restaurant',bar:'Bar',restaurante:'Restaurant',suplidora:'Supplier',otro:'Business'};
function render(b){
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
 const routeEnglish=englishPreference(),en=routeEnglish&&!pro;
 const t=(es,eng)=>en?eng:es;
 if(en){
   document.documentElement.lang='en';
   document.querySelector('#back').setAttribute('aria-label','Back to the directory');
   document.querySelector('.account').textContent='Profile';
   document.querySelector('#dismiss').setAttribute('aria-label','Close');
 }
 const formatPrice=value=>{
   if(pro)return money(value);
   const price=numericPrice(value);
   if(price===null)return en?'Price on request':'A convenir';
   return (b.country==='US'?'US$':'RD$')+price.toLocaleString(en?'en-US':'es-DO',{maximumFractionDigits:2});
 };
 const title=node('div',null,pro?'identity store-identity':'business-profile'),desc=node('div',null,pro?'':'business-overview');
 if(pro){
   const portrait=img(b.profile_photo||b.photo);
   desc.append(node('h1',b.name));
   if(portrait){portrait.className='store-cover';desc.append(portrait);}
   desc.append(node('p',[b.title||'Profesional independiente',b.city].filter(Boolean).join(' · ')));
 }else{
   title.lang=en?'en':'es';
   title.append(businessGallery(b,en));
   const category=(en?labelsEn:labels)[b.category]||b.category;
   if(category)desc.append(node('p',category,'business-category'));
   desc.append(node('h1',b.name));
 }
 const stars=b.rating_count?('★ '+Number(b.rating_average).toFixed(1)+' · '+b.rating_count+(en?(b.rating_count===1?' review':' reviews'):' reseñas')):(en?'No reviews yet':'Sin reseñas todavía');
 if(pro&&b.address)desc.append(node('p',b.address));
 if(!pro&&(b.address||b.city)){
   const parts=[b.address,b.city].filter(Boolean);
   if(parts.length===2&&parts[0].toLowerCase().includes(parts[1].toLowerCase()))parts.pop();
   desc.append(node('p',parts.join(', '),'business-address'));
 }
 const directions=window.businessDirections(b,routeEnglish,false,!pro);
 if(directions) desc.append(directions);
 if(pro||b.rating_count)desc.append(node('p',stars,'rating'));
 title.append(desc);
 if(!pro)title.append(businessCommerce(b,en,formatPrice));
 root.append(title);
 const head=node('div',null,'section-head');

 root.append(head);
 const serviceGrid=node('div',null,'grid');const servicePanel=node('section');servicePanel.append(serviceGrid);root.append(servicePanel);let selected=services.find(s=>s.id===q.get('servicio'))||services[0];
 function showAction(){
  foot.replaceChildren();foot.hidden=!selected;if(!selected)return;
  const name=selected.name||selected.title;foot.append(node('span',name+' · '+formatPrice(selected.price),'action-label'));
  const link=node('a',pro?'Solicitar servicio':t('Ver horarios','View times'),'cta');
  link.href=pro?'./independientes.html?'+new URLSearchParams({solicitar:selected.id,profesional:pro}):'./citas.html?'+new URLSearchParams({negocio:b.id,servicio:selected.id,paso:'horario'});
  foot.append(link);
 }
 let expanded=services.indexOf(selected)>3;
 function cards(){
  serviceGrid.replaceChildren();for(const s of expanded?services:services.slice(0,4)){
   const name=s.name||s.title;
   const tile=button('',()=>{selected=s;for(const n of serviceGrid.children)n.setAttribute('aria-pressed',String(n===tile));showAction();},'tile');
   tile.setAttribute('aria-pressed',String(s===selected));const pic=img(s.photo);const photo=pic||categoryPhoto(name,s.category||b.category);if(en&&!pic)photo.alt='Illustration of the category';tile.append(photo,node('span','✓','check'));
   const body=node('span',null,'tile-text');body.append(node('strong',name),node('small',[formatPrice(s.price),s.minutes?s.minutes+' min':s.unit?t('por ','per ')+s.unit:''].filter(Boolean).join(' · ')));tile.append(body);serviceGrid.append(tile);
  }
 }
 cards();if(!services.length && !products.length && !drinks.length)servicePanel.append(node('p',t('Este perfil todavía no tiene servicios disponibles.','This profile has no services yet.'),'sub'));
 if(services.length>4){const more=button(expanded?t('Mostrar menos','Show fewer'):t('Ver todos los servicios','See all services'),()=>{expanded=!expanded;cards();more.textContent=expanded?t('Mostrar menos','Show fewer'):t('Ver todos los servicios','See all services');},'more');servicePanel.append(more);}
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
   const lines=[];
   for(const [item,quantity] of basket){
     const priced=item.price!=null && item.price!=='' && Number.isFinite(Number(item.price));
     const cents=priced?Math.round(Number(item.price)*100)*quantity:0;
     if(priced)totalCents+=cents;
     else allPriced=false;
     const line=node('article');
     line.append(node('strong',quantity+' × '+item.name),node('p',priced?formatPrice(cents/100):t('Precio por consultar','Price on request')));
     line.append(button(t('Quitar','Remove'),()=>{basket.delete(item);updateFooter();document.querySelector('#details').close();},'pill'));
     lines.push(line);
   }
   const total=allPriced?formatPrice(totalCents/100):t('Total por confirmar','Total to be confirmed');
   lines.push(node('strong','Total · '+total));
   foot.append(button(t('Ver pedido · ','View order · ')+total,()=>modal(t('Mi pedido','My order'),lines),'cta product-order'));
 }
 function addTab(label,mode){
   const tab=button(label,()=>switchMode(mode==='products'));
   tab.dataset.mode=mode;tabs.append(tab);
 }
 if(services.length)addTab(t('Servicios','Services'),'services');
 if(!pro || catalog.length)addTab(t('Productos','Products'),'products');
 const filters=node('div',null,'store-filters'),grid=node('div',null,'grid');
 productPanel.append(filters,grid);
 function openProduct(item){
   const content=[],photo=img(item.photo);
   if(photo){photo.className='product-detail-photo';content.push(photo);}
   content.push(node('strong',formatPrice(item.price)));
   if(item.description)content.push(node('p',item.description));
   let quantity=1;
   const count=node('span','1'),step=node('div',null,'store-step');
   step.append(node('span',t('Cantidad','Quantity')),button('−',()=>{quantity=Math.max(1,quantity-1);count.textContent=quantity;}),count,button('+',()=>{quantity++;count.textContent=quantity;}));
   content.push(step,button(t('Agregar al pedido','Add to order'),()=>{basket.set(item,(basket.get(item)||0)+quantity);document.querySelector('#details').close();updateFooter();},'cta'));
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
     add.setAttribute('aria-label',en?'Add '+item.name+' to order':'Agregar '+item.name+' al pedido');
     tile.append(detail,add);grid.append(tile);
   }
 }
 if(catalog.length){
   const categories=new Set(catalog.map(item=>item.category||'General'));
   for(const label of ['',...categories]){
     const control=button(label||t('Todos','All'),()=>drawProducts(label),'pill');control.dataset.category=label;filters.append(control);
   }
   filters.hidden=categories.size===1 && categories.has('General');drawProducts('');
 }
 if(!catalog.length && !pro){
   filters.hidden=true;
   productPanel.append(node('p',t('Todavía no hay productos publicados.','No products have been published yet.'),'sub'));
 }
 switchMode(productMode);
 const sections=node('div',null,'catalog-sections');
 function section(label,items,empty,icon){
   if(!pro || !items.length)return;
   const row=button('',()=>modal(label,items.length?itemList(items):[node('p',empty)]),'catalog-row');
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
 const facts=node('div',null,'facts');const reviews=button('',()=>{const lines=[node('p',stars)];for(let i=5;i>=1;i--)if(b.review_stars?.[i])lines.push(node('p',i+' ★ · '+b.review_stars[i]));modal(t('Reseñas','Reviews'),lines);});
 reviews.append(node('strong',t('Reseñas','Reviews')),node('small',stars));
 const summary=node('small',b.address||b.mode||b.city);
 const info=button('',()=>{
  const entries=[b.description,b.mode,b.address,b.city].filter(Boolean).map(s=>node('p',s));
  if(phone){const a=node('a',phone);a.href='tel:'+phone.replace(/[^0-9+]/g,'');entries.push(a);}
  for(const [idx,time] of Object.entries(b.hours||{}))entries.push(node('p',(en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:days)[idx]+' · '+time.join(' – ')));
  modal(t('Información','Information'),entries);
 });info.append(node('strong',t('Información','Information')),summary);if(phone)info.append(node('small',phone));facts.append(reviews,info);root.append(facts);updateFooter();
}
async function offerOwnerEditor(b){
 if(pro)return;
 try{
  const response=await fetch(base+'auth/session/',{credentials:'include',cache:'no-store'});
  if(!response.ok)return;
  const session=await response.json();
  if(session.workspaces?.some(w=>w.id===b.id && w.role==='owner')){
   const link=node('a',englishPreference()?'Edit my catalog':'Editar mi catálogo','profile-link');link.href='./editar-ficha.html?negocio='+encodeURIComponent(b.id);root.append(link);
  }
 }catch{}
}
load().then(b=>{render(b);offerOwnerEditor(b);}).catch(e=>{root.replaceChildren(node('p',e.message),button('Volver a intentar',()=>location.reload(),'more'));});
