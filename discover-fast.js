/* discover-fast.js 发现身边 提速与全球化 */
(function(){
'use strict';
var LAST='sy-last-position',lastRefresh=0;
function readSaved(){try{var s=JSON.parse(localStorage.getItem(LAST)||'null');return s&&Number.isFinite(s.lat)&&Number.isFinite(s.lng)?s:null;}catch(e){return null;}}
function skeleton(){var el=document.getElementById('discover-list');if(!el)return;var r='<div class="skeleton-row"><i></i><div style="flex:1"><b></b><b></b></div></div>';el.innerHTML=r+r+r+r;}

/* 1 附近查询 收窄条件 先近后远 三个镜像竞速 */
var rawStage=async function(lat,lng,radius){
  var a='(around:'+radius+','+lat+','+lng+')',key='[~"^(website|wikidata|wikipedia|brand|official_name|operator|opening_hours)$"~"."]';
  var q='[out:json][timeout:10];('
   +'nwr'+a+'[tourism~"^(attraction|museum|gallery|zoo|theme_park|aquarium|viewpoint)$"][name];'
   +'nwr'+a+'[historic][name]'+key+';'
   +'nwr'+a+'[amenity~"^(restaurant|cafe|food_court)$"][name]'+key+';'
   +'nwr'+a+'[amenity~"^(theatre|arts_centre)$"][name];'
   +'nwr'+a+'[leisure~"^(park|nature_reserve|water_park|spa)$"][name];'
   +');out center tags 120;';
  var hosts=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  var ctrls=hosts.map(function(){return new AbortController();});
  var reqs=hosts.map(function(h,i){var timer=setTimeout(function(){ctrls[i].abort();},7000);
    return fetch(h+'?data='+encodeURIComponent(q),{signal:ctrls[i].signal}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}).finally(function(){clearTimeout(timer);});});
  var data=await TripAppCore.firstSuccessful(reqs,function(v){return Array.isArray(v&&v.elements)&&v.elements.length>0;});
  ctrls.forEach(function(c){c.abort();});
  return (data&&data.elements)||[];
};

var inflight={};
fetchNearbyStage=function(lat,lng,radius){
  function key(r){return lat.toFixed(3)+','+lng.toFixed(3)+','+r;}
  function get(r){var k=key(r);if(!inflight[k]){inflight[k]=rawStage(lat,lng,r);setTimeout(function(){delete inflight[k];},90000);}return inflight[k];}
  if(radius<=3000)get(9000);
  return get(radius);
};

/* 2 不再批量联网查介绍 先用标签信息即时展示 */
enrichNearbyPlaces=async function(){};
nearbyDisplayIntro=function(p){var t=String(p.t||'').trim();if(t&&!isNearbyTemplate(t))return t;var cat=discoverCategoryName(discoverCategory(p)),reg=(p.district&&p.districtVerified)?p.district:'';return cat+(reg?' · '+reg:'');};
fetchPlaceIntro=async function(name){
  if(window.MapCoord&&MapCoord.useAmap)return '';
  async function get(url){var c=new AbortController(),t=setTimeout(function(){c.abort();},3500);try{var r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null;}catch(e){return null;}finally{clearTimeout(t);}}
  var langs=['zh','en'];
  for(var i=0;i<langs.length;i++){var d=await get('https://'+langs[i]+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(name)+'?redirect=true');
    var x=d&&d.extract&&d.type!=='disambiguation'?String(d.extract).trim():'';if(x.length>20){return x.slice(0,160);}}
  return '';
};

/* 3 定位 先用缓存位置立刻显示 后台刷新真实位置 */
function refreshPosition(){
  if(!navigator.geolocation||Date.now()-lastRefresh<45000)return;lastRefresh=Date.now();
  navigator.geolocation.getCurrentPosition(function(pos){
    var p={lng:pos.coords.longitude,lat:pos.coords.latitude,accuracy:pos.coords.accuracy};
    try{localStorage.setItem(LAST,JSON.stringify(p));}catch(e){}
    var moved=!userPosition||distanceKm(userPosition,p)>1.5;userPosition=p;
    if(moved){discoverLoadedKey='';showNearbyForPosition(p);}
  },function(err){
    if(!userPosition){activeDiscoverCity='';discoverOrigin=null;renderDiscover('all');setStatus(err&&err.code===1?'请在系统设置中允许定位':'暂时无法定位 请检查网络和定位开关');}
  },{enableHighAccuracy:false,timeout:8000,maximumAge:120000});
}
ensureDiscoverLocation=async function(){
  collapseDiscoverSheet();
  var saved=userPosition||readSaved();
  if(saved){userPosition=saved;showNearbyForPosition(saved);}else{skeleton();setStatus('正在定位');}
  refreshPosition();
};
var _show=showNearbyForPosition;
showNearbyForPosition=function(pos){
  var has=places.some(function(p){return p.dynamic&&!p.retired;});if(!has)skeleton();
  return _show(pos);
};

/* 5 用地图标签生成即时介绍 不依赖境外网站 */
var CUISINE={chinese:'中餐',sichuan:'川菜',cantonese:'粤菜',hotpot:'火锅',noodle:'面食',barbecue:'烧烤',seafood:'海鲜',coffee_shop:'咖啡',tea:'茶饮',japanese:'日料',korean:'韩餐',pizza:'披萨',burger:'汉堡',dumpling:'饺子',regional:'地方菜',vegetarian:'素食',western:'西餐'};
function tagIntro(tg){
  var parts=[],d=tg['description:zh']||tg.description;if(d&&d.length<=80)parts.push(d);
  if(tg.cuisine){var c=String(tg.cuisine).split(';').map(function(k){return CUISINE[k.trim()];}).filter(Boolean).slice(0,2).join('、');if(c)parts.push(c);}
  if(tg.fee==='no')parts.push('免费参观');else if(tg.fee==='yes'||tg.charge)parts.push('收费'+(tg.charge?' '+String(tg.charge).slice(0,20):''));
  if(tg.opening_hours&&tg.opening_hours.length<=34)parts.push('营业时间 '+tg.opening_hours);
  return parts.join(' · ');
}
window.tagIntro=tagIntro;
normalizeNearbyElements=function(elements,cityLabel,limit,knownNames){
  return elements.map(function(item){
    var tags=item.tags||{},category=nearbyCategory(tags),name=tags['name:zh']||tags.name,
      lat=Number(item.lat!=null?item.lat:(item.center&&item.center.lat)),lng=Number(item.lon!=null?item.lon:(item.center&&item.center.lon));
    if(!category||!name||knownNames.has(name)||!Number.isFinite(lat)||!Number.isFinite(lng)||!qualityPlace(tags,category))return null;
    knownNames.add(name);var district=tags['addr:district']||'';
    return {n:name,c:category,lat:lat,lng:lng,city:cityLabel,province:tags['addr:province']||'',district:district,districtVerified:Boolean(district),source:'公开地图资料',t:tagIntro(tags),dynamic:true,
      qualityScore:['website','wikidata','wikipedia','official_name','operator','opening_hours','description'].filter(function(f){return tags[f];}).length};
  }).filter(Boolean).sort(function(a,b){return b.qualityScore-a.qualityScore;}).slice(0,limit);
};

/* 3b 启动即预取 打开发现页时数据已就绪 */
function prefetch(){
  var s=readSaved();if(!s)return;
  if(navigator.permissions&&navigator.permissions.query){
    navigator.permissions.query({name:'geolocation'}).then(function(r){if(r.state==='granted')refreshPosition();}).catch(function(){});
  }
  userPosition=userPosition||s;
  try{showNearbyForPosition(s);}catch(e){}
}
setTimeout(prefetch,300);

/* 4 底图失败自动切换备用瓦片 */
var failures=0,switched=false;
map.on('error',function(e){
  if(switched||!e||!e.sourceId||e.sourceId!=='base')return;
  if(++failures>=4){switched=true;try{map.getSource('base').setTiles(MapCoord.fallbackTiles());}catch(x){}}
});
})();

