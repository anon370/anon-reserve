const SVG='http://www.w3.org/2000/svg';
const BASE={lat:18.8,lon:-70.2};
export function positionEditor(box,fields,readPoint,setPoint){
 const make=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const map=document.createElementNS(SVG,'svg');
 map.setAttribute('viewBox','0 0 512 300');map.setAttribute('aria-label','Mapa para marcar el local. También puedes escribir las coordenadas.');
 map.classList.add('point-map');
 let center=readPoint()||BASE,zoom=readPoint()?15:7;
 function xy(point){const n=256*2**zoom,r=point.lat*Math.PI/180;return [(point.lon+180)/360*n,(1-Math.asinh(Math.tan(r))/Math.PI)/2*n];}
 function from(x,y){const n=256*2**zoom;return {lon:x/n*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI};}
 function svg(tag,attr){const n=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attr))n.setAttribute(k,v);return n;}
 function draw(){map.replaceChildren();const [cx,cy]=xy(center),left=cx-256,top=cy-150;
  for(let x=Math.floor(left/256);x*256<left+512;x++)for(let y=Math.floor(top/256);y*256<top+300;y++){
   const n=2**zoom;if(y<0||y>=n)continue;
   map.append(svg('image',{href:'https://tile.openstreetmap.org/'+zoom+'/'+((x%n+n)%n)+'/'+y+'.png',x:x*256-left,y:y*256-top,width:256,height:256}));
  }
  const p=readPoint();if(p){const [x,y]=xy(p);map.append(svg('circle',{cx:x-left,cy:y-top,r:8,fill:'#111',stroke:'#fff','stroke-width':3}));}
 }
 function act(label,fn){const b=make('button',label);b.type='button';b.onclick=fn;return b;}
 map.onclick=e=>{const matrix=map.getScreenCTM();if(!matrix)return;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());const [cx,cy]=xy(center);const p=from(cx+pt.x-256,cy+pt.y-150);setPoint(p);center=p;draw();};
 const attribution=make('a','© OpenStreetMap contributors');attribution.href='https://www.openstreetmap.org/copyright';attribution.target='_blank';attribution.rel='noopener';
 const controls=make('div','');controls.append(act('Acercar +',()=>{zoom=Math.min(19,zoom+1);draw();}),act('Alejar −',()=>{zoom=Math.max(3,zoom-1);draw();}),attribution);
 box.append(map,controls);
 for(const f of fields)f.addEventListener('change',()=>{const p=readPoint();if(p){center=p;zoom=16;}draw();});
 draw();return p=>{if(p){center=p;zoom=16;}draw();};
}
