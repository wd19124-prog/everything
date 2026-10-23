/* drawer.js 发现页底部抽屉 列表与地点详情合一 可上拉铺满 */
(function(){
'use strict';
var sheet=document.getElementById('discover-sheet');if(!sheet||typeof map==='undefined')return;
var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');};
function ic(p,s){return '<svg viewBox="0 0 24 24" width="'+(s||20)+'" height="'+(s||20)+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
var I={x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',loc:'<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',chev:'<path d="m6 9 6 6 6-6"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',nav:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>',car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'};
var state={snap:'peek',mode:'list',place:null,dragging:false};
/* 结构 */
var handle=document.createElement('div');handle.className='drawer-handle';handle.innerHTML='<i></i>';sheet.insertBefore(handle,sheet.firstChild);
var detail=document.createElement('div');detail.id='drawer-detail';detail.className='drawer-detail';sheet.appendChild(detail);
var fab=document.createElement('button');fab.type='button';fab.id='drawer-fab';fab.className='drawer-fab';fab.setAttribute('aria-label','定位到我的位置');fab.innerHTML=ic(I.loc,22);document.body.appendChild(fab);
var top=document.createElement('div');top.id='drawer-topbar';top.className='drawer-topbar';top.innerHTML='<button type="button" class="dt-city"><span>附近</span>'+ic(I.chev,18)+'</button><button type="button" class="dt-search" aria-label="搜索地点">'+ic(I.search,22)+'</button>';document.getElementById('discover-view').appendChild(top);
var sbox=document.createElement('div');sbox.id='drawer-search';sbox.className='drawer-search';sbox.innerHTML='<div class="ds-row"><span class="ds-ic">'+ic(I.search,18)+'</span><input id="ds-input" type="search" placeholder="搜索地点 景点 餐厅" autocomplete="off"><button type="button" class="ds-cancel">取消</button></div><div class="ds-list" id="ds-list"></div>';document.getElementById('discover-view').appendChild(sbox);
/* 高度 */
function H(){var vh=window.innerHeight,nav=document.querySelector('.bottom-nav'),navTop=nav?nav.getBoundingClientRect().top:vh-100;
  var safeTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0;
  return {peek:150,half:Math.round(vh*(state.mode==='detail'?.52:.5)),full:vh-12-safeTop,bottomList:Math.max(0,Math.round(vh-navTop+6))};}
function apply(animate){
  var h=H(),height=h[state.snap];
  sheet.style.transition=animate===false?'none':'';sheet.dataset.snap=state.snap;sheet.dataset.mode=state.mode;
  sheet.style.setProperty('--drawer-h',height+'px');
  sheet.style.setProperty('--drawer-bottom',(state.mode==='detail'?0:h.bottomList)+'px');
  document.body.classList.toggle('drawer-detail',state.mode==='detail');document.body.classList.toggle('drawer-full',state.snap==='full');
  trackFab();
}
var trackTimer=0;
function trackFab(){clearInterval(trackTimer);var n=0;trackTimer=setInterval(function(){placeFab();if(++n>28)clearInterval(trackTimer);},16);placeFab();}
function placeFab(){var r=sheet.getBoundingClientRect();fab.style.top=Math.max(80,r.top-60)+'px';fab.classList.toggle('hide',state.mode==='detail'||state.snap==='full'||document.body.dataset.mode!=='discover');}
function snapTo(s,animate){state.snap=s;apply(animate);}
window.Drawer={snapTo:snapTo,open:openDetailDrawer,close:closeDetail,state:state};
/* 拖动 */
var drag=null;
function onDown(e){
  if(e.button!==undefined&&e.button!==0)return;
  if(e.target.closest('button,input,a,select,textarea')&&!e.target.closest('.drawer-handle'))return;
  drag={y:e.clientY,t:performance.now(),h:sheet.getBoundingClientRect().height,moved:false,id:e.pointerId};
  window.addEventListener('pointermove',onMove,{passive:false});window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onUp);
}
function onMove(e){
  if(!drag||e.pointerId!==drag.id)return;var dy=e.clientY-drag.y;
  if(!drag.moved&&Math.abs(dy)<6)return;
  if(!drag.moved){drag.moved=true;sheet.style.transition='none';}
  var h=H(),nh=Math.max(110,Math.min(h.full,drag.h-dy));sheet.style.setProperty('--drawer-h',nh+'px');placeFab();if(e.cancelable)e.preventDefault();
}
function onUp(e){
  window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);
  if(!drag||e.pointerId!==drag.id)return;var d=drag;drag=null;if(!d.moved)return;
  var h=H(),cur=sheet.getBoundingClientRect().height,v=(d.y-e.clientY)/Math.max(1,performance.now()-d.t),pts=state.mode==='detail'?[['half',h.half],['full',h.full]]:[['peek',h.peek],['half',h.half],['full',h.full]];
  var target=cur+v*220,best=pts[0];pts.forEach(function(p){if(Math.abs(p[1]-target)<Math.abs(best[1]-target))best=p;});
  if(state.mode==='detail'&&cur<h.half*0.78){closeDetail();return;}
  snapTo(best[0]);
}
[handle,sheet.querySelector('.discover-sheet-head'),sheet.querySelector('.discover-filters'),detail].forEach(function(el){if(el)el.addEventListener('pointerdown',onDown);});
handle.addEventListener('click',function(){if(state.mode==='list')snapTo(state.snap==='peek'?'half':state.snap==='half'?'full':'peek');});
/* 详情内容 */
var CATTAG={nature:'景点',museum:'博物馆',history:'历史文化',district:'特色街区',food:'美食',leisure:'休闲'};
function distText(p){var o=null;try{o=userPosition||discoverOrigin;}catch(e){}if(!o)return '';var d=distanceKm(o,p);if(!isFinite(d))return '';return d<1?Math.round(d*1000)+'米':d.toFixed(1)+'公里';}
function render(p){
  var info=PlaceInfo.get(p)||{},tags=[];
  if(p.famous)tags.push('<span class="dd-tag hot">热门推荐</span>');
  tags.push('<span class="dd-tag">'+esc((categories[p.c]||{}).name||CATTAG[p.c]||'地点')+'</span>');
  var rt=parseFloat(info.rating);if(rt)tags.push('<span class="dd-tag">评分 '+rt+'</span>');
  if(info.cost)tags.push('<span class="dd-tag">人均 '+esc(info.cost)+' 元</span>');
  var dt=distText(p);if(dt)tags.push('<span class="dd-tag">距你 '+dt+'</span>');
  var imgs=((info.photos&&info.photos.length)?info.photos:(placePhotos&&placePhotos[p.n]&&placePhotos[p.n].length?placePhotos[p.n]:[])).slice(0,6);
  var fallback=p.img||'';
  var strip=imgs.length?imgs.map(function(s){return '<img src="'+esc(s)+'" alt="" loading="lazy" onerror="this.remove()">';}).join(''):(fallback?'<img src="'+esc(fallback)+'" alt="" onerror="this.remove()">':'');
  var summary=info.summary||PlaceInfo.compose(p,info),rs=PlaceInfo.reasons(p,info);
  detail.innerHTML='<div class="dd-scroll"><div class="dd-head"><h2>'+esc(p.n)+'</h2><button type="button" class="dd-close" aria-label="关闭">'+ic(I.x,24)+'</button></div><div class="dd-tags">'+tags.join('')+'</div>'+(strip?'<div class="dd-photos">'+strip+'</div>':'')
   +'<h3 class="dd-sec">地点介绍</h3><p class="dd-text">'+esc(summary)+'</p>'
   +'<h3 class="dd-sec">值得去的理由</h3><ul class="reason-list">'+rs.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></div>'
   +'<div class="dd-actions"><button type="button" class="dd-btn primary" data-act="add">'+ic(I.plus,18)+'<span>添加至行程</span></button><a class="dd-btn" data-act="nav" target="_blank" rel="noopener" href="'+esc(globalNavUrl(p.lng,p.lat,p.n))+'">'+ic(I.nav,18)+'<span>导航</span></a>'
   +'<a class="dd-btn" data-act="car" target="_blank" rel="noopener" href="https://uri.amap.com/navigation?to='+p.lng+','+p.lat+','+encodeURIComponent(p.n)+'&mode=car&callnative=1">'+ic(I.car,18)+'<span>打车</span></a></div>';
  var head=detail.querySelector('.dd-head'),scroll=detail.querySelector('.dd-scroll');
  
  detail.querySelector('.dd-close').onclick=closeDetail;
  detail.querySelector('[data-act=add]').onclick=function(){addToItinerary(p);};
  var h3=detail.querySelectorAll('.dd-sec')[0];if(h3&&window.Tips)h3.appendChild(Tips.make('资料来自高德地图与公开信息 开放时间 票价和预约规则请以官方公告为准','alert'));
}
var markerActive=null;
function activate(p){if(markerActive){try{markerActive.getElement().classList.remove('is-active');}catch(e){}}var m=markers[p&&p.i];markerActive=m||null;if(m)m.getElement().classList.add('is-active');}
function openDetailDrawer(p){
  if(!p)return;state.place=p;state.mode='detail';state.snap=state.snap==='full'?'full':'half';render(p);apply();activate(p);
  try{var c=window.MapCoord?MapCoord.toMap(p.lng,p.lat):[p.lng,p.lat];var h=H();map.easeTo({center:c,offset:[0,-Math.round(h.half*.28)],duration:450});}catch(e){}
  PlaceInfo.load(p).then(function(){if(state.place===p&&state.mode==='detail')render(p);});
}
function closeDetail(){state.mode='list';state.place=null;state.snap='peek';apply();activate(null);}
/* 添加至行程 */
function fmtDate(d){return (d.getMonth()+1)+'月'+d.getDate()+'日';}
function addToItinerary(p){
  var wrap=document.createElement('div');wrap.className='tp-wrap';
  var days=itinerary.map(function(d,i){return {d:d,i:i};});
  wrap.innerHTML='<div class="tp-backdrop"></div><section class="tp-sheet" role="dialog"><div class="tp-grip"></div><h3>添加到哪一天</h3><div class="day-pick">'+(days.length?days.map(function(o){return '<button type="button" data-i="'+o.i+'"><b>'+esc(o.d.date)+'</b><small>'+(o.d.events||[]).length+' 个安排</small></button>';}).join(''):'')+'<button type="button" data-new="1"><b>新建一天</b><small>'+fmtDate(new Date())+'</small></button></div></section>';
  document.body.appendChild(wrap);requestAnimationFrame(function(){wrap.classList.add('open');});
  function close(){wrap.classList.remove('open');setTimeout(function(){wrap.remove();},320);}
  wrap.querySelector('.tp-backdrop').onclick=close;
  wrap.querySelectorAll('button').forEach(function(b){b.onclick=function(){
    var day;if(b.dataset.new){day={date:fmtDate(new Date()),label:'新的一天',route:'',stay:'',events:[]};itinerary.push(day);}else day=itinerary[+b.dataset.i];
    p.custom=true;p.dynamic=false;if(!placeByName(p.n))places.push(p);
    var last=(day.events||[]).filter(function(e){return /^\d{1,2}:\d{2}$/.test(e.time||'');}).map(function(e){return e.time;}).sort().pop(),hh=last?Math.min(21,parseInt(last)+2):9;
    day.events.push({time:(hh<10?'0':'')+hh+':00',name:p.n,duration:'约1小时',note:(p.t||'')});
    day.events.sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
    try{persistState();renderItinerary();}catch(e){}
    close();toast('已添加到 '+day.date);
  };});
}
function toast(t){var el=document.getElementById('busy-toast');if(!el){el=document.createElement('div');el.id='busy-toast';el.className='busy-toast';el.innerHTML='<i></i><span></span>';document.body.appendChild(el);}el.querySelector('span').textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){el.classList.remove('show');},1800);}
/* 标记与列表点击 */
function hook(p){var m=markers[p.i];if(!m||m.__drawer)return;m.__drawer=true;try{m.setPopup(null);}catch(e){}m.getElement().addEventListener('click',function(ev){ev.stopPropagation();openDetailDrawer(p);});}
var baseAdd=addPlaceMarker;addPlaceMarker=function(p){baseAdd(p);try{hook(p);}catch(e){}};
places.forEach(function(p){try{hook(p);}catch(e){}});
document.getElementById('discover-list').addEventListener('click',function(e){var r=e.target.closest('[data-discover-detail]');if(!r)return;e.stopImmediatePropagation();e.preventDefault();var p=placeByName(r.dataset.discoverDetail);if(p){if(state.snap==='full'&&false)snapTo('half');openDetailDrawer(p);}},true);
map.on('click',function(e){if(state.mode==='detail'&&!(e.originalEvent&&e.originalEvent.target.closest('.discover-map-marker')))closeDetail();});
/* 原有展开收起改为抽屉 */
collapseDiscoverSheet=function(){if(state.mode==='list')snapTo('peek');};
fab.onclick=function(){try{locate();}catch(e){}};
/* 顶部城市与搜索 */
var cityEl=top.querySelector('.dt-city span');
function refreshCity(){var c='附近';try{c=detectedCity||(activeDiscoverCity&&activeDiscoverCity!=='附近'?activeDiscoverCity:'附近');}catch(e){}if(cityEl.textContent!==c)cityEl.textContent=c;
  var n=document.querySelectorAll('#discover-list .discover-row').length,p=sheet.querySelector('.discover-sheet-head p');if(p)p.textContent=n?('共 '+n+' 个地点'):'';placeFab();}