/* 我的页面 入口图标 */
(function(){
  var P={expense:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    memory:'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    taste:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'};
  function svg(b,c){return '<svg class="'+c+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+b+'</svg>';}
  var _r=renderMyHome;
  renderMyHome=function(){
    _r.apply(this,arguments);
    document.querySelectorAll('#my-content .my-card').forEach(function(card){
      var k=card.dataset.myPanel;if(!P[k]||card.querySelector('.row-ic'))return;
      card.insertAdjacentHTML('afterbegin','<span class="row-ic">'+svg(P[k],'ic')+'</span>');
      card.insertAdjacentHTML('beforeend',svg('<path d="m9 18 6-6-6-6"/>','row-go'));
    });
  };
})();

/* 详情页 无公开介绍时的友好兜底 */
loadVerifiedPlaceIntroForDetail=async function(place){
  var intro='';try{intro=await fetchPlaceIntro(place.n,place.city||place.province||'');}catch(e){}
  place._introLoading=false;place._introCheckedAt=Date.now();
  if(intro){place.t=intro;place.introSource='公开资料';}
  else{var cat=(categories[place.c]||{}).name||'地点';place.t=[place.city,cat].filter(Boolean).join(' · ')+'。暂无公开介绍 可点击地图导航查看位置和周边';place.introSource='你的行程记录';}
  try{persistState();}catch(e){}
  var dv=document.getElementById('detail-view');if(dv&&dv.classList.contains('active'))openDetail(place.n);
};

