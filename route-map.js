/* route-map.js 行程路线地图 相邻地点之间的步行与驾车路线 逐段耗时 */
(function(){
'use strict';
var faceB,map,mapLoaded=false,markers=[],dayIdx=0,mode='auto',token=0,pending=null;
function ic(p,c){return '<svg class="'+(c||'ic')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
var X='<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',ROUTE='<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',WALK='<circle cx="13" cy="4" r="1"/><path d="m9 20 3-6 3 2v6"/><path d="m6 8 6-1 3 4h3"/><path d="m12 7-2 7"/>',CAR='<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>';
function toDisp(lng,lat){return window.MapCoord?window.MapCoord.toMap(lng,lat):[lng,lat];}
function fmtDur(s){var m=Math.max(1,Math.round(s/60));if(m<60)return m+'分钟';var h=Math.floor(m/60),r=m%60;return h+'小时'+(r?r+'分':'');}
function fmtDist(m){return m<1000?Math.round(m)+'米':(m/1000).toFixed(m<10000?1:0)+'公里';}
function inChina(p){return window.MapCoord?!window.MapCoord.outOfChina(p.lng,p.lat):true;}
function build(){
  if(faceB)return;faceB=document.createElement('div');faceB.className='ab-face-b';
  faceB.innerHTML='<div class="route-bar"><div class="route-days"></div><div class="route-mode" role="group" aria-label="出行方式"><button type="button" data-mode="auto" class="on">自动</button><button type="button" data-mode="walk">步行</button><button type="button" data-mode="drive">驾车</button></div></div><div class="route-map" id="route-map"></div><div class="route-legs"></div>';
  faceB.querySelectorAll('[data-mode]').forEach(function(b){b.onclick=function(){mode=b.dataset.mode;faceB.querySelectorAll('[data-mode]').forEach(function(x){x.classList.toggle('on',x===b);});render();};});
  faceB.querySelector('.route-days').onclick=function(e){var b=e.target.closest('[data-i]');if(!b)return;dayIdx=+b.dataset.i;render();};
}
function ensureMap(){
  if(map)return;
  map=new maplibregl.Map({container:'route-map',style:createWhiteMapStyle(),center:[104,35],zoom:3,attributionControl:false,fadeDuration:150});
  map.on('load',function(){
    mapLoaded=true;
    map.addSource('legs',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    map.addLayer({id:'legs-casing',type:'line',source:'legs',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':8,'line-opacity':.9}});
    map.addLayer({id:'legs-drive',type:'line',source:'legs',filter:['==',['get','kind'],'drive'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8e8e93','line-width':5,'line-opacity':.95,'line-opacity-transition':{duration:500}}});
    map.addLayer({id:'legs-walk',type:'line',source:'legs',filter:['==',['get','kind'],'walk'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#14b8a6','line-width':5,'line-dasharray':[1,1.6],'line-opacity':.95,'line-opacity-transition':{duration:500}}});
    map.addLayer({id:'legs-est',type:'line',source:'legs',filter:['==',['get','kind'],'est'],layout:{'line-cap':'round'},paint:{'line-color':'#8e8e93','line-width':3,'line-dasharray':[2,2]}});
    if(pending){var f=pending;pending=null;f();}
  });
}
function stopsOf(d){
  var s=[];(d&&d.events||[]).forEach(function(e){var p=placeByName(e.name);if(p&&isFinite(p.lat)&&isFinite(p.lng)&&(!s.length||s[s.length-1].n!==p.n))s.push({n:p.n,t:e.time,lat:p.lat,lng:p.lng});});return s;
}
function pickKind(a,b){if(mode!=='auto')return mode;return distanceKm(a,b)<=1.5?'walk':'drive';}
function estimate(a,b,kind){var km=distanceKm(a,b)*1.3,sp=kind==='walk'?4.5:32;return {duration:km/sp*3600,distance:km*1000,est:true};}
function setLegs(feats){var src=map&&map.getSource('legs');if(src)src.setData({type:'FeatureCollection',features:feats});}
function render(){
  var my=++token,d=itinerary[dayIdx],stops=stopsOf(d),days=faceB.querySelector('.route-days'),legsBox=faceB.querySelector('.route-legs');
  var valid=[];itinerary.forEach(function(x,i){if(x.events&&x.events.length)valid.push(i);});
  if(valid.length&&valid.indexOf(dayIdx)<0){dayIdx=valid[0];d=itinerary[dayIdx];stops=stopsOf(d);}
  days.innerHTML=valid.map(function(i){var x=itinerary[i];return '<button type="button" data-i="'+i+'" class="'+(i===dayIdx?'on':'')+'">'+String(x.date||'').replace(/^\d{4}年/,'')+'</button>';}).join('');
  markers.forEach(function(m){m.remove();});markers=[];
  if(stops.length<2){legsBox.innerHTML='<div class="leg-empty">'+(stops.length?'这一天只有一个带位置的地点':'这一天还没有带位置的地点')+' 添加至少两个地点后可查看路线</div>';if(mapLoaded)setLegs([]);}
  var draw=function(){
    stops.forEach(function(p,i){var el=document.createElement('div');el.innerHTML='<div class="route-pin" style="animation-delay:'+(i*70)+'ms"><span>'+(i+1)+'</span></div>';el.title=p.n;markers.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lng,p.lat]).addTo(map));});
    var fit=function(){if(!stops.length)return;var b=new maplibregl.LngLatBounds();stops.forEach(function(p){b.extend(toDisp(p.lng,p.lat));});map.resize();map.fitBounds(b,{padding:{top:70,bottom:60,left:50,right:50},maxZoom:15,duration:700});};
    if(stops.length<2){fit();return;}
    var feats=[],rows=[];legsBox.innerHTML='';
    stops.slice(0,-1).forEach(function(a,i){var b=stops[i+1],kind=pickKind(a,b),est=estimate(a,b,kind);
      feats[i]={type:'Feature',properties:{kind:'est'},geometry:{type:'LineString',coordinates:[toDisp(a.lng,a.lat),toDisp(b.lng,b.lat)]}};
      var row=document.createElement('div');row.className='leg-item';row.style.animationDelay=(i*60)+'ms';row.innerHTML='<span class="leg-no">'+(i+1)+' → '+(i+2)+'</span><div><b>'+a.n+' → '+b.n+'</b><small>正在计算路线</small></div>';legsBox.appendChild(row);rows[i]=row;
      var holder=document.createElement('div'),badge=document.createElement('div');badge.className='leg-badge';badge.innerHTML=ic(kind==='walk'?WALK:CAR)+'<span>计算中</span>';holder.appendChild(badge);
      var mk=new maplibregl.Marker({element:holder}).setLngLat([(a.lng+b.lng)/2,(a.lat+b.lat)/2]).addTo(map);markers.push(mk);
      row.onclick=function(){var bb=new maplibregl.LngLatBounds();bb.extend(toDisp(a.lng,a.lat));bb.extend(toDisp(b.lng,b.lat));map.fitBounds(bb,{padding:70,maxZoom:16,duration:600});};
      var apply=function(r,k,real){
        if(my!==token)return;var txt=(real?'':'约')+fmtDur(r.duration)+' · '+(real?'':'约')+fmtDist(r.distance);
        rows[i].querySelector('small').textContent=(k==='walk'?'步行 ':'驾车 ')+txt+(real?'':' 估算');
        badge.innerHTML=ic(k==='walk'?WALK:CAR)+'<span>'+(real?'':'约')+fmtDur(r.duration)+'</span>';
        var path=real&&r.path&&r.path.length>1?r.path.map(function(c){var w=window.MapCoord&&MapCoord.useAmap?c:AmapKit.toWgs(c[0],c[1]);return window.MapCoord&&MapCoord.useAmap?c:toDisp(w[0],w[1]);}):null;
        feats[i]={type:'Feature',properties:{kind:real?k:'est'},geometry:{type:'LineString',coordinates:path||[toDisp(a.lng,a.lat),toDisp(b.lng,b.lat)]}};setLegs(feats.slice());
      };
      apply(est,kind,false);
      if(window.AmapKit&&AmapKit.usable()&&inChina(a)&&inChina(b)){
        AmapKit.route([a.lng,a.lat],[b.lng,b.lat],kind).then(function(r){if(r&&r.duration>0)apply(r,kind,true);}).catch(function(){});
      }
    });
    setLegs(feats);setTimeout(fit,60);
  };
  if(mapLoaded)draw();else pending=draw;
}
var face='a',busy=false,LIST='<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>';
function rootEl(){return document.getElementById('itinerary-content');}
function reduced(){return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function mountSwitch(r){
  var top=r.querySelector('.itinerary-top');if(!top||!r.querySelector('.timeline'))return false;
  if(top.querySelector('.ab-switch'))return true;
  var sw=document.createElement('div');sw.className='ab-switch';sw.setAttribute('role','tablist');sw.dataset.face=face;
  sw.innerHTML='<i class="ab-thumb"></i><button type="button" role="tab" data-ab="a" aria-selected="'+(face==='a')+'">'+ic(LIST)+'<span>行程</span></button><button type="button" role="tab" data-ab="b" aria-selected="'+(face==='b')+'">'+ic(ROUTE)+'<span>路线</span></button>';
  var sp=document.createElement('span');sp.className='ab-spacer';top.classList.add('ab-on');top.insertBefore(sp,top.firstChild);top.insertBefore(sw,sp.nextSibling);return true;
}
function applyFace(r){
  r.classList.toggle('ab-b',face==='b');var sw=r.querySelector('.ab-switch');
  if(sw){sw.dataset.face=face;sw.querySelectorAll('[data-ab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.ab===face));});}
}
function fitHeight(){if(!faceB||!faceB.isConnected)return;var nav=document.querySelector('.bottom-nav'),navTop=nav?nav.getBoundingClientRect().top:innerHeight,top=faceB.getBoundingClientRect().top;faceB.style.height=Math.max(300,Math.floor(navTop-top-10))+'px';if(map)map.resize();}
window.addEventListener('resize',fitHeight);
function showB(r){
  build();if(faceB.parentNode!==r)r.appendChild(faceB);
  dayIdx=typeof currentDay==='function'?Math.max(0,currentDay()):dayIdx;if(dayIdx>=itinerary.length)dayIdx=0;
  fitHeight();ensureMap();map.resize();render();setTimeout(fitHeight,420);
}
function visibleKids(r){return [].slice.call(r.children).filter(function(el){return !el.matches('.app-eyebrow,.ab-head,.itinerary-top')&&getComputedStyle(el).display!=='none';});}
async function switchTo(next){
  var r=rootEl();if(!r||busy||next===face)return;busy=true;
  var anim=!reduced(),out=visibleKids(r);r.style.perspective='1000px';
  if(anim)await Promise.all(out.map(function(el){el.style.transformOrigin='50% 0';return el.animate([{opacity:1,transform:'rotateX(0)'},{opacity:0,transform:'rotateX(-65deg) translateY(-8px)'}],{duration:190,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}).finished.catch(function(){});}));
  face=next;applyFace(r);if(face==='b')showB(r);
  out.forEach(function(el){el.getAnimations().forEach(function(a){a.cancel();});});
  if(anim)visibleKids(r).forEach(function(el){el.style.transformOrigin='50% 0';el.animate([{opacity:0,transform:'rotateX(65deg) translateY(8px)'},{opacity:1,transform:'none'}],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});});
  setTimeout(function(){r.style.perspective='';busy=false;},anim?360:0);
}
var base=renderItinerary;
renderItinerary=function(){
  base.apply(this,arguments);
  var r=rootEl();if(!r)return;
  if(!mountSwitch(r)){face='a';r.classList.remove('ab-b');return;}
  applyFace(r);if(face==='b')showB(r);
};
document.addEventListener('click',function(e){var b=e.target.closest('.ab-switch [data-ab]');if(b)switchTo(b.dataset.ab);});
window.RouteMap={switchTo:switchTo};
})();