setInterval(refreshCity,1200);
var sin=document.getElementById('ds-input'),slist=document.getElementById('ds-list'),stimer=0;
top.querySelector('.dt-search').onclick=function(){sbox.classList.add('open');sin.focus();};
sbox.querySelector('.ds-cancel').onclick=function(){sbox.classList.remove('open');sin.value='';slist.innerHTML='';sin.blur();};
async function runSearch(q){
  var items=[];
  try{
    if(window.AmapKit&&AmapKit.usable()){var tips=await AmapKit.suggest(q,'');items=AmapKit.rank(q,tips).slice(0,10).map(function(t){var pd=AmapKit.parseDistrict(t.district||''),l=AmapKit.ll(t.location),w=l?AmapKit.toWgs(l[0],l[1]):null;return {n:t.name,sub:[pd.city||pd.prov,pd.dist,Array.isArray(t.address)?'':t.address].filter(Boolean).join(' · '),lat:w&&w[1],lng:w&&w[0]};});}
    else{var r=await fetch('https://photon.komoot.io/api/?limit=8&q='+encodeURIComponent(q));var d=await r.json();items=(d.features||[]).map(function(f){var pr=f.properties||{};return {n:pr.name||q,sub:[pr.city,pr.state,pr.country].filter(Boolean).join(' · '),lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]};});}
  }catch(e){}
  if(sin.value.trim()!==q)return;
  slist.innerHTML=items.map(function(x,i){return '<button type="button" data-i="'+i+'"><b>'+esc(x.n)+'</b><small>'+esc(x.sub)+'</small></button>';}).join('')||'<div class="ds-empty">没有找到相关地点</div>';
  slist.querySelectorAll('[data-i]').forEach(function(b){b.onclick=function(){pick(items[+b.dataset.i]);};});
}
sin.addEventListener('input',function(){clearTimeout(stimer);var q=sin.value.trim();if(!q){slist.innerHTML='';return;}stimer=setTimeout(function(){runSearch(q);},180);});
async function pick(x){
  sbox.classList.remove('open');sin.blur();
  var lat=x.lat,lng=x.lng;
  if(!isFinite(lat)||!isFinite(lng)){try{var pois=await AmapKit.search({city:'全国',pageSize:1},null,0,x.n);var pl=pois&&pois[0]&&AmapKit.toPlace(pois[0]);if(pl){lat=pl.lat;lng=pl.lng;}}catch(e){}}
  if(!isFinite(lat)||!isFinite(lng)){toast('没有找到这个地点的位置');return;}
  var p=placeByName(x.n)||{n:x.n,c:'nature',lat:lat,lng:lng,city:(function(){try{return activeDiscoverCity||'';}catch(e){return '';}})(),province:'',qualityScore:9,t:''};
  if(!placeByName(x.n)){p.i=places.length;places.push(p);try{addPlaceMarker(p);}catch(e){}}
  window.__discoverRadii=null;try{loadNearbyPlaces(lat,lng,(function(){try{return activeDiscoverCity||'附近';}catch(e){return '附近';}})());}catch(e){}
  openDetailDrawer(p);
}
window.addEventListener('resize',function(){apply(false);});
apply(false);setTimeout(function(){apply(false);},400);
new MutationObserver(function(){placeFab();}).observe(document.body,{attributes:true,attributeFilter:['data-mode']});
})();