/* 6 周边推荐 改用开源数据层 不强制标签 分级扩大范围 */
loadNearbyPlaces=async function(lat,lng,cityLabel){
  cityLabel=cityLabel||'附近';
  var key=lat.toFixed(3)+','+lng.toFixed(3),recent=nearbyCacheForPosition({lat:lat,lng:lng});
  if(discoverLoadedKey===key&&window.__nearbyRequest)return window.__nearbyRequest;
  if(discoverLoadedKey===key&&recent&&recent.updatedAt&&Date.now()-recent.updatedAt<6*36e5&&(recent.places||[]).length>=20)return recent.places;
  discoverLoadedKey=key;discoverOrigin={lat:lat,lng:lng};window.__nearbyGen=(window.__nearbyGen||0)+1;var myGen=window.__nearbyGen;
  var task=(async function(){
    setStatus('正在查找附近地点');
    var known=new Set(places.filter(function(p){return !p.dynamic&&!p.retired;}).map(function(p){return p.n;})),collected=[],replaced=false;
    function add(list){
      if(myGen!==window.__nearbyGen||!list||!list.length)return;
      if(!replaced){retireDynamicPlaces();replaced=true;}
      list.forEach(function(x){if(known.has(x.n))return;known.add(x.n);var tg=x.tags||{};
        var p={n:x.n,c:x.c,lat:x.lat,lng:x.lng,city:cityLabel,province:tg['addr:province']||'',district:tg['addr:district']||'',districtVerified:Boolean(tg['addr:district']),source:'公开地图资料',t:tagIntro(tg),dynamic:true,qualityScore:x.qualityScore};
        p.i=places.length;places.push(p);collected.push(p);});
      activeDiscoverCity=cityLabel;
      try{localStorage.setItem('sy-nearby-cache',JSON.stringify({version:2,city:cityLabel,origin:{lat:lat,lng:lng},places:collected,updatedAt:Date.now()}));}catch(e){}
      document.getElementById('place-count').textContent=places.length;renderDiscover(window.__discoverFilter||'all');
      setStatus('已找到'+collected.length+'个附近地点');
    }
    var R=window.__discoverRadii||[2500,8000],near=PoiSource.around(lat,lng,{radii:[R[0]],want:1,limit:60,cap:150}),mid=PoiSource.around(lat,lng,{radii:[R[1]],want:1,limit:90,cap:300});
    add(await near);add(await mid);
    if(collected.length<25)add(await PoiSource.around(lat,lng,{radii:[Math.min(50000,R[1]*3)],want:1,limit:90,cap:300}));
    if(!collected.length){discoverLoadedKey='';setStatus(recent?'已保留上次的附近地点 更新暂时失败':'附近地点暂时无法获取 请检查网络后重试');}
    return collected;
  })();
  window.__nearbyRequest=task;
  try{return await task;}finally{if(window.__nearbyRequest===task)window.__nearbyRequest=null;}
};

