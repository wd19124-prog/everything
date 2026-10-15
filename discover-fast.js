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
  var key=lat.toFixed(2)+','+lng.toFixed(2),recent=nearbyCacheForPosition({lat:lat,lng:lng});
  if(discoverLoadedKey===key&&window.__nearbyRequest)return window.__nearbyRequest;
  if(discoverLoadedKey===key&&recent&&recent.updatedAt&&Date.now()-recent.updatedAt<6*36e5&&(recent.places||[]).length>=20)return recent.places;
  discoverLoadedKey=key;discoverOrigin={lat:lat,lng:lng};
  var task=(async function(){
    setStatus('正在查找附近地点');
    var known=new Set(places.filter(function(p){return !p.dynamic&&!p.retired;}).map(function(p){return p.n;})),collected=[],replaced=false;
    function add(list){
      if(!list||!list.length)return;
      if(!replaced){retireDynamicPlaces();replaced=true;}
      list.forEach(function(x){if(known.has(x.n))return;known.add(x.n);var tg=x.tags||{};
        var p={n:x.n,c:x.c,lat:x.lat,lng:x.lng,city:cityLabel,province:tg['addr:province']||'',district:tg['addr:district']||'',districtVerified:Boolean(tg['addr:district']),source:'公开地图资料',t:tagIntro(tg),dynamic:true,qualityScore:x.qualityScore};
        p.i=places.length;places.push(p);collected.push(p);try{addPlaceMarker(p);}catch(e){}});
      activeDiscoverCity=cityLabel;
      try{localStorage.setItem('sy-nearby-cache',JSON.stringify({version:2,city:cityLabel,origin:{lat:lat,lng:lng},places:collected,updatedAt:Date.now()}));}catch(e){}
      document.getElementById('place-count').textContent=places.length;renderDiscover('all');
      setStatus('已找到'+collected.length+'个附近地点');
    }
    var near=PoiSource.around(lat,lng,{radii:[2500],want:1,limit:60,cap:150}),mid=PoiSource.around(lat,lng,{radii:[8000],want:1,limit:90,cap:300});
    add(await near);add(await mid);
    if(collected.length<25)add(await PoiSource.around(lat,lng,{radii:[25000],want:1,limit:90,cap:300}));
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
