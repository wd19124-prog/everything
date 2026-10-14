/* discover-fast.js 发现身边 提速与全球化 */
(function(){
'use strict';
var LAST='sy-last-position',lastRefresh=0;
function readSaved(){try{var s=JSON.parse(localStorage.getItem(LAST)||'null');return s&&Number.isFinite(s.lat)&&Number.isFinite(s.lng)?s:null;}catch(e){return null;}}
function skeleton(){var el=document.getElementById('discover-list');if(!el)return;var r='<div class="skeleton-row"><i></i><div style="flex:1"><b></b><b></b></div></div>';el.innerHTML=r+r+r+r;}

/* 1 附近查询 收窄条件 先近后远 三个镜像竞速 */
fetchNearbyStage=async function(lat,lng,radius){
  var a='(around:'+radius+','+lat+','+lng+')',key='[~"^(website|wikidata|wikipedia|brand|official_name|operator|opening_hours)$"~"."]';
  var q='[out:json][timeout:10];('
   +'nwr'+a+'[tourism~"^(attraction|museum|gallery|zoo|theme_park|aquarium|viewpoint)$"][name];'
   +'nwr'+a+'[historic][name]'+key+';'
   +'nwr'+a+'[amenity~"^(restaurant|cafe|food_court)$"][name]'+key+';'
   +'nwr'+a+'[amenity~"^(theatre|arts_centre)$"][name];'
   +'nwr'+a+'[leisure~"^(park|nature_reserve|water_park|spa)$"][name];'
   +');out center tags 120;';
  var hosts=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
  var ctrls=hosts.map(function(){return new AbortController();});
  var reqs=hosts.map(function(h,i){var timer=setTimeout(function(){ctrls[i].abort();},6500);
    return fetch(h+'?data='+encodeURIComponent(q),{signal:ctrls[i].signal}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}).finally(function(){clearTimeout(timer);});});
  var data=await TripAppCore.firstSuccessful(reqs,function(v){return Array.isArray(v&&v.elements)&&v.elements.length>0;});
  ctrls.forEach(function(c){c.abort();});
  return (data&&data.elements)||[];
};

/* 2 不再批量联网查介绍 先用标签信息即时展示 */
enrichNearbyPlaces=async function(){};
nearbyDisplayIntro=function(p){var t=String(p.t||'').trim();if(t&&!isNearbyTemplate(t))return t;var cat=discoverCategoryName(discoverCategory(p)),reg=(p.district&&p.districtVerified)?p.district:'';return cat+(reg?' · '+reg:'');};
fetchPlaceIntro=async function(name){
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
/* 4 底图失败自动切换备用瓦片 */
var failures=0,switched=false;
map.on('error',function(e){
  if(switched||!e||!e.sourceId||e.sourceId!=='base')return;
  if(++failures>=4){switched=true;try{map.getSource('base').setTiles(['https://tile.openstreetmap.org/{z}/{x}/{y}.png']);}catch(x){}}
});
})();