/* 7 行程规划 地点读取改用开源数据层 并跳过逐个查介绍 */
enrichPlanningCandidateIntros=async function(){try{persistState();}catch(e){}};
loadPlanningDestinationPlaces=async function(){
  var dest=(planningState.destination||'').trim(),city=dest.replace(/市$/,'');if(!city)return 0;
  var existing=places.filter(function(p){return !p.retired&&String(p.city||'').replace(/市$/,'').indexOf(city)>=0;});
  if(existing.length>=15){planningState.lookupCount=existing.length;planningState.lookupFailed=false;return existing.length;}
  planningState.lookupFailed=false;
  var geo=await PoiSource.geocode(dest);
  if(!geo){planningState.lookupFailed=true;planningState.lookupCount=existing.length;return existing.length;}
  var list=await PoiSource.around(geo.lat,geo.lng,{radii:[6000,15000,35000],want:30,limit:70,cap:300});
  var names=new Set(places.map(function(p){return p.n;})),added=0;
  list.forEach(function(x){if(names.has(x.n))return;names.add(x.n);var tg=x.tags||{};
    var p={n:x.n,c:x.c,lat:x.lat,lng:x.lng,city:dest,province:'',custom:true,qualityScore:x.qualityScore,t:tagIntro(tg)||(dest+' · '+((categories[x.c]||{}).name||'地点'))};
    p.i=places.length;places.push(p);try{addPlaceMarker(p);}catch(e){}added++;});
  planningState.lookupCount=added+existing.length;planningState.lookupFailed=planningState.lookupCount===0;
  return planningState.lookupCount;
};

/* 8 地图标记 只显示精华地点 并保证一定出现 */
window.__discoverFilter='all';
var baseRender=renderDiscover;
renderDiscover=function(filter){window.__discoverFilter=filter||'all';var r=baseRender(filter);try{syncMarkers();}catch(e){window.__markerErr=String(e&&e.message||e);}return r;};
applyVisibility=function(){places.forEach(function(p){var m=markers[p.i];if(m)m.getElement().style.display=isVisible(p)?'':'none';});renderList();};
function safeMarker(p){
  try{addPlaceMarker(p);var m0=markers[p.i];if(m0&&m0.getElement().isConnected)return;}catch(e){window.__markerErr=String(e&&e.message||e);}
  try{
    var el=createPlaceMarkerElement(p),html;try{html=nearbyPopupHtml(p);}catch(x){html='<b>'+p.n+'</b>';}
    var popup=new maplibregl.Popup({maxWidth:'290px'}).setHTML(html),m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lng,p.lat]).setPopup(popup).addTo(map);
    markers[p.i]=m;(layers[p.c]||(layers[p.c]=[])).push(m);
  }catch(x){window.__markerErr2=String(x&&x.message||x);}
}
function syncMarkers(){
  var f=window.__discoverFilter||'all',allowed=f==='all'?null:(typeof discoverCategoryMap!=='undefined'&&discoverCategoryMap[f]||[f]);
  var dyn=places.filter(function(p){return p.dynamic&&!p.retired&&p.city===activeDiscoverCity;});
  var pool=dyn.filter(function(p){return !allowed||allowed.indexOf(p.c)>=0;});
  var quota=allowed?{}:{nature:20,museum:7,history:7,district:5,food:12,leisure:7},keep=new Set(),cnt={};
  pool.slice().sort(function(a,b){return (b.qualityScore||0)-(a.qualityScore||0);}).forEach(function(p){
    var k=p.c;cnt[k]=cnt[k]||0;var q=allowed?40:(quota[k]||6);if(cnt[k]<q&&keep.size<(allowed?40:55)){cnt[k]++;keep.add(p);}});
  var cap=allowed?40:55;
  if(keep.size<cap)pool.slice().sort(function(a,b){return (b.qualityScore||0)-(a.qualityScore||0);}).forEach(function(p){if(keep.size<cap&&!keep.has(p))keep.add(p);});
  dyn.forEach(function(p){
    var m=markers[p.i],has=!!(m&&m.getElement().isConnected);
    if(keep.has(p)){if(!has)safeMarker(p);else m.getElement().style.display='';}
    else if(has){m.remove();}
  });
}
window.syncMarkers=syncMarkers;
map.on('idle',function(){try{if(document.body.dataset.mode==='discover')syncMarkers();}catch(e){}});

/* 9 展开收起箭头保持矢量图标 */
var CHEV={up:'<path d="m18 15-6-6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>'};
function setChev(open){var t=document.getElementById('discover-sheet-toggle');if(!t)return;t.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(open?CHEV.down:CHEV.up)+'</svg>';}
var baseCollapse=collapseDiscoverSheet;
collapseDiscoverSheet=function(){baseCollapse();setChev(false);try{syncMarkers();}catch(e){}};
(function(){var t=document.getElementById('discover-sheet-toggle');if(t)t.addEventListener('click',function(){var open=document.getElementById('discover-sheet').classList.contains('open');setChev(open);if(!open){try{syncMarkers();}catch(e){}}});setChev(false);})();

/* 10 地图拖动后 自动加载新地图中心周围的地点 */
(function(){
  var lastCenter=null,lastZoom=0,timer=0,base=showNearbyForPosition;
  showNearbyForPosition=function(pos){window.__discoverRadii=null;lastCenter=null;return base(pos);};
  function centerWgs(){var c=map.getCenter(),w=(window.MapCoord&&MapCoord.useAmap&&window.AmapKit)?AmapKit.toWgs(c.lng,c.lat):[c.lng,c.lat];return {lng:w[0],lat:w[1]};}
  function onMoved(){
    if(document.body.dataset.mode!=='discover')return;
    var w=centerWgs(),z=map.getZoom(),R=z>=15?[1200,3500]:z>=13.5?[2000,6000]:z>=12?[3000,9000]:[6000,18000];
    var base0=lastCenter||discoverOrigin||userPosition;
    if(base0&&distanceKm(base0,w)<Math.max(0.8,R[0]/1000*.7)&&Math.abs(z-lastZoom)<1.2)return;
    lastCenter=w;lastZoom=z;window.__discoverRadii=R;
    setStatus('正在更新这片区域的地点');
    loadNearbyPlaces(w.lat,w.lng,activeDiscoverCity||'附近');
  }
  map.on('moveend',function(e){if(!e||!e.originalEvent)return;clearTimeout(timer);timer=setTimeout(onMoved,650);});
})();

/* 11 行程规划 生成按钮立即反馈 交通时间核实限时 地点读取更快 */
function busy(text){var el=document.getElementById('busy-toast');if(!el){el=document.createElement('div');el.id='busy-toast';el.className='busy-toast';el.innerHTML='<i></i><span></span>';document.body.appendChild(el);}el.querySelector('span').textContent=text;el.classList.add('show');}
function unbusy(){var el=document.getElementById('busy-toast');if(el)el.classList.remove('show');}
function limit(p,ms,fb){return Promise.race([p,new Promise(function(r){setTimeout(function(){r(fb);},ms);})]);}
[['estimateTravelTime','交通时间暂时无法核实'],['estimateFlightTime',null],['estimateTrainTravelTime','交通时间暂时无法核实']].forEach(function(pair){
  var name=pair[0],fb=pair[1],orig;try{orig=eval(name);}catch(e){return;}
  if(typeof orig!=='function')return;
  var wrapped=async function(){busy('正在核实交通时间');try{return await limit(orig.apply(this,arguments),12000,fb);}finally{unbusy();}};
  try{eval(name+'=wrapped');}catch(e){}
});
showPlanLoading=async function(){
  var sheet=document.getElementById('plan-loading-sheet');
  if(!sheet){sheet=document.createElement('section');sheet.id='plan-loading-sheet';sheet.className='trip-sheet planner-sheet';sheet.innerHTML='<div class="planner-loading"><h3>正在生成你的路线</h3><p>正在读取目标城市的具体地点资料</p><div class="footprints"><i></i><i></i><i></i><i></i></div></div>';document.body.appendChild(sheet);}
  var msg=sheet.querySelector('p');sheet.classList.add('open');planningState.lookupFailed=false;planningState.lookupCount=0;
  var t0=Date.now(),timer=setInterval(function(){var s=(Date.now()-t0)/1000;if(msg)msg.textContent=s<5?'正在读取目标城市的具体地点资料':s<12?'正在筛选值得去的地点':'正在整理路线顺序';},1200);
  try{await limit(loadPlanningDestinationPlaces().catch(function(){return 0;}),25000,0);}finally{clearInterval(timer);}
  var available=plannerDestinationPlaces();sheet.classList.remove('open');
  if(!available.length){var info=window.__amapError?'（高德：'+window.__amapError+'）':'';alert('暂时没有读取到「'+planningState.destination+'」的具体地点'+info+' 请检查网络后重试');return;}
  var plan=buildPlan();
  if(!plan.length||!plan.some(function(d){return d.events&&d.events.length;})){alert('当前城市暂时没有足够的具体地点可用于规划 请更换城市或稍后重试');return;}
  showPlanPreview(plan);
};
loadPlanningDestinationPlaces=async function(){
  var dest=(planningState.destination||'').trim(),city=dest.replace(/市$/,'');if(!city)return 0;
  var existing=places.filter(function(p){return !p.retired&&!p.dynamic&&String(p.city||'').replace(/市$/,'').indexOf(city)>=0;});
  if(existing.length>=15){planningState.lookupCount=existing.length;planningState.lookupFailed=false;return existing.length;}
  var geo=await PoiSource.geocode(dest);
  if(!geo){planningState.lookupFailed=true;planningState.lookupCount=existing.length;return existing.length;}
  var list=await PoiSource.around(geo.lat,geo.lng,{radii:[7000,18000,40000],want:24,limit:70,cap:300});
  var names=new Set(places.filter(function(p){return !p.retired;}).map(function(p){return p.n;})),added=0;
  list.forEach(function(x){if(names.has(x.n))return;names.add(x.n);var tg=x.tags||{};
    var p={n:x.n,c:x.c,lat:x.lat,lng:x.lng,city:dest,province:tg['addr:province']||'',district:tg['addr:district']||'',districtVerified:Boolean(tg['addr:district']),custom:true,qualityScore:x.qualityScore,t:tagIntro(tg)||(dest+' · '+((categories[x.c]||{}).name||'地点'))};
    p.i=places.length;places.push(p);try{addPlaceMarker(p);}catch(e){}added++;});
  planningState.lookupCount=added+existing.length;planningState.lookupFailed=planningState.lookupCount===0;
  return planningState.lookupCount;
};

/* 12 添加行程 输入联想 全局搜索 不再使用发现页推荐地点 */
var baseSuggestPlaces=searchPlaceSuggestions;
searchPlaceSuggestions=function(){
  var input=document.getElementById('new-name'),list=document.getElementById('place-suggestion-list');
  if(!input||!list)return;
  if(!(window.AmapKit&&AmapKit.usable()))return baseSuggestPlaces();
  clearTimeout(suggestionTimer);
  if(input.value.trim().length<1){list.classList.remove('open');list.innerHTML='';return;}
  suggestionTimer=setTimeout(async function(){
    var q=input.value.trim(),city=(document.getElementById('new-city')||{}).value||detectedCity||'';
    try{
      var tips=await AmapKit.suggest(q,city);if(input.value.trim()!==q)return;
      var items=AmapKit.rank(q,tips).slice(0,8);
      if(!items.length){list.classList.remove('open');list.innerHTML='';return;}
      var esc=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');};
      list.innerHTML=items.map(function(t,i){return '<button type="button" class="place-suggestion-item" data-suggestion-i="'+i+'">'+esc(t.name)+'<small>'+esc(t.district)+esc(Array.isArray(t.address)?'':t.address)+'</small></button>';}).join('');
      list.classList.add('open');
      list.querySelectorAll('[data-suggestion-i]').forEach(function(b){b.onclick=function(){var t=items[+b.dataset.suggestionI];AmapKit.remember(t);input.value=t.name;list.classList.remove('open');};});
    }catch(e){baseSuggestPlaces();}
  },220);
};
